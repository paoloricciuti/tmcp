declare module '@tmcp/session-manager' {
    import type { Context } from 'tmcp';
    /**
     * @import { Context } from "tmcp";
     */
    /**
     * @abstract
     */
    export abstract class StreamSessionManager {
        /**
         * @abstract
         * */
        abstract create(id: string, controller: ReadableStreamDefaultController): void | Promise<void>;
        /**
         * @abstract
         * */
        abstract delete(id: string): void | Promise<void>;
        /**
         * @abstract
         * */
        abstract has(id: string): boolean | Promise<boolean>;
        /**
         * @abstract
         * */
        abstract send(sessions: string[] | undefined, data: string): void | Promise<void>;
    }
    export class InMemoryStreamSessionManager extends StreamSessionManager {
        create(id: string, controller: ReadableStreamDefaultController): void;
        delete(id: string): void;
        has(id: string): Promise<boolean>;
        send(sessions: string[] | undefined, data: string): void;
        #private;
    }
    /**
     * @abstract
     */
    export abstract class InfoSessionManager {
        /**
         * @abstract
         * */
        abstract getClientInfo(id: string): Promise<NonNullable<Context["sessionInfo"]>["clientInfo"]>;
        /**
         * @abstract
         * */
        abstract setClientInfo(id: string, client_info: NonNullable<Context["sessionInfo"]>["clientInfo"]): void;
        /**
         * @abstract
         * */
        abstract getClientCapabilities(id: string): Promise<NonNullable<Context["sessionInfo"]>["clientCapabilities"]>;
        /**
         * @abstract
         * */
        abstract setClientCapabilities(id: string, client_capabilities: NonNullable<Context["sessionInfo"]>["clientCapabilities"]): void;
        /**
         * @abstract
         * */
        abstract getLogLevel(id: string): Promise<NonNullable<Context["sessionInfo"]>["logLevel"]>;
        /**
         * @abstract
         * */
        abstract setLogLevel(id: string, log_level: NonNullable<Context["sessionInfo"]>["logLevel"]): void;
        /**
         * @abstract
         * */
        abstract getSubscriptions(uri: string): Promise<string[]>;
        /**
         * @abstract
         * */
        abstract addSubscription(id: string, uri: string): void;
        /**
         * @abstract
         * */
        abstract delete(id: string): void;
    }
    export class InMemoryInfoSessionManager extends InfoSessionManager {
        #private;
    }
    export {};
}
//# sourceMappingURL=index.d.ts.map
