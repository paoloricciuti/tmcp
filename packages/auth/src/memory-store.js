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
	 * @param {OAuthClientInformationFull[]} [initialClients] - Initial clients to store
	 */
	constructor(initialClients = []) {
		for (const client of initialClients) {
			this.#clients.set(client.client_id, client);
		}
	}

	/**
	 * Get client by ID
	 * @param {string} clientId - Client ID
	 * @returns {Promise<OAuthClientInformationFull | undefined>}
	 */
	async getClient(clientId) {
		return this.#clients.get(clientId);
	}

	/**
	 * Register a new client
	 * @param {Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">} client - Client to register
	 * @returns {Promise<OAuthClientInformationFull>}
	 */
	async registerClient(client) {
		const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const issuedAt = Math.floor(Date.now() / 1000);
		
		const fullClient = {
			...client,
			client_id: clientId,
			client_id_issued_at: issuedAt
		};

		this.#clients.set(clientId, fullClient);
		return fullClient;
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