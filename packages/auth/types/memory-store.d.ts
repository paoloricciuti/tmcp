/**
 * Simple in-memory client store for development and testing
 */
export class MemoryClientStore implements OAuthRegisteredClientsStore {
    /**
     * @param [initial_clients] - Initial clients to store
     */
    constructor(initial_clients?: OAuthClientInformationFull[]);
    /**
     * Get client by ID
     * @param client_id - Client ID
     */
    getClient(client_id: string): Promise<OAuthClientInformationFull | undefined>;
    /**
     * Register a new client
     * @param client - Client to register
     */
    registerClient(client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">): Promise<OAuthClientInformationFull>;
    /**
     * Add a client directly (for testing/setup)
     * @param client - Client to add
     */
    addClient(client: OAuthClientInformationFull): void;
    /**
     * Remove a client
     * @param clientId - Client ID to remove
     * @returns True if client was removed
     */
    removeClient(clientId: string): boolean;
    /**
     * Get all clients (for debugging)
     */
    getAllClients(): OAuthClientInformationFull[];
    /**
     * Clear all clients
     */
    clear(): void;
    #private;
}
import type { OAuthRegisteredClientsStore } from './internal.js';
import type { OAuthClientInformationFull } from './types.js';
//# sourceMappingURL=memory-store.d.ts.map