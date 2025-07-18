/**
 * @import { McpServer } from "tmcp";
 */
/**
 * @typedef {{
 * 	getSessionId?: () => string
 * 	path?: string
 * 	endpoint?: string
 * }} SseTransportOptions
 */
export class SseTransport {
    /**
     * @param {McpServer<any>} server
     * @param {SseTransportOptions} [options]
     */
    constructor(server: McpServer<any>, options?: SseTransportOptions);
    /**
     * @param {Request} request
     * @returns {Promise<Response | null>}
     */
    respond(request: Request): Promise<Response | null>;
    /**
     * Close all active sessions
     */
    close(): void;
    #private;
}
export type SseTransportOptions = {
    getSessionId?: () => string;
    path?: string;
    endpoint?: string;
};
import type { McpServer } from "tmcp";
