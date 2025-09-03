/**
 * @import { SessionManager } from '@tmcp/session-manager';
 */

import { Client } from 'pg';

/**
 * @implements {SessionManager}
 */
export class PostgresSessionManager {
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
					`CREATE TABLE IF NOT EXISTS "${table_name}" (id TEXT PRIMARY_KEY, updated_at TIMESTAMP DEFAULT NOW())`,
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
				controller.close();
				this.#client.query(
					`DELETE FROM "${this.#table_name}" WHERE id=$1`,
					[notification_id],
				);
				this.#client.query(
					`UNLISTEN "delete:session:${notification_id}"`,
				);
				this.#client.query(`UNLISTEN "session:${notification_id}"`);
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
		const expire_seconds = 10;

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
