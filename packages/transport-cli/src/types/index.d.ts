declare module '@tmcp/transport-cli' {
	import type { McpServer } from 'tmcp';
	import type { default as sade } from 'sade';
	export class CliTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>, options?: CliTransportOptions);
		
		run(ctx?: TCustom, argv?: Array<string>): Promise<void>;
		#private;
	}
	export type OutputMode = "full" | "structured" | "content" | "text";
	export type ToolOptions = {
		output?: OutputMode;
		fields?: string;
	};
	export type CliTransportOptions = {
		/**
		 * Hook invoked with the configured `sade` instance after built-in commands and tool aliases have been registered, but before parsing. Use it to add custom commands, set a version, examples, etc.
		 */
		setup?: ((prog: sade.Sade) => void) | undefined;
	};

	export {};
}

//# sourceMappingURL=index.d.ts.map