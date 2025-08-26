declare module '@tmcp/session-manager' {
    /**
     * @abstract
     */
    export abstract class SessionManager {
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
    export class InMemorySessionManager extends SessionManager {
        create(id: string, controller: ReadableStreamDefaultController): void;
        delete(id: string): void;
        /**
         * @abstract
         * */
        abstract has(id: string): Promise<boolean>;
        send(sessions: string[] | undefined, data: string): void;
        #private;
    }
    export {};
}
//# sourceMappingURL=index.d.ts.map
