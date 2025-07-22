declare module '@tmcp/transport-sse' {
	import type { McpServer } from 'tmcp';
	/**
	 * @import { McpServer } from "tmcp";
	 */

	export class SseTransport {
		
		constructor(server: McpServer<any>, options?: SseTransportOptions);
		
		respond(request: Request): Promise<Response | null>;
		/**
		 * Close all active sessions
		 */
		close(): void;
		#private;
	}
	export type SseTransportOptions = {
		getSessionId?: () => string;
		path?: string;
		endpoint?: string;
	};

	export {};
}

//# sourceMappingURL=index.d.ts.map