/** @import { SubscriptionManager } from '@tmcp/session-manager'; */

import { InMemorySubscriptionManager } from '@tmcp/session-manager';
import { env } from 'cloudflare:workers';

/** @param {unknown} namespace */
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
 * Broker-only per-request subscription fanout backed by a Durable Object.
 * @implements {SubscriptionManager}
 */
export class DurableObjectSubscriptionManager {
	#subscriptions = new InMemorySubscriptionManager();
	#binding;
	#ready;
	#socket;

	/** @param {string} [binding] */
	constructor(binding = 'TMCP_DURABLE_OBJECT') {
		this.#binding = binding;
		this.#ready = this.#connect_until_ready();
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

	async #connect() {
		const owner = crypto.randomUUID();
		const response = await this.#stub.fetch(
			new Request(
				`https://tmcp.io/subscriptions?subscription_owner=${owner}`,
				{ headers: { Upgrade: 'websocket' } },
			),
		);
		if (response.status !== 101 || !response.webSocket) {
			throw new Error(
				'Failed to establish subscription broker connection',
			);
		}
		const socket = response.webSocket;
		this.#socket = socket;
		socket.accept();
		const reconnect = () => this.#reconnect(socket);
		socket.addEventListener('close', reconnect, { once: true });
		socket.addEventListener('error', reconnect, { once: true });
		socket.addEventListener('message', ({ data }) => {
			if (typeof data !== 'string') return;
			try {
				const message = JSON.parse(data);
				if (message.type === 'send')
					void this.#subscriptions
						.send(message.notification)
						.catch(() => {});
			} catch {
				// Ignore messages not sent by the subscription broker.
			}
		});
	}

	async #connect_until_ready() {
		while (!this.#socket) {
			try {
				await this.#connect();
			} catch {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	}

	/** @param {WebSocket} socket */
	#reconnect(socket) {
		if (this.#socket !== socket) return;
		this.#socket = undefined;
		this.#ready = this.#connect_until_ready();
	}

	/** @type {SubscriptionManager['create']} */
	create(subscription, callbacks) {
		return this.#subscriptions.create(subscription, callbacks);
	}

	/** @type {SubscriptionManager['send']} */
	async send(notification) {
		await this.#ready;
		await this.#stub.sendSubscription(notification);
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
