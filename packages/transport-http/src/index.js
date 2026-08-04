/**
 * @import { AuthInfo, McpServer } from "tmcp";
 * @import { OAuth  } from "@tmcp/auth";
 * @import { StreamSessionManager, InfoSessionManager, SubscriptionManager } from "@tmcp/session-manager";
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
 * 	allowedOrigins?: string | string[] | true
 * 	sessionManager?: { streams?: StreamSessionManager, info?: OptionalizeSessionManager<InfoSessionManager> }
 * 	subscriptionManager?: SubscriptionManager
 * 	disableSse?: boolean
 * }} HttpTransportOptions
 */

/**
 * @typedef {{ promise: Promise<boolean>, resolve: (registered: boolean) => void }} SubscriptionRegistration
 * @typedef {{ controller?: ReadableStreamDefaultController, state: 'open' | 'cancelled' | 'disconnected', subscription?: { id: string | number, registration: SubscriptionRegistration } }} SubscriptionSink
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
	InMemoryStreamSessionManager,
	InMemoryInfoSessionManager,
	InMemorySubscriptionManager,
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
	 * @type {Required<Omit<HttpTransportOptions, 'oauth' | 'cors' | 'allowedOrigins' | 'sessionManager' | 'subscriptionManager' | 'disableSse'>> & { cors?: CorsConfig | boolean, allowedOrigins?: string | string[] | true, sessionManager: SessionManager, disableSse?: boolean }}
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

	/** @type {SubscriptionManager} */
	#subscription_manager;

	/** @type {Map<string, Map<string | number, SubscriptionSink>>} */
	#subscription_sinks = new Map();
	/** @type {WeakMap<Response, { id: string | number, origin: string }>} */
	#subscription_responses = new WeakMap();
	#warned_implicit_origin = false;

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
			allowedOrigins,
			disableSse,
			subscriptionManager: _subscriptionManager,
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
		const subscriptionManager = /** @type {SubscriptionManager} */ (
			_subscriptionManager ?? new InMemorySubscriptionManager()
		);

		if (options?.path === undefined && DEV) {
			// TODO: remove on 1.0.0 release
			console.warn(
				"[tmcp][transport-http] `options.path` is undefined, in future versions passing `undefined` will default to respond on all paths. To keep the current behavior, explicitly set `path` to '/mcp' or your desired path.",
			);
		}

		if (oauth) {
			this.#oauth = oauth;
		}

		this.#options = {
			getSessionId,
			path,
			cors,
			allowedOrigins,
			sessionManager,
			disableSse,
		};
		this.#path = path;
		this.#subscription_manager = subscriptionManager;

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

		this.#server.on(
			'broadcast',
			async ({ request, subscriptionOnly: subscription_only }) => {
				this.#subscription_manager.send(request);
				if (subscription_only) return;
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
			},
		);

		this.#server.on(
			'send',
			({ request, subscriptionId, subscriptionOrigin }) => {
				if (
					subscriptionId !== undefined &&
					subscriptionOrigin !== undefined
				) {
					const sink = this.#subscription_sinks
						.get(subscriptionOrigin)
						?.get(subscriptionId);
					if (!sink) return;
					if (
						request.method ===
						'notifications/subscriptions/acknowledged'
					) {
						sink.subscription?.registration.resolve(true);
					}
					if (sink.state !== 'open' || !sink.controller) return;
					try {
						sink.controller.enqueue(
							this.#text_encoder.encode(
								'event: message\ndata: ' +
									JSON.stringify(request) +
									'\n\n',
							),
						);
					} catch {
						sink.state = 'disconnected';
						void this.#subscription_manager.close(
							subscriptionId,
							subscriptionOrigin,
							'cancelled',
						);
					}
					return;
				}
				// use the current controller if the request has an id (it means it's a request and not a notification)
				const controller = this.#controller_storage.getStore();
				if (!controller) return;

				try {
					controller.enqueue(
						this.#text_encoder.encode(
							'event: message\ndata: ' +
								JSON.stringify(request) +
								'\n\n',
						),
					);
				} catch {
					// The response stream may have closed before background work sent.
				}
			},
		);
	}

	/**
	 * @param {string} origin
	 * @param {string | number} id
	 * @param {SubscriptionSink} sink
	 * @returns {boolean}
	 */
	#register_subscription_sink(origin, id, sink) {
		let sinks = this.#subscription_sinks.get(origin);
		if (!sinks) {
			sinks = new Map();
			this.#subscription_sinks.set(origin, sinks);
		}
		if (sinks.has(id)) return false;
		sinks.set(id, sink);
		return true;
	}

	/**
	 * @param {string} origin
	 * @param {string | number} id
	 * @param {SubscriptionSink} sink
	 */
	#delete_subscription_sink(origin, id, sink) {
		const sinks = this.#subscription_sinks.get(origin);
		if (sinks?.get(id) !== sink) return;
		sinks.delete(id);
		if (sinks.size === 0) this.#subscription_sinks.delete(origin);
	}

	/**
	 * Cancel a routed subscription after its manager registration attempt has
	 * completed. This closes a listen that races cancellation without allowing
	 * a duplicate POST to affect the original sink.
	 * @param {string | number} id
	 * @param {string} origin
	 */
	async #cancel_subscription(id, origin) {
		const sink = this.#subscription_sinks.get(origin)?.get(id);
		if (!sink) return false;
		sink.state = 'cancelled';
		const registered = await sink.subscription?.registration.promise;
		if (!registered) return false;
		this.#delete_subscription_sink(origin, id, sink);
		return this.#subscription_manager.close(id, origin, 'cancelled');
	}

	/** @param {SubscriptionSink} sink */
	#manager_for_sink(sink) {
		return /** @type {SubscriptionManager} */ ({
			create: (subscription, callbacks) => {
				if (
					this.#subscription_sinks
						.get(subscription.origin)
						?.get(subscription.id) !== sink
				) {
					return false;
				}
				return this.#subscription_manager.create(subscription, {
					...callbacks,
					close: (reason) => {
						if (
							reason === 'cancelled' &&
							sink.state !== 'disconnected'
						) {
							sink.state = 'cancelled';
						}
						return callbacks.close(reason);
					},
				});
			},
			send: (notification) =>
				this.#subscription_manager.send(notification),
			close: (id, origin, reason) =>
				this.#subscription_manager.close(id, origin, reason),
			closeAll: (origin, reason) =>
				this.#subscription_manager.closeAll(origin, reason),
		});
	}

	/** @param {Request} request */
	#allows_origin(request) {
		const origin = request.headers.get('origin');
		if (!origin) return true;
		if (origin === new URL(request.url).origin) return true;
		const allowed = this.#options.allowedOrigins;
		if (allowed === undefined) {
			if (!this.#warned_implicit_origin) {
				console.warn(
					'[tmcp][transport-http] Cross-origin requests are allowed because `allowedOrigins` is not configured. Set it to an explicit origin list, `[]` to reject all cross-origin requests, or `true` to explicitly allow every origin.',
				);
				this.#warned_implicit_origin = true;
			}
			return true;
		}
		if (allowed === true) return true;
		if (typeof allowed === 'string') return allowed === origin;
		return Array.isArray(allowed) && allowed.includes(origin);
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
		await this.#subscription_manager.closeAll(session_id, 'cancelled');
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
	 * @param {string} session_id
	 * @param {string} data
	 * @param {string | number | null} [id]
	 */
	#invalid_request(session_id, data, id = null) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				id,
				error: { code: -32600, message: 'Invalid Request', data },
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

	/**
	 *
	 * @param {string} session_id
	 * @returns
	 */
	async #handle_get(session_id) {
		if (this.#options.disableSse) {
			return new Response(null, {
				status: 405,
				headers: {
					Allow: 'POST, DELETE, OPTIONS',
				},
			});
		}

		const sessions = this.#options.sessionManager;
		const text_encoder = this.#text_encoder;
		// If session already exists, return error
		const existing_session = await sessions.streams.has(session_id);
		if (existing_session) {
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					id: null,
					error: {
						code: -32000,
						message:
							'Conflict: Only one SSE stream is allowed per session',
					},
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
					id: null,
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
			if (
				Array.isArray(body) ||
				typeof body !== 'object' ||
				body === null
			) {
				return this.#invalid_request(
					session_id,
					Array.isArray(body)
						? 'JSON-RPC batch requests are not supported'
						: 'Expected a JSON-RPC message object',
				);
			}
			const valid_id =
				typeof body.id === 'string' || typeof body.id === 'number';
			const request_message =
				body.jsonrpc === '2.0' &&
				typeof body.method === 'string' &&
				(body.id === undefined || valid_id);
			const has_result = Object.hasOwn(body, 'result');
			const has_error = Object.hasOwn(body, 'error');
			const response_message =
				body.jsonrpc === '2.0' && valid_id && has_result !== has_error;
			if (!request_message && !response_message) {
				return this.#invalid_request(
					session_id,
					'Expected a valid JSON-RPC request, notification, or response',
					valid_id ? body.id : null,
				);
			}
			const messages = [body];
			const subscription_id =
				body.method === 'subscriptions/listen' && valid_id
					? /** @type {string | number} */ (body.id)
					: undefined;
			const subscription_origin =
				subscription_id === undefined
					? session_id
					: crypto.randomUUID();
			/** @type {{ id: string | number, registration: SubscriptionRegistration } | undefined} */
			let subscription;
			if (subscription_id !== undefined) {
				/** @type {(registered: boolean) => void} */
				let resolve = () => {};
				/** @type {Promise<boolean>} */
				const promise = new Promise((ready) => {
					resolve = ready;
				});
				subscription = {
					id: subscription_id,
					registration: { promise, resolve },
				};
			}
			/** @type {SubscriptionSink} */
			const sink = {
				/** @type {ReadableStreamDefaultController | undefined} */
				controller: undefined,
				state: 'open',
				subscription,
			};
			const manager = this.#subscription_manager;
			const server_subscription_manager = this.#manager_for_sink(sink);
			const register_sink = this.#register_subscription_sink.bind(this);
			const delete_sink = this.#delete_subscription_sink.bind(this);
			const release_sink = () => {
				const current = sink.subscription;
				if (!current) return;
				current.registration.resolve(false);
				delete_sink(subscription_origin, current.id, sink);
			};
			const cancel = async () => {
				sink.state = 'disconnected';
				const current = sink.subscription;
				if (
					!current ||
					this.#subscription_sinks
						.get(subscription_origin)
						?.get(current.id) !== sink
				) {
					return;
				}
				const registered = await current.registration.promise;
				delete_sink(subscription_origin, current.id, sink);
				if (registered) {
					await manager.close(
						current.id,
						subscription_origin,
						'cancelled',
					);
				}
			};

			// Create a short-lived stream that closes after sending the response
			const stream = new ReadableStream({
				start(controller) {
					sink.controller = controller;
					if (subscription_id !== undefined) {
						register_sink(
							subscription_origin,
							subscription_id,
							sink,
						);
					}
				},
				cancel,
			});

			const session_id_storage = this.#session_id_storage;

			const handle = async () => {
				const init_message = messages.find(
					(/** @type {any} */ m) => m.method === 'initialize',
				);

				const client_capabilities = init_message
					? init_message.params?.capabilities
					: await this.#options.sessionManager.info
							.getClientCapabilities(session_id)
							.catch(() => undefined);
				const client_info = init_message
					? init_message.params?.clientInfo
					: await this.#options.sessionManager.info
							.getClientInfo(session_id)
							.catch(() => undefined);
				const log_level = init_message
					? undefined
					: await this.#options.sessionManager.info
							.getLogLevel(session_id)
							.catch(() => undefined);

				const response = await this.#controller_storage.run(
					sink.controller,
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
								subscriptionOrigin: subscription_origin,
								subscriptionManager:
									server_subscription_manager,
							}),
						),
				);

				if (sink.state === 'open' && response != null) {
					sink.controller?.enqueue(
						this.#text_encoder.encode(
							'event: message\ndata: ' +
								JSON.stringify(response) +
								'\n\n',
						),
					);
				}
				if (sink.state !== 'disconnected') sink.controller?.close();
				release_sink();
			};

			void handle().catch((error) => {
				if (sink.state !== 'disconnected')
					sink.controller?.error(error);
				release_sink();
			});

			const has_request = request_message && valid_id;

			// Determine status code based on response type
			// 202 Accepted for notifications/responses, 200 OK for standard requests
			const status = !has_request ? 202 : 200;

			const response = new Response(has_request ? stream : null, {
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
			if (subscription_id !== undefined) {
				this.#subscription_responses.set(response, {
					id: subscription_id,
					origin: subscription_origin,
				});
			}
			return response;
		} catch (error) {
			// Handle JSON parsing errors
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					id: null,
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
	 * Gracefully complete one active per-request subscription.
	 * @param {Response} response
	 * @returns {Promise<boolean>}
	 */
	async closeSubscription(response) {
		const subscription = this.#subscription_responses.get(response);
		if (!subscription) return false;
		this.#subscription_responses.delete(response);
		const sink = this.#subscription_sinks
			.get(subscription.origin)
			?.get(subscription.id);
		if (!sink) return false;
		const registered = await sink.subscription?.registration.promise;
		if (!registered) return false;
		return this.#subscription_manager.close(
			subscription.id,
			subscription.origin,
			'closed',
		);
	}

	/**
	 * Close every active per-request subscription owned by this transport.
	 */
	async close() {
		/** @type {Array<[string | number, string]>} */
		const owned = [];
		for (const [origin, sinks] of this.#subscription_sinks) {
			for (const id of sinks.keys()) {
				owned.push([id, origin]);
			}
		}
		await Promise.all(
			owned.map(([id, origin]) => this.#cancel_subscription(id, origin)),
		);
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
		const path_matches = this.#path === null || url.pathname === this.#path;
		if (path_matches && !this.#allows_origin(request)) {
			return new Response('Forbidden origin', { status: 403 });
		}

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
		if (!path_matches) {
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
