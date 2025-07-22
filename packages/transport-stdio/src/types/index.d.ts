declare module '@tmcp/transport-stdio' {
	import type { McpServer } from 'tmcp';
	export class StdioTransport {
		
		constructor(server: McpServer<any>);
		listen(): void;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map