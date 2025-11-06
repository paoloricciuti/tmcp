/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
 */

import { Client } from 'pg';

/**
 * @implements {StreamSessionManager}
 */
export class PostgresStreamSessionManager {
	#text_encoder = new TextEncoder();
	/**
	 * @type {Client}
	 */
	#client;

	/**
	 * @type {Promise<void>}
	 */
	#connected;

	/**
	 * @type {Map<string, ReturnType<setInterval> | undefined>}
	 */
	#intervals = new Map();

	/**
	 * @type {string}
	 */
	#table_name;

	/**
	 * @type {Map<string, ReadableStreamDefaultController>}
	 */
	#controllers = new Map();

	/**
	 * @param {Object} options
	 * @param {string} options.connectionString The connection string to connect to Postgres
	 * @param {string} [options.tableName] The table name to use for storing sessions, it defaults to 'tmcp_sessions'
	 * @param {boolean} [options.create] Whether to create the table if it doesn't exist, defaults to true
	 */
	constructor({
		connectionString: connection_string,
		tableName: table_name = 'tmcp_sessions',
		create = true,
	}) {
		this.#table_name = table_name;
		this.#client = new Client({ connectionString: connection_string });
		this.#connected = this.#client.connect();
		if (create) {
			this.#connected = this.#connected.then(async () => {
				await this.#client.query(
					`CREATE TABLE IF NOT EXISTS "${table_name}" (id TEXT PRIMARY KEY, updated_at TIMESTAMP DEFAULT NOW())`,
				);
			});
		}

		this.#client.on('notification', (msg) => {
			let [command, ...rest] = msg.channel.split(':');
			// this will get notifications both for `session:id` and `delete:session:id`
			// so depending on the command we either send data or close the stream and unlisten
			const notification_id = command === 'delete' ? rest[1] : rest[0];

			const controller = this.#controllers.get(notification_id);

			// if the notification id doesn't match the current session id, ignore it
			// we need to use multiple listeners because every listener will have
			if (!controller) return;

			if (command === 'delete') {
				this.#client.query(
					`DELETE FROM "${this.#table_name}" WHERE id=$1`,
					[notification_id],
				);
				this.#client.query(
					`UNLISTEN "delete:session:${notification_id}"`,
				);
				this.#client.query(`UNLISTEN "session:${notification_id}"`);
				try {
					controller.close();
				} catch {
					// could error if the controller is already closed
				}
				clearInterval(this.#intervals.get(notification_id));
				return;
			} else {
				controller.enqueue(this.#text_encoder.encode(msg.payload));
			}
		});
	}

	/**
	 * @param {string} id
	 * @param {ReadableStreamDefaultController} controller
	 */
	async create(id, controller) {
		await this.#connected;
		const expire_seconds = 7;

		await this.#client.query(
			`INSERT INTO "${this.#table_name}" (id) VALUES ($1)`,
			[id],
		);

		this.#intervals.set(
			id,
			setInterval(() => {
				this.#client.query(
					`UPDATE "${this.#table_name}" SET updated_at=NOW() WHERE id=$1`,
					[id],
				);
			}, expire_seconds * 1000),
		);

		await this.#client.query(`LISTEN "session:${id}"`);
		await this.#client.query(`LISTEN "delete:session:${id}"`);
		this.#controllers.set(id, controller);
	}

	/**
	 * @param {string} id
	 */
	async delete(id) {
		await this.#connected;
		await this.#client.query(`UNLISTEN "session:${id}"`);
		await this.#client.query(`UNLISTEN "delete:session:${id}"`);
		clearInterval(this.#intervals.get(id));
		await this.#client.query(`NOTIFY "delete:session:${id}"`);
	}

	/**
	 * @param {string} id
	 */
	async has(id) {
		await this.#connected;
		const res = await this.#client.query(
			`SELECT 1 FROM "${this.#table_name}" WHERE id=$1`,
			[id],
		);
		return (res.rowCount ?? 0) > 0;
	}

	/**
	 * @param {string[] | undefined} sessions
	 * @param {string} data
	 */
	async send(sessions, data) {
		if (sessions == null) {
			const res = await this.#client.query(
				`SELECT id FROM "${this.#table_name}" WHERE updated_at > NOW() - INTERVAL '10 seconds'`,
			);
			// cleanup old sessions...don't await this
			this.#client.query(
				`DELETE FROM "${this.#table_name}" WHERE updated_at <= NOW() - INTERVAL '10 seconds'`,
			);
			for (let row of res.rows) {
				this.#client.query(`NOTIFY "session:${row.id}", ${data}`);
			}
		} else {
			for (let session of sessions ?? []) {
				this.#client.query(`NOTIFY "session:${session}", ${data}`);
			}
		}
	}
}

/**
 * @implements {InfoSessionManager}
 */
export class PostgresInfoSessionManager {
	/**
	 * @typedef {{ clientCapabilities: string, clientInfo: string, logLevel: string, subscriptions: string }} TableNames
	 */

	/**
	 *
	 * @param {string} level
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
	 * @type {Client}
	 */
	#client;

	/**
	 * @type {Promise<void>}
	 */
	#connected;

	/**
	 * @type {TableNames}
	 */
	#table_names;

	/**
	 * @param {Object} options
	 * @param {string} options.connectionString The connection string to connect to Postgres
	 * @param {{ clientCapabilities: string, clientInfo: string, logLevel: string, subscriptions: string }} [options.tableNames] The table name to use for storing sessions, it defaults to 'tmcp_sessions'
	 * @param {boolean} [options.create] Whether to create the table if it doesn't exist, defaults to true
	 */
	constructor({
		connectionString: connection_string,
		tableNames: table_names = {
			clientCapabilities: 'tmcp_session_client_capabilities',
			clientInfo: 'tmcp_session_client_info',
			logLevel: 'tmcp_session_log_level',
			subscriptions: 'tmcp_session_subscriptions',
		},
		create = true,
	}) {
		this.#table_names = table_names;
		this.#client = new Client({ connectionString: connection_string });
		this.#connected = this.#client.connect();
		if (create) {
			this.#connected = this.#connected.then(async () => {
				for (let table_name of Object.values(table_names)) {
					await this.#client.query(
						`CREATE TABLE IF NOT EXISTS "${table_name}" (id TEXT PRIMARY KEY, value TEXT)`,
					);
				}
			});
		}
	}

	/**
	 * @type {InfoSessionManager['getClientInfo']}
	 */
	async getClientInfo(id) {
		const client_info_result = await this.#client.query(
			`SELECT value FROM ${this.#table_names.clientInfo} WHERE id=$1`,
			[id],
		);
		const client_info = client_info_result.rows[0].value;

		if (client_info != null && typeof client_info === 'string') {
			return JSON.parse(client_info);
		}

		throw new Error(`Client info not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setClientInfo"]}
	 */
	async setClientInfo(id, client_info) {
		await this.#client.query(
			`INSERT INTO ${this.#table_names.clientInfo} (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
			[id, JSON.stringify(client_info)],
		);
	}
	/**
	 * @type {InfoSessionManager["getClientCapabilities"]}
	 */
	async getClientCapabilities(id) {
		const client_capabilities_result = await this.#client.query(
			`SELECT value FROM ${this.#table_names.clientCapabilities} WHERE id=$1`,
			[id],
		);
		const client_capabilities = client_capabilities_result.rows[0].value;

		if (
			client_capabilities != null &&
			typeof client_capabilities === 'string'
		) {
			return JSON.parse(client_capabilities);
		}

		throw new Error(`Client capabilities not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setClientCapabilities"]}
	 */
	async setClientCapabilities(id, client_capabilities) {
		await this.#client.query(
			`INSERT INTO ${this.#table_names.clientCapabilities} (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
			[id, JSON.stringify(client_capabilities)],
		);
	}
	/**
	 * @type {InfoSessionManager["getLogLevel"]}
	 */
	async getLogLevel(id) {
		const log_level_result = await this.#client.query(
			`SELECT value FROM ${this.#table_names.logLevel} WHERE id=$1`,
			[id],
		);
		const log_level = log_level_result.rows[0].value;

		if (this.#is_log_level(log_level)) {
			return log_level;
		}

		throw new Error(`Log level not found for session ${id}`);
	}
	/**
	 * @type {InfoSessionManager["setLogLevel"]}
	 */
	async setLogLevel(id, log_level) {
		await this.#client.query(
			`INSERT INTO ${this.#table_names.logLevel} (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
			[id, JSON.stringify(log_level)],
		);
	}
	/**
	 * @type {InfoSessionManager["getSubscriptions"]}
	 */
	async getSubscriptions(uri) {
		const subscriptions_result = await this.#client.query(
			`SELECT id FROM ${this.#table_names.subscriptions} WHERE value=$1`,
			[uri],
		);
		const subscriptions = subscriptions_result.rows[0].value;

		if (subscriptions != null && typeof subscriptions === 'string') {
			return JSON.parse(subscriptions);
		}

		throw new Error(`Subscriptions not found for session ${uri}`);
	}
	/**
	 * @type {InfoSessionManager["addSubscription"]}
	 */
	async addSubscription(id, uri) {
		await this.#client.query(
			`INSERT INTO ${this.#table_names.subscriptions} (id, value) VALUES ($1, $2)`,
			[id, uri],
		);
	}

	/**
	 * @type {InfoSessionManager["removeSubscription"]}
	 */
	async removeSubscription(id, uri) {
		await this.#client.query(
			`DELETE FROM ${this.#table_names.subscriptions} WHERE id=$1 AND value=$2`,
			[id, uri],
		);
	}

	/**
	 * @param {string} id
	 */
	async delete(id) {
		await Promise.all([
			this.#client.query(
				`DELETE FROM ${this.#table_names.clientCapabilities} WHERE id=$1`,
				[id],
			),
			this.#client.query(
				`DELETE FROM ${this.#table_names.clientInfo} WHERE id=$1`,
				[id],
			),
			this.#client.query(
				`DELETE FROM ${this.#table_names.logLevel} WHERE id=$1`,
				[id],
			),
			this.#client.query(
				`DELETE FROM ${this.#table_names.subscriptions} WHERE value=$1`,
				[id],
			),
		]);
	}
}
