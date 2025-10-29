/* eslint-disable jsdoc/no-undefined-types */
/* eslint-disable no-undef */
/**
 * @import { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
 */

import { DurableObject, env } from 'cloudflare:workers';

/**
 * @param {unknown} namespace
 * @returns {namespace is DurableObjectNamespace<SyncLayer>}
 */
function is_durable_object_namespace(namespace) {
	return (
		typeof namespace === 'object' &&
		namespace !== null &&
		'newUniqueId' in namespace &&
		typeof namespace.newUniqueId === 'function' &&
		'idFromName' in namespace &&
		typeof namespace.idFromName === 'function'
	);
}

/**
 * @param {unknown} namespace
 * @returns {namespace is KVNamespace}
 */
function is_kv_namespace(namespace) {
	return (
		typeof namespace === 'object' &&
		namespace !== null &&
		'get' in namespace &&
		typeof namespace.get === 'function' &&
		'list' in namespace &&
		typeof namespace.list === 'function' &&
		'put' in namespace &&
		typeof namespace.put === 'function' &&
		'getWithMetadata' in namespace &&
		typeof namespace.getWithMetadata === 'function' &&
		'delete' in namespace &&
		typeof namespace.delete === 'function'
	);
}

/**
 * @implements {StreamSessionManager}
 */
export class DurableObjectStreamSessionManager {
	/**
	 * @type {string}
	 */
	#binding;

	/**
	 * @param {string} binding
	 */
	constructor(binding = 'TMCP_DURABLE_OBJECT') {
		this.#binding = binding;
	}
	get #namespace() {
		const namespace = /** @type {any} */ (env)[this.#binding];
		if (!is_durable_object_namespace(namespace)) {
			throw new Error(
				`${this.#binding} is not a Durable Object namespace`,
			);
		}
		return namespace;
	}

	get #stub() {
		return this.#namespace.getByName('TMCP_DURABLE_OBJECT');
	}

	/**
	 *
	 * @param {string} id
	 * @param {ReadableStreamDefaultController} controller
	 * @returns
	 */
	async create(id, controller) {
		// just a random URL, it will not actually be fetched
		// but it is needed to create the WebSocket connection
		const ws_request = new Request(`https://tmcp.io?session_id=${id}`, {
			headers: { Upgrade: 'websocket' },
		});
		const ws_response = await this.#stub.fetch(ws_request);

		if (ws_response.status !== 101 || !ws_response.webSocket) {
			throw new Error('Failed to establish WebSocket connection');
		}

		const ws = ws_response.webSocket;

		ws.accept();

		const encoder = new TextEncoder();

		ws.addEventListener('message', ({ data: data_str }) => {
			const data = JSON.parse(data_str);
			if (data.type === 'send') {
				try {
					controller.enqueue(encoder.encode(data.payload));
				} catch (error) {
					console.error('Error enqueuing SSE data:', error);
				}
			} else if (data.type === 'delete') {
				try {
					controller.close();
				} catch (error) {
					console.error('Error closing controller:', error);
				}
			}
		});

		ws.addEventListener('close', () => {
			try {
				controller.close();
			} catch (error) {
				console.error('Error closing controller:', error);
			}
		});

		ws.addEventListener('error', () => {
			console.error('WEBSOCKET ERROR');
		});
	}
	/**
	 * @param {string} id
	 */
	async delete(id) {
		await this.#stub.delete(id);
	}

	/**
	 * @param {string} id
	 */
	async has(id) {
		return await this.#stub.has(id);
	}
	/**
	 *
	 * @param {undefined | string[]} sessions
	 * @param {unknown} data
	 */
	async send(sessions, data) {
		await this.#stub.broadcast(sessions, data);
	}
}

/**
 * @implements {InfoSessionManager}
 */
export class KVInfoSessionManager {
	/**
	 * @type {string}
	 */
	#binding;

	/**
	 *
	 * @param {string | null} level
	 * @returns {level is Awaited<ReturnType<InfoSessionManager["getLogLevel"]>>}
	 */
	#is_log_level(level) {
		return (
			typeof level === 'string' &&
			[
				'debug',
				'info',
				'notice',
				'warning',
				'error',
				'critical',
				'alert',
				'emergency',
			].includes(level)
		);
	}

	/**
	 * @param {string} binding
	 */
	constructor(binding = 'TMCP_SESSION_INFO') {
		this.#binding = binding;
	}
	get #client() {
		const namespace = /** @type {any} */ (env)[this.#binding];
		if (!is_kv_namespace(namespace)) {
			throw new Error(`${this.#binding} is not a KV namespace`);
		}
		return namespace;
	}

	/**
	 * @type {InfoSessionManager['getClientInfo']}
	 */
	async getClientInfo(id) {
		const client_info = await this.#client.get(`tmcp:client_info:${id}`);
		if (client_info != null) {
			return JSON.parse(client_info);
		}

		throw new Error(`Client info not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setClientInfo"]}
	 */
	async setClientInfo(id, client_info) {
		await this.#client.put(
			`tmcp:client_info:${id}`,
			JSON.stringify(client_info),
		);
	}
	/**
	 * @type {InfoSessionManager["getClientCapabilities"]}
	 */
	async getClientCapabilities(id) {
		const client_capabilities = await this.#client.get(
			`tmcp:client_capabilities:${id}`,
		);
		if (client_capabilities != null) {
			return JSON.parse(client_capabilities);
		}

		throw new Error(`Client capabilities not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setClientCapabilities"]}
	 */
	async setClientCapabilities(id, client_capabilities) {
		await this.#client.put(
			`tmcp:client_capabilities:${id}`,
			JSON.stringify(client_capabilities),
		);
	}
	/**
	 * @type {InfoSessionManager["getLogLevel"]}
	 */
	async getLogLevel(id) {
		const log_level = await this.#client.get(`tmcp:log_level:${id}`);

		if (this.#is_log_level(log_level)) {
			return log_level;
		}

		throw new Error(`Log level not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setLogLevel"]}
	 */
	async setLogLevel(id, log_level) {
		await this.#client.put(
			`tmcp:log_level:${id}`,
			JSON.stringify(log_level),
		);
	}
	/**
	 * @type {InfoSessionManager["getSubscriptions"]}
	 */
	async getSubscriptions(uri) {
		const subscriptions = await this.#client.list({
			prefix: `tmcp:subscriptions:${uri}:`,
		});
		return (
			await Promise.all(
				subscriptions.keys.map(async (key) => {
					const id = await this.#client.get(key.name);
					return id;
				}),
			)
		).filter((id) => id != null);
	}
	/**
	 * @type {InfoSessionManager["addSubscription"]}
	 */
	async addSubscription(id, uri) {
		await this.#client.put(
			`tmcp:subscriptions:${uri}:${crypto.randomUUID()}`,
			id,
		);
	}

	/**
	 * @param {string} id
	 */
	async #remove_id_from_subscriptions(id) {
		const list = await this.#client.list({
			prefix: 'tmcp:subscriptions:',
		});
		for (const key of list.keys) {
			if ((await this.#client.get(key.name)) === id) {
				await this.#client.delete(key.name);
			}
		}
	}

	/**
	 * @type {InfoSessionManager["delete"]}
	 */
	async delete(id) {
		await Promise.all([
			this.#client.delete(`tmcp:client_info:${id}`),
			this.#client.delete(`tmcp:client_capabilities:${id}`),
			this.#client.delete(`tmcp:log_level:${id}`),
			this.#remove_id_from_subscriptions(id),
		]);
	}
}

/**
 * WebSocket Hibernation Server using Cloudflare Durable Objects
 *
 * This class manages WebSocket connections that can hibernate when inactive,
 * allowing the Durable Object to be evicted from memory while keeping
 * connections open. When a message is received, the DO is recreated and
 * the connection state is restored.
 *
 */
export class SyncLayer extends DurableObject {
	/**
	 * Map of active WebSocket connections and their session data
	 * Gets reconstructed when the DO wakes up from hibernation
	 *
	 * @type {Map<string, WebSocket>}
	 */
	#sessions;

	/**
	 * Creates a new WebSocketHibernationServer instance
	 *
	 * @param {DurableObjectState} ctx - The Durable Object state context
	 * @param {Cloudflare.Env} env - Environment variables and bindings
	 */
	constructor(ctx, env) {
		super(ctx, env);

		this.#sessions = new Map();

		// As part of constructing the Durable Object,
		// we wake up any hibernating WebSockets and
		// place them back in the `sessions` map.

		// Get all WebSocket connections from the DO
		this.ctx.getWebSockets().forEach((ws) => {
			let id = ws.deserializeAttachment();
			if (id) {
				// If we previously attached state to our WebSocket,
				// let's add it to `sessions` map to restore the state of the connection.
				this.#sessions.set(id, ws);
			}
		});
	}

	/**
	 * @param {string} id
	 */
	async has(id) {
		return this.#sessions.has(id);
	}

	/**
	 * @param {string} id
	 */
	async delete(id) {
		const ws = this.#sessions.get(id);
		this.#sessions.delete(id);
		if (ws) {
			ws.send(
				JSON.stringify({
					type: 'delete',
				}),
			);
			ws.close();
		}
	}

	/**
	 * @param {string[] | undefined} sessions
	 * @param {*} payload
	 */
	async broadcast(sessions, payload) {
		for (let [id, ws] of this.#sessions) {
			if (sessions == null || sessions.includes(id)) {
				ws.send(
					JSON.stringify({
						type: 'send',
						payload,
					}),
				);
			}
		}
	}

	/**
	 * Handles incoming HTTP requests and upgrades them to WebSocket connections
	 *
	 * @param {Request} request - The incoming HTTP request
	 * @returns {Promise<Response>} Response with WebSocket upgrade or error
	 */
	async fetch(request) {
		const url = new URL(request.url);

		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		// Unlike `ws.accept()`, `this.ctx.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
		// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
		// the connection is open. During periods of inactivity, the Durable Object can be evicted
		// from memory, but the WebSocket connection will remain open. If at some later point the
		// WebSocket receives a message, the runtime will recreate the Durable Object
		// (run the `constructor`) and deliver the message to the appropriate handler.
		this.ctx.acceptWebSocket(server);

		// Generate a random UUID for the session.
		const id = url.searchParams.get('session_id') || crypto.randomUUID();

		// Attach the session ID to the WebSocket connection and serialize it.
		// This is necessary to restore the state of the connection when the Durable Object wakes up.
		server.serializeAttachment(id);

		// Add the WebSocket connection to the map of active sessions.
		this.#sessions.set(id, server);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}
