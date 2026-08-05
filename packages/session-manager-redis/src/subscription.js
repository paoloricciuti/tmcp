/** @import { SubscriptionManager } from '@tmcp/session-manager'; */

import { InMemorySubscriptionManager } from '@tmcp/session-manager';
import { createClient } from 'redis';

const SUBSCRIPTION_CHANNEL = 'tmcp:subscriptions';

/**
 * Broker-only per-request subscription fanout backed by Redis Pub/Sub.
 * @implements {SubscriptionManager}
 */
export class RedisSubscriptionManager {
	#subscriptions = new InMemorySubscriptionManager();
	#client;
	#subscriber;
	#ready;

	/** @param {string} redis_url */
	constructor(redis_url) {
		this.#client = createClient({ url: redis_url });
		this.#subscriber = createClient({ url: redis_url });
		this.#client.on('error', () => {});
		this.#subscriber.on('error', () => {});
		this.#ready = Promise.all([
			this.#client.connect(),
			this.#subscriber.connect(),
		]).then(() =>
			this.#subscriber.subscribe(SUBSCRIPTION_CHANNEL, (message) => {
				try {
					void this.#subscriptions
						.send(JSON.parse(message))
						.catch(() => {});
				} catch {
					// Ignore messages not published by this manager.
				}
			}),
		);
		void this.#ready.catch(() => {});
	}

	/** @type {SubscriptionManager['create']} */
	create(subscription, callbacks) {
		return this.#subscriptions.create(subscription, callbacks);
	}

	/** @type {SubscriptionManager['send']} */
	async send(notification) {
		await this.#ready;
		await this.#client.publish(
			SUBSCRIPTION_CHANNEL,
			JSON.stringify(notification),
		);
	}

	/** @type {SubscriptionManager['close']} */
	close(id, origin, reason) {
		return this.#subscriptions.close(id, origin, reason);
	}

	/** @type {SubscriptionManager['closeAll']} */
	closeAll(origin, reason = 'cancelled') {
		return this.#subscriptions.closeAll(origin, reason);
	}
}
