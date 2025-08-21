declare module '@tmcp/session-manager' {
    /**
     * @abstract
     */
    export abstract class SessionManager {
        /**
         * @abstract
         * */
        abstract create(id: string, controller: ReadableStreamDefaultController): void;
        /**
         * @abstract
         * */
        abstract delete(id: string): void;
        /**
         * @abstract
         * */
        abstract has(id: string): Promise<boolean>;
        /**
         * @abstract
         * */
        abstract send(sessions: string[] | undefined, data: string): void;
    }
    export class InMemorySessionManager extends SessionManager {
        #private;
    }
    export {};
}
//# sourceMappingURL=index.d.ts.map
