/* eslint-disable no-unused-vars */

/**
 * @abstract
 */
export class SessionManager {
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

export class InMemorySessionManager extends SessionManager {
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
			controller.close();
			this.#sessions.delete(id);
		}
	}

	/**
	 * @abstract
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
