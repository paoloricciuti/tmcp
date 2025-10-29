/* eslint-disable no-unused-vars */

/**
 * @import { Context } from "tmcp";
 */

/**
 * @abstract
 */
export class StreamSessionManager {
	/**
	 * @abstract
	 * @param {string} id
	 * @param {ReadableStreamDefaultController} controller
	 * @returns {void | Promise<void>}
	 */
	create(id, controller) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @returns {void | Promise<void>}
	 */
	delete(id) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @returns {boolean | Promise<boolean>}
	 */
	has(id) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string[] | undefined} sessions
	 * @param {string} data
	 * @returns {void | Promise<void>}
	 */
	send(sessions, data) {
		throw new Error('Method not implemented.');
	}
}

export class InMemoryStreamSessionManager extends StreamSessionManager {
	/**
	 * @type {Map<string, ReadableStreamDefaultController>}
	 */
	#sessions = new Map();
	#text_encoder = new TextEncoder();

	/**
	 * @param {string} id
	 * @param {ReadableStreamDefaultController} controller
	 */
	create(id, controller) {
		this.#sessions.set(id, controller);
	}

	/**
	 * @param {string} id
	 */
	delete(id) {
		const controller = this.#sessions.get(id);
		if (controller) {
			this.#sessions.delete(id);
			try {
				controller.close();
			} catch {
				// could error if the controller is already closed
			}
		}
	}

	/**
	 * @param {string} id
	 * @returns {Promise<boolean>}
	 */
	async has(id) {
		return this.#sessions.has(id);
	}

	/**
	 * @param {string[] | undefined} sessions
	 * @param {string} data
	 */
	send(sessions, data) {
		for (const [id, controller] of this.#sessions.entries()) {
			if (sessions == null || sessions.includes(id)) {
				controller.enqueue(this.#text_encoder.encode(data));
			}
		}
	}
}

/**
 * @abstract
 */
export class InfoSessionManager {
	/**
	 * @abstract
	 * @param {string} id
	 * @returns {Promise<NonNullable<Context["sessionInfo"]>["clientInfo"]>}
	 */
	getClientInfo(id) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @param {NonNullable<Context["sessionInfo"]>["clientInfo"]} client_info
	 */
	setClientInfo(id, client_info) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @returns {Promise<NonNullable<Context["sessionInfo"]>["clientCapabilities"]>}
	 */
	getClientCapabilities(id) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @param {NonNullable<Context["sessionInfo"]>["clientCapabilities"]} client_capabilities
	 */
	setClientCapabilities(id, client_capabilities) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @returns {Promise<NonNullable<Context["sessionInfo"]>["logLevel"]>}
	 */
	getLogLevel(id) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @param {NonNullable<Context["sessionInfo"]>["logLevel"]} log_level
	 */
	setLogLevel(id, log_level) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} uri
	 * @returns {Promise<string[]>}
	 */
	getSubscriptions(uri) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 * @param {string} uri
	 */
	addSubscription(id, uri) {
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {string} id
	 */
	delete(id) {
		throw new Error('Method not implemented.');
	}
}

export class InMemoryInfoSessionManager extends InfoSessionManager {
	/**
	 * @type {Map<string, NonNullable<Context["sessionInfo"]>["clientInfo"]>}
	 */
	#client_info = new Map();
	/**
	 * @type {Map<string, NonNullable<Context["sessionInfo"]>["clientCapabilities"]>}
	 */
	#client_capabilities = new Map();
	/**
	 * @type {Map<string, NonNullable<Context["sessionInfo"]>["logLevel"]>}
	 */
	#log_level = new Map();
	/**
	 * @type {Map<string, Set<string>>}
	 */
	#subscriptions = new Map();

	/**
	 * @param {string} session
	 * @param {string} name
	 * @returns {Promise<never>}
	 */
	async #invariant(session, name) {
		throw new Error(`${name} not found for session ${session}`);
	}

	/**
	 * @type {InfoSessionManager["getClientInfo"]}
	 */
	getClientInfo(id) {
		return Promise.resolve(
			this.#client_info.get(id) ?? this.#invariant(id, 'Client info'),
		);
	}

	/**
	 * @type {InfoSessionManager["setClientInfo"]}
	 */
	setClientInfo(id, client_info) {
		this.#client_info.set(id, client_info);
	}

	/**
	 * @type {InfoSessionManager["getClientCapabilities"]}
	 */
	getClientCapabilities(id) {
		return Promise.resolve(
			this.#client_capabilities.get(id) ??
				this.#invariant(id, 'Client capabilities'),
		);
	}

	/**
	 * @type {InfoSessionManager["setClientCapabilities"]}
	 */
	setClientCapabilities(id, client_capabilities) {
		this.#client_capabilities.set(id, client_capabilities);
	}

	/**
	 * @type {InfoSessionManager["getLogLevel"]}
	 */
	getLogLevel(id) {
		return Promise.resolve(
			this.#log_level.get(id) ?? this.#invariant(id, 'Log Level'),
		);
	}

	/**
	 * @type {InfoSessionManager["setLogLevel"]}
	 */
	setLogLevel(id, log_level) {
		this.#log_level.set(id, log_level);
	}

	/**
	 * @type {InfoSessionManager["getSubscriptions"]}
	 */
	getSubscriptions(uri) {
		return Promise.resolve([...(this.#subscriptions.get(uri) ?? [])]);
	}

	/**
	 * @type {InfoSessionManager["addSubscription"]}
	 */
	addSubscription(id, uri) {
		let subscriptions = this.#subscriptions.get(uri);
		if (!subscriptions) {
			subscriptions = new Set();
			this.#subscriptions.set(uri, subscriptions);
		}
		subscriptions.add(id);
	}

	/**
	 * @type {InfoSessionManager["delete"]}
	 */
	delete(id) {
		this.#subscriptions.delete(id);
		this.#log_level.delete(id);
		this.#client_capabilities.delete(id);
		this.#client_info.delete(id);
	}
}
