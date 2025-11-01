/**
 * @import { McpServer, Context, Subscriptions } from "tmcp";
 * @import { JSONRPCRequest, JSONRPCResponse } from "json-rpc-2.0";
 */

import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class Session {
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
			this.#adapter.server.on('subscription', ({ uri }) => {
				const sessionId = this.#adapter.sessionId;
				if (sessionId !== this.#session_id) return;

				this.#subscriptions ??= {
					resource: [],
				};
				this.#subscriptions.resource?.push(uri);
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
	 * List all available tools
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListToolsResult>}
	 */
	async listTools(params, ctx) {
		return this.#adapter.request(
			'tools/list',
			params,
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Call a tool
	 * @param {string} name - Tool name
	 * @param {Record<string, unknown>} [args] - Tool arguments
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").CallToolResult<any>>}
	 */
	async callTool(name, args, ctx) {
		return this.#adapter.request(
			'tools/call',
			{ name, arguments: args },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * List all available prompts
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListPromptsResult>}
	 */
	async listPrompts(params, ctx) {
		return this.#adapter.request(
			'prompts/list',
			params,
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Get a prompt with optional arguments
	 * @param {string} name - Prompt name
	 * @param {Record<string, string>} [args] - Prompt arguments
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").GetPromptResult>}
	 */
	async getPrompt(name, args, ctx) {
		return this.#adapter.request(
			'prompts/get',
			{ name, arguments: args },
			this.#session_id,
			ctx,
		);
	}

	/**
	 * List all available resources
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListResourcesResult>}
	 */
	async listResources(params, ctx) {
		return this.#adapter.request(
			'resources/list',
			params,
			this.#session_id,
			ctx,
		);
	}

	/**
	 * List all available resource templates
	 * @param {{ cursor?: string }} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ListResourceTemplatesResult>}
	 */
	async listResourceTemplates(params, ctx) {
		return this.#adapter.request(
			'resources/templates/list',
			params,
			this.#session_id,
			ctx,
		);
	}

	/**
	 * Read a resource by URI
	 * @param {string} uri - Resource URI
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").ReadResourceResult>}
	 */
	async readResource(uri, ctx) {
		return this.#adapter.request(
			'resources/read',
			{ uri },
			this.#session_id,
			ctx,
		);
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
	 * Request completion suggestions
	 * @param {{ type: 'ref/prompt' | 'ref/resource', name?: string, uri?: string }} ref - Reference to prompt or resource
	 * @param {{ name: string, value: string }} argument - Argument to complete
	 * @param {{ arguments?: Record<string, string> }} [context] - Optional context
	 * @param {TCustom} [ctx]
	 * @returns {Promise<import("tmcp").CompleteResult>}
	 */
	async complete(ref, argument, context, ctx) {
		return this.#adapter.request(
			'completion/complete',
			{ ref, argument, context },
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
	 * @type {AsyncLocalStorage<string | undefined>}
	 */
	#session_id_storage = new AsyncLocalStorage();

	/**
	 * @param {McpServer<any, TCustom>} server
	 */
	constructor(server) {
		this.#server = server;

		// Set up global event listeners for message capture
		this.#cleaners.add(
			this.#server.on('send', ({ request }) => {
				const sessionId = this.#session_id_storage.getStore();
				let messages = this.#sent_messages.get(sessionId);
				if (!messages) {
					this.#sent_messages.set(sessionId, (messages = []));
				}
				messages.push(request);
			}),
		);

		this.#cleaners.add(
			this.#server.on('broadcast', ({ request }) => {
				const sessionId = this.#session_id_storage.getStore();
				const session = this.#sessions.get(sessionId);
				if (!session) return;

				// Check if session is subscribed to this resource notification
				if (
					request.method === 'notifications/resources/updated' &&
					!session.subscriptions.resource.includes(request.params.uri)
				) {
					return;
				}
				let messages = this.#broadcast_messages.get(sessionId);
				if (!messages) {
					this.#broadcast_messages.set(sessionId, (messages = []));
				}
				messages.push(request);
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
			session_info = session.sessionInfo;
		}

		const response = await this.#session_id_storage.run(sessionId, () =>
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

		await this.#session_id_storage.run(sessionId, () =>
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
		return this.#session_id_storage.getStore();
	}

	/**
	 * Internal method to get sent messages for a session
	 * @param {string} session_id
	 * @returns {Array<JSONRPCRequest>}
	 */
	sentMessages(session_id) {
		return [...(this.#sent_messages.get(session_id) || [])];
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
		this.#sent_messages.set(session_id, []);
		this.#broadcast_messages.set(session_id, []);
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
