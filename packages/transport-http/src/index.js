/**
 * @import { AuthInfo, McpServer } from "tmcp";
 * @import { OAuth  } from "@tmcp/auth";
 * @import { StreamSessionManager, InfoSessionManager } from "@tmcp/session-manager";
 * @import { OptionalizeSessionManager } from "./type-utils.js"
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
 * 	path?: string | null
 * 	oauth?: OAuth<"built">
 * 	cors?: CorsConfig | boolean,
 * 	sessionManager?: { streams?: StreamSessionManager, info?: OptionalizeSessionManager<InfoSessionManager> }
 * }} HttpTransportOptions
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
	InMemoryStreamSessionManager,
	InMemoryInfoSessionManager,
} from '@tmcp/session-manager';
import { DEV } from 'esm-env';

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class HttpTransport {
	/**
	 * @typedef {NonNullable<Required<Pick<HttpTransportOptions, "sessionManager">["sessionManager"]>>} SessionManager
	 */

	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {Required<Omit<HttpTransportOptions, 'oauth' | 'cors' | 'sessionManager'>> & { cors?: CorsConfig | boolean, sessionManager: SessionManager }}
	 */
	#options;

	/**
	 * @type {string | null}
	 */
	#path;

	/**
	 * @type {AsyncLocalStorage<ReadableStreamDefaultController | undefined>}
	 */
	#controller_storage = new AsyncLocalStorage();

	/**
	 * @type {AsyncLocalStorage<string>}
	 */
	#session_id_storage = new AsyncLocalStorage();

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
			sessionManager: _sessionManager = {
				streams: new InMemoryStreamSessionManager(),
				info: new InMemoryInfoSessionManager(),
			},
		} = options ?? {
			getSessionId: () => crypto.randomUUID(),
		};

		/**
		 * @type {SessionManager}
		 */
		const sessionManager = {
			streams:
				_sessionManager.streams ?? new InMemoryStreamSessionManager(),
			info: _sessionManager.info ?? new InMemoryInfoSessionManager(),
		};

		if (options?.path === undefined && DEV) {
			// TODO: remove on 1.0.0 release
			console.warn(
				"[tmcp][transport-http] `options.path` is undefined, in future versions passing `undefined` will default to respond on all paths. To keep the current behavior, explicitly set `path` to '/mcp' or your desired path.",
			);
		}

		if (oauth) {
			this.#oauth = oauth;
		}

		this.#options = { getSessionId, path, cors, sessionManager };
		this.#path = path;

		this.#server.on('initialize', ({ capabilities, clientInfo }) => {
			const sessionId = this.#session_id_storage.getStore();
			if (!sessionId) return;
			this.#options.sessionManager.info.setClientCapabilities(
				sessionId,
				capabilities,
			);
			this.#options.sessionManager.info.setClientInfo(
				sessionId,
				clientInfo,
			);
		});

		this.#server.on('subscription', async ({ uri, action }) => {
			const sessionId = this.#session_id_storage.getStore();
			if (!sessionId) return;
			if (action === 'remove') {
				this.#options.sessionManager.info.removeSubscription?.(
					sessionId,
					uri,
				);
			} else {
				this.#options.sessionManager.info.addSubscription(
					sessionId,
					uri,
				);
			}
		});

		this.#server.on('loglevelchange', ({ level }) => {
			const sessionId = this.#session_id_storage.getStore();
			if (!sessionId) return;
			this.#options.sessionManager.info.setLogLevel(sessionId, level);
		});

		this.#server.on('broadcast', async ({ request }) => {
			let sessions = undefined;
			if (request.method === 'notifications/resources/updated') {
				sessions =
					await this.#options.sessionManager.info.getSubscriptions(
						request.params.uri,
					);
			}
			await this.#options.sessionManager.streams.send(
				sessions,
				'event: message\ndata: ' + JSON.stringify(request) + '\n\n',
			);
		});

		this.#server.on('send', async ({ request }) => {
			// use the current controller if the request has an id (it means it's a request and not a notification)
			const controller = this.#controller_storage.getStore();
			if (!controller) return;

			controller.enqueue(
				this.#text_encoder.encode(
					'event: message\ndata: ' + JSON.stringify(request) + '\n\n',
				),
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
		await this.#options.sessionManager.streams.delete(session_id);
		await this.#options.sessionManager.info.delete(session_id);
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
		const text_encoder = this.#text_encoder;
		// If session already exists, return error
		const existing_session = await sessions.streams.has(session_id);
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
				await sessions.streams.create(session_id, controller);
				// send a comment to flush the headers immediately
				controller.enqueue(text_encoder.encode(': connected\n\n'));
			},
			async cancel() {
				await sessions.streams.delete(session_id);
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

			const session_id_storage = this.#session_id_storage;

			const handle = async () => {
				const client_capabilities =
					await this.#options.sessionManager.info
						.getClientCapabilities(session_id)
						.catch(() => undefined);
				const client_info = await this.#options.sessionManager.info
					.getClientInfo(session_id)
					.catch(() => undefined);
				const log_level = await this.#options.sessionManager.info
					.getLogLevel(session_id)
					.catch(() => undefined);

				const response = await this.#controller_storage.run(
					controller,
					() =>
						session_id_storage.run(session_id, () =>
							this.#server.receive(body, {
								sessionId: session_id,
								auth: auth_info ?? undefined,
								sessionInfo: {
									clientCapabilities: client_capabilities,
									clientInfo: client_info,
									logLevel: log_level,
								},
								custom: ctx,
							}),
						),
				);

				controller?.enqueue(
					this.#text_encoder.encode(
						'event: message\ndata: ' +
							JSON.stringify(response) +
							'\n\n',
					),
				);
				controller?.close();
			};

			handle();

			const messages = Array.isArray(body) ? body : [body];

			const has_request = messages.some((message) => message.id != null);

			// Determine status code based on response type
			// 202 Accepted for notifications/responses, 200 OK for standard requests
			const status = !has_request ? 202 : 200;

			return new Response(has_request ? stream : null, {
				headers: has_request
					? {
							'Content-Type': 'text/event-stream',
							'Cache-Control': 'no-cache',
							connection: 'keep-alive',
							'mcp-session-id': session_id,
						}
					: undefined,
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
		if (url.pathname !== this.#path && this.#path !== null) {
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
