/** @import { SubscriptionManager } from '@tmcp/session-manager'; */

import { InMemorySubscriptionManager } from '@tmcp/session-manager';
import { Client } from 'pg';

const SUBSCRIPTION_CHANNEL = 'tmcp_subscription_messages';
const MAX_INLINE_NOTIFICATION_BYTES = 7000;

/** @param {string} identifier */
function quote_identifier(identifier) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * Broker-only per-request subscription fanout backed by LISTEN/NOTIFY.
 * @implements {SubscriptionManager}
 */
export class PostgresSubscriptionManager {
	#subscriptions = new InMemorySubscriptionManager();
	/** @type {Client | undefined} */
	#client;
	/** @type {Promise<void>} */
	#ready;
	/** @type {string} */
	#table_name;
	#delivery_queue = Promise.resolve();
	#text_encoder = new TextEncoder();
	/** @type {string} */
	#connection_string;
	/** @type {boolean} */
	#create;

	/**
	 * @param {Object} options
	 * @param {string} options.connectionString
	 * @param {string} [options.tableName]
	 * @param {boolean} [options.create]
	 */
	constructor({
		connectionString: connection_string,
		tableName: table_name = 'tmcp_subscription_messages',
		create = true,
	}) {
		this.#table_name = table_name;
		this.#connection_string = connection_string;
		this.#create = create;
		this.#ready = this.#connect_until_ready();
	}

	get #active_client() {
		if (!this.#client) throw new Error('PostgreSQL broker is reconnecting');
		return this.#client;
	}

	async #connect() {
		const client = new Client({
			connectionString: this.#connection_string,
		});
		this.#client = client;
		client.on('error', () => this.#reconnect(client));
		client.on('notification', (message) => {
			if (
				message.channel !== SUBSCRIPTION_CHANNEL ||
				typeof message.payload !== 'string'
			)
				return;
			this.#delivery_queue = this.#delivery_queue
				.then(async () => {
					const envelope = JSON.parse(message.payload);
					if (envelope.notification !== undefined) {
						await this.#subscriptions.send(envelope.notification);
						return;
					}
					if (typeof envelope.id !== 'string') return;
					const result = await client.query(
						`SELECT value FROM ${quote_identifier(this.#table_name)} WHERE id=$1`,
						[envelope.id],
					);
					if (typeof result.rows[0]?.value !== 'string') return;
					await this.#subscriptions.send(
						JSON.parse(result.rows[0].value),
					);
				})
				.catch(() => {});
		});
		await client.connect();
		if (this.#create)
			await client.query(
				`CREATE TABLE IF NOT EXISTS ${quote_identifier(this.#table_name)} (id TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW())`,
			);
		await client.query(`LISTEN ${quote_identifier(SUBSCRIPTION_CHANNEL)}`);
	}

	async #connect_until_ready() {
		while (!this.#client) {
			try {
				await this.#connect();
			} catch {
				this.#client = undefined;
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	}

	/** @param {Client} client */
	#reconnect(client) {
		if (this.#client !== client) return;
		this.#client = undefined;
		this.#ready = this.#connect_until_ready();
	}

	/** @type {SubscriptionManager['create']} */
	create(subscription, callbacks) {
		return this.#subscriptions.create(subscription, callbacks);
	}

	/** @type {SubscriptionManager['send']} */
	async send(notification) {
		await this.#ready;
		const value = JSON.stringify(notification);
		let payload = JSON.stringify({ notification });
		if (
			this.#text_encoder.encode(payload).byteLength >
			MAX_INLINE_NOTIFICATION_BYTES
		) {
			const id = crypto.randomUUID();
			await this.#active_client.query(
				`DELETE FROM ${quote_identifier(this.#table_name)} WHERE created_at <= NOW() - INTERVAL '1 hour'`,
			);
			await this.#active_client.query(
				`INSERT INTO ${quote_identifier(this.#table_name)} (id, value) VALUES ($1, $2)`,
				[id, value],
			);
			payload = JSON.stringify({ id });
		}
		await this.#active_client.query('SELECT pg_notify($1, $2)', [
			SUBSCRIPTION_CHANNEL,
			payload,
		]);
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
