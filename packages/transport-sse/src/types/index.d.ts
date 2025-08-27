declare module '@tmcp/transport-sse' {
	import type { McpServer } from 'tmcp';
	import type { OAuth } from '@tmcp/auth';
	import type { SessionManager } from '@tmcp/session-manager';
	export class SseTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>, options?: SseTransportOptions);
		
		respond(request: Request, ctx?: TCustom): Promise<Response | null>;
		/**
		 * Close all active sessions
		 */
		close(): void;
		#private;
	}
	export type CorsConfig = {
		origin?: string | string[] | boolean;
		methods?: string[];
		allowedHeaders?: string[];
		exposedHeaders?: string[];
		credentials?: boolean;
		maxAge?: number;
	};
	export type SseTransportOptions = {
		getSessionId?: () => string;
		path?: string;
		endpoint?: string;
		oauth?: OAuth<"built">;
		cors?: CorsConfig | boolean;
		sessionManager?: SessionManager;
	};

	export {};
}

//# sourceMappingURL=index.d.ts.map