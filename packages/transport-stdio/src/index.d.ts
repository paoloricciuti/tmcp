export class StdioTransport {
    /**
     *
     * @param {McpServer<any>} server
     */
    constructor(server: McpServer<any>);
    listen(): void;
    #private;
}
import type { McpServer } from "tmcp";
