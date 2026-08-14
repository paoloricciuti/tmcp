declare module '@tmcp/transport-stdio' {
	import type { McpServer } from 'tmcp';
	export class StdioTransport<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> {
		constructor(server: McpServer<any, TCustom>);

		listen(ctx?: TCustom): void;

		closeSubscription(id: string | number): boolean | Promise<boolean>;
		close(): Promise<void>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map
