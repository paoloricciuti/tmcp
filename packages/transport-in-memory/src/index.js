/**
 * @import { McpServer, Context, Subscriptions, ClientCapabilities, ClientInfo, LoggingLevel, InitializeResult } from "tmcp";
 * @import { JSONRPCRequest, JSONRPCResponse } from "json-rpc-2.0";
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { JSONRPCErrorException } from 'json-rpc-2.0';

const PER_REQUEST_PROTOCOL_VERSION = '2026-07-28';

/**
 * @typedef {Object} StatelessClientOptions
 * @property {string} [protocolVersion]
 * @property {ClientCapabilities} [clientCapabilities]
 * @property {ClientInfo} [clientInfo]
 * @property {LoggingLevel} [logLevel]
 */

/**
 * @template {Record<string, unknown> | undefined} TCustom
 * @typedef {Object} StatelessInputRequestOptions
 * @property {number} [maxRounds]
 * @property {TCustom} [ctx]
 */

/**
 * @typedef {Object} DiscoverResult
 * @property {'complete'} resultType
 * @property {string[]} supportedVersions
 * @property {InitializeResult['capabilities']} capabilities
 * @property {string} [instructions]
 * @property {number} [ttlMs]
 * @property {'private' | 'public'} [cacheScope]
 * @property {Record<string, unknown>} [_meta]
 */

/** @typedef {{ method: string, params?: Record<string, unknown> }} InputRequest */

/**
 * @template {Record<string, unknown> | undefined} TCustom
 * @typedef {(method: string, params?: Record<string, unknown>, ctx?: TCustom) => Promise<any>} ClientRequest
 */

/**
 * High-level methods shared by session-negotiated and sessionless clients.
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
class Client {
	/** @type {ClientRequest<TCustom>} */
	#request;

	/** @param {ClientRequest<TCustom>} request */
	constructor(request) {
		this.#request = request;
	}

	/**
	 * Send a low-level request.
	 * @template [TResult=unknown]
	 * @param {string} method
	 * @param {Record<string, unknown>} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<TResult>}
	 */
	request(method, params, ctx) {
		return this.#request(method, params, ctx);
	}

	/**
	 * List all available tools.
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListToolsResult>}
	 */
	listTools(params, ctx) {
		return this.request('tools/list', params, ctx);
	}

	/**
	 * Call a tool.
	 * @template [TStructuredContent=undefined]
	 * @param {string} name
	 * @param {Record<string, unknown>} [args]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").CallToolResult<TStructuredContent>>}
	 */
	callTool(name, args = {}, ctx) {
		return this.request('tools/call', { name, arguments: args }, ctx);
	}

	/**
	 * List all available prompts.
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListPromptsResult>}
	 */
	listPrompts(params, ctx) {
		return this.request('prompts/list', params, ctx);
	}

	/**
	 * Get a prompt with optional arguments.
	 * @param {string} name
	 * @param {Record<string, string>} [args]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").GetPromptResult>}
	 */
	getPrompt(name, args = {}, ctx) {
		return this.request('prompts/get', { name, arguments: args }, ctx);
	}

	/**
	 * List all available resources.
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListResourcesResult>}
	 */
	listResources(params, ctx) {
		return this.request('resources/list', params, ctx);
	}

	/**
	 * List all available resource templates.
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListResourceTemplatesResult>}
	 */
	listResourceTemplates(params, ctx) {
		return this.request('resources/templates/list', params, ctx);
	}

	/**
	 * Read a resource by URI.
	 * @param {string} uri
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ReadResourceResult>}
	 */
	readResource(uri, ctx) {
		return this.request('resources/read', { uri }, ctx);
	}

	/**
	 * Request completion suggestions.
	 * @param {{ type: 'ref/prompt' | 'ref/resource', name?: string, uri?: string }} ref
	 * @param {{ name: string, value: string }} argument
	 * @param {{ arguments?: Record<string, string> }} [context]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").CompleteResult>}
	 */
	complete(ref, argument, context, ctx) {
		return this.request(
			'completion/complete',
			{ ref, argument, context },
			ctx,
		);
	}
}

/**
 * A sessionless MCP client for the per-request protocol. Its ordinary MCP
 * methods have the same signatures as `Session`.
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 * @augments {Client<TCustom>}
 */
export class StatelessClient extends Client {
	/** @type {ClientRequest<TCustom>} */
	#raw_request;
	/** @type {() => Array<JSONRPCRequest>} */
	#sent_messages;
	/** @type {() => void} */
	#clear;
	/** @type {() => void} */
	#close;

	/**
	 * @param {ClientRequest<TCustom>} request
	 * @param {() => Array<JSONRPCRequest>} sent_messages
	 * @param {() => void} clear
	 * @param {() => void} close
	 */
	constructor(request, sent_messages, clear, close) {
		super(async (method, params, ctx) => {
			const result = await request(method, params, ctx);
			if (
				typeof result === 'object' &&
				result !== null &&
				result.resultType === 'input_required'
			) {
				throw new Error(
					'This request requires client input; use requestWithInput() to complete MRTR requests',
				);
			}
			return result;
		});
		this.#raw_request = request;
		this.#sent_messages = sent_messages;
		this.#clear = clear;
		this.#close = close;
	}

	/**
	 * Discover the server's per-request protocol support.
	 * @param {TCustom} [ctx]
	 * @returns {Promise<DiscoverResult>}
	 */
	discover(ctx) {
		return this.request('server/discover', undefined, ctx);
	}

	/**
	 * Repeat a sessionless request until it completes, resolving every batch of
	 * MRTR input requests with `respond`. The server may re-run the handler from
	 * the top on each round.
	 * @template [TResult=unknown]
	 * @param {string} method
	 * @param {Record<string, unknown>} params
	 * @param {(request: InputRequest, key: string) => unknown | Promise<unknown>} respond
	 * @param {StatelessInputRequestOptions<TCustom>} [options]
	 * @returns {Promise<TResult>}
	 */
	async requestWithInput(method, params, respond, options = {}) {
		const max_rounds = options.maxRounds ?? 10;
		if (!Number.isInteger(max_rounds) || max_rounds < 1) {
			throw new TypeError('maxRounds must be a positive integer');
		}

		const initial_params = { ...params };
		delete initial_params.inputResponses;
		delete initial_params.requestState;
		let request_params = params;

		for (let round = 0; round < max_rounds; round += 1) {
			const result = /** @type {Record<string, any>} */ (
				await this.#raw_request(method, request_params, options.ctx)
			);
			if (result?.resultType !== 'input_required') {
				return /** @type {TResult} */ (result);
			}

			const input_requests = Object.entries(result.inputRequests ?? {});
			const input_responses = Object.fromEntries(
				await Promise.all(
					input_requests.map(async ([key, request]) => [
						key,
						await respond(
							/** @type {InputRequest} */ (request),
							key,
						),
					]),
				),
			);
			request_params = {
				...initial_params,
				...(result.requestState === undefined
					? {}
					: { requestState: result.requestState }),
				...(input_requests.length === 0
					? {}
					: { inputResponses: input_responses }),
			};
		}

		throw new Error(
			`Request did not complete within ${max_rounds} MRTR rounds`,
		);
	}

	/** @returns {Array<JSONRPCRequest>} */
	get sentMessages() {
		return this.#sent_messages();
	}

	clear() {
		this.#clear();
	}

	close() {
		this.#close();
	}
}

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 * @augments {Client<TCustom>}
 */
export class Session extends Client {
	/**
	 * @type {InMemoryTransport<TCustom>}
	 */
	#adapter;

	/**
	 * @type {string}
	 */
	#session_id;

	/**
	 * @type {Set<() => void>}
	 */
	#cleaners = new Set();

	/**
	 * @type {NonNullable<Partial<Context["sessionInfo"]>>}
	 */
	#session_info = {};

	/**
	 * @type {Subscriptions}
	 */
	#subscriptions = {
		resource: [],
	};

	/**
	 * @type {number}
	 */
	#request_id = 0;

	/**
	 * @param {InMemoryTransport<TCustom>} adapter
	 * @param {string} session_id
	 */
	constructor(adapter, session_id) {
		super((method, params, ctx) =>
			adapter.request(method, params, session_id, ctx),
		);
		this.#adapter = adapter;
		this.#session_id = session_id;

		// Set up event listeners for this session
		this.#cleaners.add(
			this.#adapter.server.on(
				'initialize',
				({ capabilities, clientInfo }) => {
					const sessionId = this.#adapter.sessionId;
					if (sessionId !== this.#session_id) return;

					this.#session_info.clientCapabilities = capabilities;
					this.#session_info.clientInfo = clientInfo;
				},
			),
		);

		this.#cleaners.add(
			this.#adapter.server.on('loglevelchange', ({ level }) => {
				const sessionId = this.#adapter.sessionId;
				if (sessionId !== this.#session_id) return;
				this.#session_info.logLevel = level;
			}),
		);

		this.#cleaners.add(
			this.#adapter.server.on('subscription', ({ uri, action }) => {
				const sessionId = this.#adapter.sessionId;
				if (sessionId !== this.#session_id) return;

				this.#subscriptions ??= {
					resource: [],
				};
				if (action === 'remove') {
					this.#subscriptions.resource =
						this.#subscriptions.resource?.filter(
							(item) => item !== uri,
						);
				} else {
					this.#subscriptions.resource?.push(uri);
				}
			}),
		);
	}

	get sessionId() {
		return this.#session_id;
	}

	/**
	 * Initialize the MCP server connection
	 * @param {string} protocolVersion - The protocol version to use
	 * @param {import("tmcp").ClientCapabilities} capabilities - Client capabilities
	 * @param {import("tmcp").ClientInfo} clientInfo - Client information
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").InitializeResult>}
	 */
	async initialize(protocolVersion, capabilities, clientInfo, ctx) {
		return this.#adapter.request(
			'initialize',
			{ protocolVersion, capabilities, clientInfo },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Ping the server
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{}>}
	 */
	async ping(ctx) {
		return this.#adapter.request('ping', undefined, this.#session_id, ctx);
	}

	/**
	 * Subscribe to resource updates
	 * @param {string} uri - Resource URI to subscribe to
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{}>}
	 */
	async subscribeResource(uri, ctx) {
		return this.#adapter.request(
			'resources/subscribe',
			{ uri },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Unsubscribe from resource updates
	 * @param {string} uri - Resource URI to subscribe to
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{}>}
	 */
	async unsubscribeResource(uri, ctx) {
		return this.#adapter.request(
			'resources/unsubscribe',
			{ uri },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Set the logging level
	 * @param {import("tmcp").LoggingLevel} level - Logging level
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{}>}
	 */
	async setLogLevel(level, ctx) {
		return this.#adapter.request(
			'logging/setLevel',
			{ level },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Send a response to a request that was sent by the server (available in sentMessages)
	 * @param {number | string} request_id - The ID of the request to respond to
	 * @param {any} [result] - The result to send back (either result or error must be provided)
	 * @param {{ code: number, message: string, data?: any }} [error] - The error to send back (either result or error must be provided)
	 * @param {TCustom} [ctx]
	 * @returns {Promise<void>}
	 */
	async response(request_id, result, error, ctx) {
		return this.#adapter.response(
			request_id,
			result,
			error,
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Get all messages sent by the server for this session (excluding broadcasts)
	 * @returns {Array<JSONRPCRequest>}
	 */
	get sentMessages() {
		return this.#adapter.sentMessages(this.#session_id);
	}

	/**
	 * Get all messages sent by the server for this session (excluding broadcasts)
	 * @returns {JSONRPCRequest | undefined}
	 */
	get lastRequest() {
		return this.#adapter.sentMessages(this.#session_id).at(-1);
	}

	/**
	 * Get all broadcast messages sent by the server for this session
	 * @returns {Array<JSONRPCRequest>}
	 */
	get broadcastMessages() {
		return this.#adapter.broadcastMessages(this.#session_id);
	}

	/**
	 * Get the current session info
	 * @returns {NonNullable<Partial<Context["sessionInfo"]>>}
	 */
	get sessionInfo() {
		return { ...this.#session_info };
	}

	/**
	 * Get the current subscriptions
	 * @returns {Subscriptions}
	 */
	get subscriptions() {
		return {
			resource: [...this.#subscriptions.resource],
		};
	}

	/**
	 * Clear all captured messages for this session
	 */
	clear() {
		this.#adapter.clearSessionMessages(this.#session_id);
	}

	/**
	 * Close the session and clean up event listeners
	 */
	close() {
		for (const cleaner of this.#cleaners) {
			cleaner();
		}
		this.#cleaners.clear();
		this.#adapter.closeSession(this.#session_id);
	}

	/**
	 * Internal method to get and increment request ID
	 * @returns {number}
	 */
	nextId() {
		return this.#request_id++;
	}
}

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class InMemoryTransport {
	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {Map<string | undefined, Session<TCustom>>}
	 */
	#sessions = new Map();

	/**
	 * @type {Map<string | undefined, Array<JSONRPCRequest>>}
	 */
	#sent_messages = new Map();

	/**
	 * @type {Map<string | undefined, Array<JSONRPCRequest>>}
	 */
	#broadcast_messages = new Map();

	/**
	 * @type {Set<() => void>}
	 */
	#cleaners = new Set();

	/**
	 * @type {AsyncLocalStorage<{ client_id: string | undefined, session_id: string | undefined }>}
	 */
	#request_context_storage = new AsyncLocalStorage();

	/**
	 * @param {McpServer<any, TCustom>} server
	 */
	constructor(server) {
		this.#server = server;

		// Set up global event listeners for message capture
		this.#cleaners.add(
			this.#server.on('send', ({ request }) => {
				const request_context =
					this.#request_context_storage.getStore();
				if (!request_context) return;
				const client_id = request_context.client_id;
				let messages = this.#sent_messages.get(client_id);
				if (!messages) {
					this.#sent_messages.set(client_id, (messages = []));
				}
				messages.push(request);
			}),
		);

		this.#cleaners.add(
			this.#server.on('broadcast', ({ request }) => {
				// Broadcasts should be delivered to ALL subscribed sessions
				// not just the current async context
				for (const [sessionId, session] of this.#sessions.entries()) {
					// Check if session is subscribed to this resource notification
					if (
						request.method === 'notifications/resources/updated' &&
						!session.subscriptions.resource.includes(
							request.params.uri,
						)
					) {
						continue;
					}
					let messages = this.#broadcast_messages.get(sessionId);
					if (!messages) {
						this.#broadcast_messages.set(
							sessionId,
							(messages = []),
						);
					}
					messages.push(request);
				}
			}),
		);
	}

	/**
	 * Get the underlying server instance
	 * @returns {McpServer<any, TCustom>}
	 */
	get server() {
		return this.#server;
	}

	/**
	 * Get or create a session
	 * @param {string} [session_id]
	 * @returns {Session<TCustom>}
	 */
	session(session_id = crypto.randomUUID()) {
		let session = this.#sessions.get(session_id);
		if (!session) {
			this.#sessions.set(
				session_id,
				(session = new Session(this, session_id)),
			);
		}
		return session;
	}

	/**
	 * Create a sessionless client for the per-request protocol.
	 * @param {StatelessClientOptions} [options]
	 * @returns {StatelessClient<TCustom>}
	 */
	stateless(options = {}) {
		const client_id = crypto.randomUUID();
		let request_id = 0;
		const metadata = {
			'io.modelcontextprotocol/protocolVersion':
				options.protocolVersion ?? PER_REQUEST_PROTOCOL_VERSION,
			'io.modelcontextprotocol/clientCapabilities':
				options.clientCapabilities ?? {},
			...(options.clientInfo
				? {
						'io.modelcontextprotocol/clientInfo':
							options.clientInfo,
					}
				: {}),
			...(options.logLevel
				? {
						'io.modelcontextprotocol/logLevel': options.logLevel,
					}
				: {}),
		};
		const request = /** @type {ClientRequest<TCustom>} */ (
			(method, params, ctx) =>
				this.#stateless_request(
					method,
					metadata,
					request_id++,
					client_id,
					params,
					ctx,
				)
		);

		return new StatelessClient(
			request,
			() => this.sentMessages(client_id),
			() => this.#clear_client_messages(client_id),
			() => this.#close_client(client_id),
		);
	}

	/**
	 * Send a request to the server by method name and params
	 * @param {string} method
	 * @param {Record<string, unknown>} [params]
	 * @param {string} [sessionId]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<any>}
	 */
	async request(method, params, sessionId, ctx) {
		const session = this.#sessions.get(sessionId);

		// Get request_id from session if available
		let request_id = 0;
		let session_info = undefined;

		if (session) {
			request_id = session.nextId();
			session_info =
				method === 'initialize'
					? /** @type {Context["sessionInfo"]} */ ({
							clientCapabilities: params?.capabilities,
							clientInfo: params?.clientInfo,
						})
					: session.sessionInfo;
		}

		const response = await this.#request_context_storage.run(
			{ client_id: sessionId, session_id: sessionId },
			() =>
				this.#server.receive(
					{
						jsonrpc: '2.0',
						id: request_id,
						method,
						...(params ? { params } : {}),
					},
					{
						custom: ctx,
						sessionId,
						sessionInfo: session_info,
					},
				),
		);

		return response?.result;
	}

	/**
	 * Send a strict sessionless request with explicit per-request metadata.
	 * @template TResult
	 * @param {string} method
	 * @param {Record<string, unknown>} metadata
	 * @param {number | string} request_id
	 * @param {string} client_id
	 * @param {Record<string, unknown>} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<TResult>}
	 */
	async #stateless_request(
		method,
		metadata,
		request_id,
		client_id,
		params,
		ctx,
	) {
		const params_metadata =
			typeof params?._meta === 'object' &&
			params._meta !== null &&
			!Array.isArray(params._meta)
				? params._meta
				: {};
		const response = await this.#request_context_storage.run(
			{ client_id, session_id: undefined },
			() =>
				this.#server.receive(
					{
						jsonrpc: '2.0',
						id: request_id,
						method,
						params: {
							...params,
							_meta: { ...params_metadata, ...metadata },
						},
					},
					{ custom: ctx },
				),
		);

		if (response?.error) {
			throw new JSONRPCErrorException(
				response.error.message,
				response.error.code,
				response.error.data,
			);
		}
		return /** @type {TResult} */ (response?.result);
	}

	/**
	 * Send a response to a request that was sent by the server
	 * @param {number | string} request_id - The ID of the request to respond to
	 * @param {any} [result] - The result to send back (either result or error must be provided)
	 * @param {{ code: number, message: string, data?: any }} [error] - The error to send back (either result or error must be provided)
	 * @param {string} [sessionId]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<void>}
	 */
	async response(request_id, result, error, sessionId, ctx) {
		const session = sessionId ? this.#sessions.get(sessionId) : undefined;
		const session_info = session ? session.sessionInfo : undefined;

		await this.#request_context_storage.run(
			{ client_id: sessionId, session_id: sessionId },
			() =>
				this.#server.receive(
					{
						jsonrpc: '2.0',
						id: request_id,
						...(error ? { error } : { result }),
					},
					{
						custom: ctx,
						sessionId,
						sessionInfo: session_info,
					},
				),
		);
	}

	/**
	 * Internal method to get the current session ID from AsyncLocalStorage
	 * @returns {string | undefined}
	 */
	get sessionId() {
		return this.#request_context_storage.getStore()?.session_id;
	}

	/**
	 * Internal method to get sent messages for a session
	 * @param {string} client_id
	 * @returns {Array<JSONRPCRequest>}
	 */
	sentMessages(client_id) {
		return [...(this.#sent_messages.get(client_id) || [])];
	}

	/**
	 * Internal method to get broadcast messages for a session
	 * @param {string} session_id
	 * @returns {Array<JSONRPCRequest>}
	 */
	broadcastMessages(session_id) {
		return [...(this.#broadcast_messages.get(session_id) || [])];
	}

	/**
	 * Internal method to clear messages for a session
	 * @param {string} session_id
	 */
	clearSessionMessages(session_id) {
		this.#clear_client_messages(session_id);
		this.#broadcast_messages.set(session_id, []);
	}

	/**
	 * Clear messages captured for an in-memory client.
	 * @param {string} client_id
	 */
	#clear_client_messages(client_id) {
		this.#sent_messages.set(client_id, []);
	}

	/**
	 * Remove an in-memory client message bucket.
	 * @param {string} client_id
	 */
	#close_client(client_id) {
		this.#sent_messages.delete(client_id);
	}

	/**
	 * Internal method to remove a session
	 * @param {string} session_id
	 */
	closeSession(session_id) {
		this.#sessions.delete(session_id);
		this.#sent_messages.delete(session_id);
		this.#broadcast_messages.delete(session_id);
	}

	/**
	 * Clear all messages for all sessions
	 */
	clear() {
		this.#sent_messages.clear();
		this.#broadcast_messages.clear();
	}

	/**
	 * Close all sessions and clean up all event listeners
	 */
	close() {
		// Close all sessions
		for (const session of this.#sessions.values()) {
			session.close();
		}
		this.#sessions.clear();

		// Clean up adapter-level listeners
		for (const cleaner of this.#cleaners) {
			cleaner();
		}
		this.#cleaners.clear();

		// Clear all messages
		this.clear();
	}
}
