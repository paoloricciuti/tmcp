/* eslint-disable no-unused-vars */

/**
 * @import { Context, SubscriptionFilter } from "tmcp";
 * @import { JSONRPCRequest } from "json-rpc-2.0";
 */

/**
 * @typedef {{ id: string | number, origin: string, filters: SubscriptionFilter }} Subscription
 * @typedef {{ acknowledge: () => void | Promise<void>, send: (notification: JSONRPCRequest) => void | Promise<void>, close: (reason: 'closed' | 'cancelled') => void | Promise<void> }} SubscriptionCallbacks
 */

/**
 * Determine whether a notification belongs on a subscription stream.
 * Distributed managers can use this directly or maintain equivalent indexes.
 * @param {SubscriptionFilter} filters
 * @param {JSONRPCRequest} notification
 */
export function matchesSubscription(filters, notification) {
	if (notification.method === 'notifications/tools/list_changed') {
		return filters.toolsListChanged === true;
	}
	if (notification.method === 'notifications/prompts/list_changed') {
		return filters.promptsListChanged === true;
	}
	if (notification.method === 'notifications/resources/list_changed') {
		return filters.resourcesListChanged === true;
	}
	if (notification.method === 'notifications/resources/updated') {
		const uri = /** @type {Record<string, unknown> | undefined} */ (
			notification.params
		)?.uri;
		return (
			typeof uri === 'string' &&
			filters.resourceSubscriptions?.includes(uri) === true
		);
	}
	return false;
}

/**
 * Routes notifications to long-lived per-request subscription streams.
 * Callbacks remain local to the process serving the response stream. Brokered
 * implementations can distribute notifications without persisting descriptors.
 * @abstract
 */
export class SubscriptionManager {
	/**
	 * @abstract
	 * Atomically register a subscription. Matching notifications must be
	 * buffered until acknowledgement completes and then delivered in order.
	 * @param {Subscription} subscription
	 * @param {SubscriptionCallbacks} callbacks
	 * @returns {boolean | Promise<boolean>}
	 */
	create(subscription, callbacks) {
		void subscription;
		void callbacks;
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * @param {JSONRPCRequest} notification
	 * @returns {void | Promise<void>}
	 */
	send(notification) {
		void notification;
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * Request closure of one subscription. Implementations must preserve the
	 * JSON-RPC ID type when identifying a registration.
	 * @param {string | number} id
	 * @param {string} origin
	 * @param {'closed' | 'cancelled'} reason
	 * @returns {boolean | Promise<boolean>}
	 */
	close(id, origin, reason) {
		void id;
		void origin;
		void reason;
		throw new Error('Method not implemented.');
	}

	/**
	 * @abstract
	 * Close every subscription, optionally limited to one transport origin.
	 * @param {string} [origin]
	 * @param {'closed' | 'cancelled'} [reason]
	 * @returns {void | Promise<void>}
	 */
	closeAll(origin, reason = 'cancelled') {
		void origin;
		void reason;
		throw new Error('Method not implemented.');
	}
}

/**
 * Process-local subscription manager. Distributed implementations should
 * mirror its acknowledgement buffering and per-subscription ordering.
 */
export class InMemorySubscriptionManager extends SubscriptionManager {
	/** @type {Map<string, Map<string | number, { subscription: Subscription, callbacks: SubscriptionCallbacks, queue: Promise<'active' | 'failed'>, close_promise?: Promise<boolean> }>>} */
	#subscriptions = new Map();

	/**
	 * @param {{ subscription: Subscription, callbacks: SubscriptionCallbacks, queue: Promise<'active' | 'failed'>, close_promise?: Promise<boolean> }} record
	 * @param {JSONRPCRequest} notification
	 */
	#enqueue(record, notification) {
		const delivery = record.queue.then(async (state) => {
			if (state === 'failed' || record.close_promise) return state;
			await record.callbacks.send(notification);
			return /** @type {const} */ ('active');
		});
		// A failed send rejects its caller without poisoning later queue entries.
		record.queue = delivery.catch(() => 'active');
		return delivery.then(() => {});
	}

	/**
	 * @param {Subscription} subscription
	 * @param {SubscriptionCallbacks} callbacks
	 * @returns {Promise<boolean>}
	 */
	async create(subscription, callbacks) {
		let subscriptions = this.#subscriptions.get(subscription.origin);
		if (!subscriptions) {
			subscriptions = new Map();
			this.#subscriptions.set(subscription.origin, subscriptions);
		}
		if (subscriptions.has(subscription.id)) return false;
		/** @type {(value?: void) => void} */
		let resolve_acknowledgement = () => {};
		/** @type {(reason?: unknown) => void} */
		let reject_acknowledgement = () => {};
		const acknowledge_promise = new Promise((resolve, reject) => {
			resolve_acknowledgement = resolve;
			reject_acknowledgement = reject;
		});
		/** @type {{ subscription: Subscription, callbacks: SubscriptionCallbacks, queue: Promise<'active' | 'failed'>, close_promise?: Promise<boolean> }} */
		const record = {
			subscription,
			callbacks,
			// Starting behind acknowledgement replaces both active and pending state.
			queue: acknowledge_promise.then(
				() => /** @type {const} */ ('active'),
				() => /** @type {const} */ ('failed'),
			),
		};
		subscriptions.set(subscription.id, record);
		try {
			Promise.resolve(callbacks.acknowledge()).then(
				resolve_acknowledgement,
				reject_acknowledgement,
			);
		} catch (error) {
			reject_acknowledgement(error);
		}
		try {
			await acknowledge_promise;
			if (record.close_promise) return true;
			await record.queue;
			return true;
		} catch (error) {
			if (!record.close_promise) {
				subscriptions.delete(subscription.id);
				if (subscriptions.size === 0) {
					this.#subscriptions.delete(subscription.origin);
				}
			}
			throw error;
		}
	}

	/**
	 * @param {JSONRPCRequest} notification
	 * @returns {Promise<void>}
	 */
	async send(notification) {
		/** @type {Promise<void>[]} */
		const deliveries = [];
		for (const subscriptions of this.#subscriptions.values()) {
			for (const record of subscriptions.values()) {
				if (
					record.close_promise ||
					!matchesSubscription(
						record.subscription.filters,
						notification,
					)
				) {
					continue;
				}
				deliveries.push(this.#enqueue(record, notification));
			}
		}
		await Promise.all(deliveries);
	}

	/**
	 * @param {string | number} id
	 * @param {string} origin
	 * @param {'closed' | 'cancelled'} reason
	 * @returns {Promise<boolean>}
	 */
	async close(id, origin, reason) {
		const subscriptions = this.#subscriptions.get(origin);
		if (!subscriptions) return false;
		const record = subscriptions.get(id);
		if (!record) return false;
		if (record.close_promise) return record.close_promise;

		record.close_promise = (async () => {
			try {
				await record.queue;
				await record.callbacks.close(reason);
				return true;
			} finally {
				if (subscriptions.get(id) === record) subscriptions.delete(id);
				if (subscriptions.size === 0)
					this.#subscriptions.delete(origin);
			}
		})();
		return record.close_promise;
	}

	/**
	 * @param {string} [origin]
	 * @param {'closed' | 'cancelled'} [reason]
	 * @returns {Promise<void>}
	 */
	async closeAll(origin, reason = 'cancelled') {
		/** @type {Array<[string | number, string]>} */
		const registrations = [];
		for (const [stored_origin, subscriptions] of this.#subscriptions) {
			if (origin !== undefined && stored_origin !== origin) continue;
			for (const id of subscriptions.keys()) {
				registrations.push([id, stored_origin]);
			}
		}
		await Promise.all(
			registrations.map(([id, stored_origin]) =>
				this.close(id, stored_origin, reason),
			),
		);
	}
}

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
				try {
					controller.enqueue(this.#text_encoder.encode(data));
				} catch {
					this.#sessions.delete(id);
				}
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
	 * @param {string} uri
	 */
	removeSubscription(id, uri) {
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
	 * @type {InfoSessionManager["removeSubscription"]}
	 */
	removeSubscription(id, uri) {
		let subscriptions = this.#subscriptions.get(uri);
		if (subscriptions) {
			subscriptions.delete(id);
		}
	}

	/**
	 * @type {InfoSessionManager["delete"]}
	 */
	delete(id) {
		for (const [uri, subscriptions] of this.#subscriptions) {
			subscriptions.delete(id);
			if (subscriptions.size === 0) this.#subscriptions.delete(uri);
		}
		this.#log_level.delete(id);
		this.#client_capabilities.delete(id);
		this.#client_info.delete(id);
	}
}
