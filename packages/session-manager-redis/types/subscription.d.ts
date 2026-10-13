/**
 * Broker-only per-request subscription fanout backed by Redis Pub/Sub.
 */
export class RedisSubscriptionManager implements SubscriptionManager {
    constructor(redis_url: string);
    create(subscription: import("@tmcp/session-manager").Subscription, callbacks: import("@tmcp/session-manager").SubscriptionCallbacks): boolean | Promise<boolean>;
    send(notification: Parameters<SubscriptionManager["send"]>[0]): Promise<void>;
    close(id: string | number, origin: string, reason: "closed" | "cancelled"): boolean | Promise<boolean>;
    closeAll(origin?: string, reason?: "closed" | "cancelled"): void | Promise<void>;
    #private;
}
import type { SubscriptionManager } from '@tmcp/session-manager';
//# sourceMappingURL=subscription.d.ts.map