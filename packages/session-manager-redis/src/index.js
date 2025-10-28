/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
 */

import { createClient } from 'redis';

/**
 * @implements {StreamSessionManager}
 */
export class RedisStreamSessionManager {
	#text_encoder = new TextEncoder();
	/**
	 * @type {ReturnType<typeof createClient>}
	 */
	#pub_sub_client;

	/**
	 * @type {ReturnType<typeof createClient>}
	 */
	#client;

	/**
	 * @type {Promise<unknown>}
	 */
	#connected;

	/**
	 * @type {ReturnType<setInterval> | undefined}
	 */
	#interval;

	/**
	 * @param {string} redis_url
	 */
	constructor(redis_url) {
		this.#pub_sub_client = createClient({ url: redis_url });
		this.#client = createClient({ url: redis_url });
		this.#connected = Promise.all([
			this.#pub_sub_client.connect(),
			this.#client.connect(),
		]);
	}

	/**
	 * @param {string} id
	 * @param {ReadableStreamDefaultController} controller
	 */
	async create(id, controller) {
		await this.#connected;
		const available_key = `available:session:${id}`;
		const expire_seconds = 10;
		this.#client.set(available_key, 'active');

		// we set the expiration to 10 seconds and we constantly refresh it
		// to keep the session alive as long as it is being used
		// this is to prevent hanging sessions in case the server abruptly stops
		this.#client.expire(available_key, expire_seconds);
		this.#interval = setInterval(() => {
			this.#client.expire(available_key, expire_seconds);
		}, expire_seconds * 1000);

		this.#pub_sub_client.subscribe(`session:${id}`, (message) => {
			controller.enqueue(this.#text_encoder.encode(message));
		});
		this.#pub_sub_client.subscribe(`delete:session:${id}`, () => {
			this.#client?.del(`available:session:${id}`);
			clearInterval(this.#interval);
			try {
				controller.close();
			} catch {
				// could error if the controller is already closed
			}
		});
	}

	/**
	 * @param {string} id
	 */
	async delete(id) {
		await this.#connected;
		this.#pub_sub_client.unsubscribe(`session:${id}`);
		this.#pub_sub_client.unsubscribe(`delete:session:${id}`);
		clearInterval(this.#interval);
		this.#pub_sub_client.publish(`delete:session:${id}`, '');
	}

	/**
	 * @param {string} id
	 */
	async has(id) {
		await this.#connected;
		return (await this.#client.get(`available:session:${id}`)) !== null;
	}

	/**
	 * @param {string[] | undefined} sessions
	 * @param {string} data
	 */
	async send(sessions, data) {
		if (sessions == null) {
			for await (const keys of this.#client.scanIterator({
				TYPE: 'string',
				MATCH: 'available:session:*',
			})) {
				for (let key of keys) {
					this.#pub_sub_client?.publish(
						key.replace('available:', ''),
						data,
					);
				}
			}
		} else {
			for (let session of sessions ?? []) {
				this.#pub_sub_client?.publish(`session:${session}`, data);
			}
		}
	}
}

/**
 * @implements {InfoSessionManager}
 */
export class RedisInfoSessionManager {
	/**
	 * @type {ReturnType<typeof createClient>}
	 */
	#client;

	/**
	 * @type {Promise<unknown>}
	 */
	#connected;

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
	 * @param {string} redis_url
	 */
	constructor(redis_url) {
		this.#client = createClient({ url: redis_url });
		this.#connected = this.#client.connect();
	}

	/**
	 * @type {InfoSessionManager['getClientInfo']}
	 */
	async getClientInfo(id) {
		await this.#connected;
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
		await this.#connected;
		await this.#client.set(
			`tmcp:client_info:${id}`,
			JSON.stringify(client_info),
		);
	}
	/**
	 * @type {InfoSessionManager["getClientCapabilities"]}
	 */
	async getClientCapabilities(id) {
		await this.#connected;
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
		await this.#connected;
		await this.#client.set(
			`tmcp:client_capabilities:${id}`,
			JSON.stringify(client_capabilities),
		);
	}
	/**
	 * @type {InfoSessionManager["getLogLevel"]}
	 */
	async getLogLevel(id) {
		await this.#connected;
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
		await this.#connected;
		await this.#client.set(
			`tmcp:log_level:${id}`,
			JSON.stringify(log_level),
		);
	}
	/**
	 * @type {InfoSessionManager["getSubscriptions"]}
	 */
	async getSubscriptions(uri) {
		await this.#connected;
		const subscriptions = await this.#client.sMembers(
			`tmcp:subscriptions:${uri}`,
		);
		if (subscriptions != null) {
			return subscriptions;
		}

		throw new Error(`Subscriptions not found for session ${uri}`);
	}
	/**
	 * @type {InfoSessionManager["addSubscription"]}
	 */
	async addSubscription(id, uri) {
		await this.#connected;
		await this.#client.sAdd(`tmcp:subscriptions:${uri}`, id);
	}

	/**
	 * @param {string} id
	 */
	async #remove_id_from_subscriptions(id) {
		await this.#connected;
		for await (const keys of this.#client.scanIterator({
			TYPE: 'set',
			MATCH: 'tmcp:subscriptions:*',
		})) {
			for (let key of keys) {
				await this.#client.sRem(key, id);
			}
		}
	}

	/**
	 * @type {InfoSessionManager["delete"]}
	 */
	async delete(id) {
		await this.#connected;
		await Promise.all([
			this.#client.del(`tmcp:client_info:${id}`),
			this.#client.del(`tmcp:client_capabilities:${id}`),
			this.#client.del(`tmcp:log_level:${id}`),
			this.#remove_id_from_subscriptions(id),
		]);
	}
}
