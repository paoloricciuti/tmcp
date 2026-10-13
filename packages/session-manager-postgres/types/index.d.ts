export { PostgresSubscriptionManager } from "./subscription.js";
export class PostgresStreamSessionManager implements StreamSessionManager {
    /**
     * @param options.connectionString The connection string to connect to Postgres
     * @param [options.tableName] The table name to use for storing sessions, it defaults to 'tmcp_sessions'
     * @param [options.create] Whether to create the table if it doesn't exist, defaults to true
     */
    constructor({ connectionString: connection_string, tableName: table_name, create, }: {
        connectionString: string;
        tableName?: string | undefined;
        create?: boolean | undefined;
    });
    create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
    delete(id: string): Promise<void>;
    has(id: string): Promise<boolean>;
    send(sessions: string[] | undefined, data: string): Promise<void>;
    #private;
}
export class PostgresInfoSessionManager implements InfoSessionManager {
    /**
     * @param options.connectionString The connection string to connect to Postgres
     * @param [options.tableNames] The table name to use for storing sessions, it defaults to 'tmcp_sessions'
     * @param [options.create] Whether to create the table if it doesn't exist, defaults to true
     */
    constructor({ connectionString: connection_string, tableNames: table_names, create, }: {
        connectionString: string;
        tableNames?: {
            clientCapabilities: string;
            clientInfo: string;
            logLevel: string;
            subscriptions: string;
        } | undefined;
        create?: boolean | undefined;
    });
    getClientInfo(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]>;
    setClientInfo(id: string, client_info: NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]): void;
    getClientCapabilities(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]>;
    setClientCapabilities(id: string, client_capabilities: NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]): void;
    getLogLevel(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]>;
    setLogLevel(id: string, log_level: NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]): void;
    getSubscriptions(uri: string): Promise<string[]>;
    addSubscription(id: string, uri: string): void;
    removeSubscription(id: string, uri: string): void;
    delete(id: string): Promise<void>;
    #private;
}
import type { StreamSessionManager } from '@tmcp/session-manager';
import type { InfoSessionManager } from '@tmcp/session-manager';
//# sourceMappingURL=index.d.ts.map