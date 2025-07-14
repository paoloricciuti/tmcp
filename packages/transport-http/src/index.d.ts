/**
 * @import { McpServer, ClientCapabilities } from "tmcp";
 */
/**
 * @typedef {{
 * 	getSessionId: () => string
 * }} HttpTransportOptions
 */
export class HttpTransport {
    /**
     *
     * @param {McpServer<any>} server
     * @param {HttpTransportOptions} [options]
     */
    constructor(server: McpServer<any>, options?: HttpTransportOptions);
    /**
     *
     * @param {Request} request
     * @returns
     */
    respond(request: Request): Promise<Response>;
    #private;
}
export type HttpTransportOptions = {
    getSessionId: () => string;
};
import type { McpServer } from "tmcp";
