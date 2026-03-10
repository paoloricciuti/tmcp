declare module '@tmcp/transport-cli' {
	import type { McpServer } from 'tmcp';
	export class CliTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>);
		/**
		 * Starts the CLI. Initializes the MCP session, lists tools,
		 * builds yargs commands from the tool definitions, and parses argv.
		 * 
		 */
		run(ctx?: TCustom, argv?: Array<string>): Promise<void>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map