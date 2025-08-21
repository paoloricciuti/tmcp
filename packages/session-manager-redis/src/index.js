/**
 * @import { SessionManager } from '@tmcp/session-manager';
 */

import { createClient } from 'redis';

/**
 * @implements {SessionManager}
 */
export class RedisSessionManager {
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
		this.#client.set(`available:session:${id}`, 'active');
		this.#pub_sub_client.subscribe(`session:${id}`, (message) => {
			controller.enqueue(this.#text_encoder.encode(message));
		});
		this.#pub_sub_client.subscribe(`delete:session:${id}`, () => {
			controller.close();
			this.#client?.del(`available:session:${id}`);
		});
	}

	/**
	 * @param {string} id
	 */
	async delete(id) {
		await this.#connected;
		this.#pub_sub_client.unsubscribe(`session:${id}`);
		this.#pub_sub_client.unsubscribe(`delete:session:${id}`);
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
