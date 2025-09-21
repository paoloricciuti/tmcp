/**
 * @import { AuthInfo, McpServer } from "tmcp";
 * @import { OAuth  } from "@tmcp/auth";
 * @import { SessionManager  } from "@tmcp/session-manager";
 */

/**
 * @typedef {{
 * 	origin?: string | string[] | boolean
 * 	methods?: string[]
 * 	allowedHeaders?: string[]
 * 	exposedHeaders?: string[]
 * 	credentials?: boolean
 * 	maxAge?: number
 * }} CorsConfig
 */

/**
 * @typedef {{
 * 	getSessionId?: () => string
 * 	path?: string
 * 	oauth?: OAuth<"built">
 * 	cors?: CorsConfig | boolean,
 * 	sessionManager?: SessionManager
 * }} HttpTransportOptions
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { InMemorySessionManager } from '@tmcp/session-manager';

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class HttpTransport {
	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {Required<Omit<HttpTransportOptions, 'oauth' | 'cors'>> & { cors?: CorsConfig | boolean }}
	 */
	#options;

	/**
	 * @type {string}
	 */
	#path;

	/**
	 * @type {AsyncLocalStorage<ReadableStreamDefaultController | undefined>}
	 */
	#controller_storage = new AsyncLocalStorage();

	/**
	 * @type {OAuth<"built"> | undefined}
	 */
	#oauth;

	#text_encoder = new TextEncoder();

	/**
	 *
	 * @param {McpServer<any, TCustom>} server
	 * @param {HttpTransportOptions} [options]
	 */
	constructor(server, options) {
		this.#server = server;
		const {
			getSessionId = () => crypto.randomUUID(),
			path = '/mcp',
			oauth,
			cors,
			sessionManager = new InMemorySessionManager(),
		} = options ?? {
			getSessionId: () => crypto.randomUUID(),
		};

		if (oauth) {
			this.#oauth = oauth;
		}

		this.#options = { getSessionId, path, cors, sessionManager };
		this.#path = path;
		this.#server.on('send', async ({ request, context: { sessions } }) => {
			// use the current controller if the request has an id (it means it's a request and not a notification)
			if (request.id != null) {
				const controller = this.#controller_storage.getStore();
				if (!controller) return;

				controller.enqueue(
					this.#text_encoder.encode(
						'data: ' + JSON.stringify(request) + '\n\n',
					),
				);
				return;
			}
			await this.#options.sessionManager.send(
				sessions,
				'data: ' + JSON.stringify(request) + '\n\n',
			);
		});
	}

	/**
	 * Applies CORS headers to a response based on the configuration
	 * @param {Response} response - The response to modify
	 * @param {Request} request - The original request
	 */
	#apply_cors_headers(response, request) {
		const cors_config = this.#options.cors;
		if (!cors_config) {
			return;
		}

		// Handle boolean true (allow all origins)
		if (cors_config === true) {
			response.headers.set('Access-Control-Allow-Origin', '*');
			response.headers.set(
				'Access-Control-Allow-Methods',
				'GET, POST, DELETE, OPTIONS',
			);
			response.headers.set('Access-Control-Allow-Headers', '*');
			return;
		}

		// Handle detailed configuration
		const config = /** @type {CorsConfig} */ (cors_config);
		const origin = request.headers.get('origin');

		// Handle origin
		if (config.origin !== undefined) {
			if (config.origin === true || config.origin === '*') {
				response.headers.set('Access-Control-Allow-Origin', '*');
			} else if (typeof config.origin === 'string') {
				if (origin === config.origin) {
					response.headers.set(
						'Access-Control-Allow-Origin',
						config.origin,
					);
				}
			} else if (Array.isArray(config.origin)) {
				if (origin && config.origin.includes(origin)) {
					response.headers.set('Access-Control-Allow-Origin', origin);
				}
			}
		}

		// Handle other CORS headers with defaults
		const methods = config.methods ?? ['GET', 'POST', 'DELETE', 'OPTIONS'];
		response.headers.set(
			'Access-Control-Allow-Methods',
			methods.join(', '),
		);

		const allowed_headers = config.allowedHeaders ?? '*';
		if (Array.isArray(allowed_headers)) {
			response.headers.set(
				'Access-Control-Allow-Headers',
				allowed_headers.join(', '),
			);
		} else {
			response.headers.set(
				'Access-Control-Allow-Headers',
				allowed_headers,
			);
		}

		if (config.exposedHeaders) {
			response.headers.set(
				'Access-Control-Expose-Headers',
				config.exposedHeaders.join(', '),
			);
		}

		if (config.credentials) {
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}

		if (config.maxAge !== undefined) {
			response.headers.set(
				'Access-Control-Max-Age',
				config.maxAge.toString(),
			);
		}
	}

	/**
	 * @param {string} session_id
	 */
	async #handle_delete(session_id) {
		await this.#options.sessionManager.delete(session_id);
		return new Response(null, {
			status: 200,
			headers: {
				'mcp-session-id': session_id,
			},
		});
	}

	/**
	 *
	 * @param {string} session_id
	 * @returns
	 */
	async #handle_get(session_id) {
		const sessions = this.#options.sessionManager;
		// If session already exists, return error
		const existing_session = await sessions.has(session_id);
		if (existing_session) {
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32000,
						message:
							'Conflict: Only one SSE stream is allowed per session',
					},
					id: null,
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
					status: 409,
				},
			);
		}

		// Create new long-lived stream for notifications
		const stream = new ReadableStream({
			async start(controller) {
				await sessions.create(session_id, controller);
			},
			async cancel() {
				await sessions.delete(session_id);
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'mcp-session-id': session_id,
			},
			status: 200,
		});
	}

	/**
	 *
	 * @param {string} session_id
	 * @param {Request} request
	 * @param {AuthInfo | null} auth_info
	 * @param {TCustom} [ctx]
	 */
	async #handle_post(session_id, request, auth_info, ctx) {
		// Check Content-Type header
		const content_type = request.headers.get('content-type');
		if (!content_type || !content_type.includes('application/json')) {
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32600,
						message: 'Invalid Request',
						data: 'Content-Type must be application/json',
					},
				}),
				{
					status: 415,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				},
			);
		}

		try {
			const body = await request.clone().json();

			/**
			 * @type {ReadableStreamDefaultController | undefined}
			 */
			let controller;

			// Create a short-lived stream that closes after sending the response
			const stream = new ReadableStream({
				start(_controller) {
					controller = _controller;
				},
			});

			const handle = async () => {
				const response = await this.#controller_storage.run(
					controller,
					() =>
						this.#server.receive(body, {
							sessionId: session_id,
							auth: auth_info ?? undefined,
							custom: ctx,
						}),
				);

				controller?.enqueue(
					this.#text_encoder.encode(
						'data: ' + JSON.stringify(response) + '\n\n',
					),
				);
				controller?.close();
			};

			handle();

			const messages = Array.isArray(body) ? body : [body];

			// Determine status code based on response type
			// 202 Accepted for notifications/responses, 200 OK for standard requests
			const status = !messages.some((message) => message.id != null)
				? 202
				: 200;

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'mcp-session-id': session_id,
				},
				status,
			});
		} catch (error) {
			// Handle JSON parsing errors
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32700,
						message: 'Parse error',
						data: /** @type {Error} */ (error).message,
					},
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				},
			);
		}
	}

	/**
	 *
	 * @param {string} method
	 * @returns
	 */
	#handle_default(method) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32601,
					message: 'Method not found',
					data: `HTTP method ${method} not supported`,
				},
			}),
			{
				status: 405,
				headers: {
					'Content-Type': 'application/json',
					Allow: 'GET, POST, DELETE, OPTIONS',
				},
			},
		);
	}

	/**
	 *
	 * @param {Request} request
	 * @param {TCustom} [ctx]
	 * @returns {Promise<Response | null>}
	 */
	async respond(request, ctx) {
		const url = new URL(request.url);

		/**
		 * @type {AuthInfo | null}
		 */
		let auth_info = null;

		// Check if OAuth helper should handle this request
		if (this.#oauth) {
			try {
				const response = await this.#oauth.respond(request);
				if (response) {
					return response;
				}
			} catch (error) {
				return new Response(
					JSON.stringify({
						error: 'server_error',
						error_description: /** @type {Error} */ (error).message,
					}),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}
			auth_info = await this.#oauth.verify(request);
		}

		// Check if the request path matches the configured MCP path
		if (url.pathname !== this.#path) {
			return null;
		}

		const method = request.method;
		const session_id =
			request.headers.get('mcp-session-id') ||
			this.#options.getSessionId();

		/**
		 * @type {Response | null}
		 */
		let response = null;

		// Handle OPTIONS request - preflight CORS
		if (method === 'OPTIONS') {
			response = new Response(null, {
				status: 204,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
		// Handle DELETE request - disconnect session
		else if (method === 'DELETE') {
			response = await this.#handle_delete(session_id);
		}
		// Handle GET request - establish long-lived connection for notifications
		else if (method === 'GET') {
			response = await this.#handle_get(session_id);
		}
		// Handle POST request - process message and respond through event stream
		else if (method === 'POST') {
			response = await this.#handle_post(
				session_id,
				request,
				auth_info,
				ctx,
			);
		}
		// Method not supported
		else {
			response = this.#handle_default(method);
		}

		// Apply CORS headers if we have a response
		if (response) {
			this.#apply_cors_headers(response, request);
		}

		return response;
	}
}
