export class StdioTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
    constructor(server: McpServer<any, TCustom>);
    listen(ctx?: TCustom): void;
    closeSubscription(id: string | number): boolean | Promise<boolean>;
    close(): Promise<void>;
    #private;
}
import type { McpServer } from "tmcp";
//# sourceMappingURL=index.d.ts.map