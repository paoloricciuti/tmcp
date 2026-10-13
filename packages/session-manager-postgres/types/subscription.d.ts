/**
 * Broker-only per-request subscription fanout backed by LISTEN/NOTIFY.
 */
export class PostgresSubscriptionManager implements SubscriptionManager {
    constructor({ connectionString: connection_string, tableName: table_name, create, }: {
        connectionString: string;
        tableName?: string | undefined;
        create?: boolean | undefined;
    });
    create(subscription: import("@tmcp/session-manager").Subscription, callbacks: import("@tmcp/session-manager").SubscriptionCallbacks): boolean | Promise<boolean>;
    send(notification: import("json-rpc-2.0").JSONRPCRequest): void | Promise<void>;
    close(id: string | number, origin: string, reason: "closed" | "cancelled"): boolean | Promise<boolean>;
    closeAll(origin?: string, reason?: "closed" | "cancelled"): void | Promise<void>;
    #private;
}
import type { SubscriptionManager } from '@tmcp/session-manager';
//# sourceMappingURL=subscription.d.ts.map