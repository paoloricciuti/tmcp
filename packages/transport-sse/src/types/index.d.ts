declare module '@tmcp/transport-sse' {
	import type { McpServer } from 'tmcp';
	import type { OAuth } from '@tmcp/auth';
	/**
	 * @import { AuthInfo, McpServer } from "tmcp";
	 * @import { OAuth } from "@tmcp/auth";
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
		oauth?: OAuth<"built">;
	};

	export {};
}

//# sourceMappingURL=index.d.ts.map