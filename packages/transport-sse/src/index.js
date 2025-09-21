/**
 * @import { AuthInfo, McpServer } from "tmcp";
 * @import { OAuth } from "@tmcp/auth";
 * @import { SessionManager } from "@tmcp/session-manager";
 */

import { InMemorySessionManager } from '@tmcp/session-manager';

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
 * 	endpoint?: string
 * 	oauth?: OAuth<"built">
 * 	cors?: CorsConfig | boolean
 *  sessionManager?: SessionManager
 * }} SseTransportOptions
 */

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class SseTransport {
	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {Required<Omit<SseTransportOptions, 'oauth' | 'cors'>> & { cors?: CorsConfig | boolean }}
	 */
	#options;

	/**
	 * @type {string}
	 */
	#path;

	/**
	 * @type {string}
	 */
	#endpoint;

	/**
	 * @type {OAuth<"built"> | undefined}
	 */
	#oauth;

	#text_encoder = new TextEncoder();

	/**
	 * @param {McpServer<any, TCustom>} server
	 * @param {SseTransportOptions} [options]
	 */
	constructor(server, options) {
		this.#server = server;
		const {
			getSessionId = () => crypto.randomUUID(),
			path = '/sse',
			endpoint = '/message',
			oauth,
			cors,
			sessionManager = new InMemorySessionManager(),
		} = options ?? {
			getSessionId: () => crypto.randomUUID(),
			path: '/sse',
			endpoint: '/message',
		};
		if (oauth) {
			this.#oauth = oauth;
		}
		this.#options = {
			getSessionId,
			path,
			endpoint,
			cors,
			sessionManager,
		};
		this.#path = this.#options.path;
		this.#endpoint = this.#options.endpoint;

		// Listen for server send events
		this.#server.on('send', async ({ request, context: { sessions } }) => {
			await this.#options.sessionManager.send(
				sessions,
				`data: ${JSON.stringify(request)}\n\n`,
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
	async #handle_get(session_id) {
		// If session already exists, close it first
		const existing_controller =
			await this.#options.sessionManager.has(session_id);
		if (existing_controller) {
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

		// Create new SSE stream
		const stream = new ReadableStream({
			start: async (controller) => {
				await this.#options.sessionManager.create(
					session_id,
					controller,
				);

				// Send initial endpoint event with session info
				const endpoint_url = new URL(
					this.#endpoint,
					'http://localhost',
				);
				endpoint_url.searchParams.set('session_id', session_id);

				const endpoint_event = `event: endpoint\ndata: ${endpoint_url.pathname + endpoint_url.search + endpoint_url.hash}\n\n`;

				controller.enqueue(this.#text_encoder.encode(endpoint_event));
			},
			cancel: async () => {
				await this.#options.sessionManager.delete(session_id);
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
			const response = await this.#server.receive(body, {
				sessionId: session_id,
				auth: auth_info ?? undefined,
				custom: ctx,
			});

			const controller =
				await this.#options.sessionManager.has(session_id);

			if (!controller) {
				return new Response('SSE connection not established', {
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				});
			}

			if (response != null) {
				await this.#options.sessionManager.send(
					[session_id],
					`data: ${JSON.stringify(response)}\n\n`,
				);
			}

			// Return JSON response for requests
			return new Response(null, {
				status: 202,
				headers: {
					'Content-Type': 'application/json',
					'mcp-session-id': session_id,
				},
			});
		} catch (error) {
			// Handle JSON parsing errors
			return new Response(`${error}`, {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'mcp-session-id': session_id,
				},
			});
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
	 * @param {string} method
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

		// Check if the request path matches the configured SSE path
		if (
			request.method === 'GET'
				? url.pathname !== this.#path
				: url.pathname !== this.#endpoint
		) {
			return null;
		}

		const method = request.method;
		const session_id =
			url.searchParams.get('session_id') ||
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
		// Handle GET request - establish SSE connection
		else if (method === 'GET') {
			response = await this.#handle_get(session_id);
		}
		// Handle POST request - process message
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

	/**
	 * Close all active sessions
	 */
	close() {}
}
