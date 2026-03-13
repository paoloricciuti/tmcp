declare module '@tmcp/transport-cli' {
	import type { McpServer } from 'tmcp';
	export class CliTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>);
		
		run(ctx?: TCustom, argv?: Array<string>): Promise<void>;
		#private;
	}
	export type OutputMode = "full" | "structured" | "content" | "text";
	export type ToolOptions = {
		output?: OutputMode;
		fields?: string;
	};

	export {};
}

//# sourceMappingURL=index.d.ts.map