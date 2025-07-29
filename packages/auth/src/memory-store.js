/**
 * @import { OAuthClientInformationFull } from './types.js'
 * @import { OAuthRegisteredClientsStore } from './internal.js'
 */

/**
 * Simple in-memory client store for development and testing
 * @implements {OAuthRegisteredClientsStore}
 */
export class MemoryClientStore {
	/** @type {Map<string, OAuthClientInformationFull>} */
	#clients = new Map();

	/**
	 * @param {OAuthClientInformationFull[]} [initial_clients] - Initial clients to store
	 */
	constructor(initial_clients = []) {
		for (const client of initial_clients) {
			this.#clients.set(client.client_id, client);
		}
	}

	/**
	 * Get client by ID
	 * @param {string} client_id - Client ID
	 * @returns {Promise<OAuthClientInformationFull | undefined>}
	 */
	async getClient(client_id) {
		return this.#clients.get(client_id);
	}

	/**
	 * Register a new client
	 * @param {Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">} client - Client to register
	 * @returns {Promise<OAuthClientInformationFull>}
	 */
	async registerClient(client) {
		const client_id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const issued_at = Math.floor(Date.now() / 1000);

		const full_client = {
			...client,
			client_id: client_id,
			client_id_issued_at: issued_at,
		};

		this.#clients.set(client_id, full_client);
		return full_client;
	}

	/**
	 * Add a client directly (for testing/setup)
	 * @param {OAuthClientInformationFull} client - Client to add
	 */
	addClient(client) {
		this.#clients.set(client.client_id, client);
	}

	/**
	 * Remove a client
	 * @param {string} clientId - Client ID to remove
	 * @returns {boolean} True if client was removed
	 */
	removeClient(clientId) {
		return this.#clients.delete(clientId);
	}

	/**
	 * Get all clients (for debugging)
	 * @returns {OAuthClientInformationFull[]}
	 */
	getAllClients() {
		return Array.from(this.#clients.values());
	}

	/**
	 * Clear all clients
	 */
	clear() {
		this.#clients.clear();
	}
}
