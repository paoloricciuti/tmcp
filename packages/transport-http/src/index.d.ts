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
     * @returns {Promise<Response | null>}
     */
    respond(request: Request): Promise<Response | null>;
    #private;
}
export type HttpTransportOptions = {
    getSessionId?: () => string;
    path?: string;
};
import type { McpServer } from "tmcp";
