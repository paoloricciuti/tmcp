declare module '@tmcp/transport-http' {
	import type { McpServer } from 'tmcp';
	import type { OAuth } from '@tmcp/auth';
	import type { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
	export class HttpTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>, options?: HttpTransportOptions);
		
		respond(request: Request, ctx?: TCustom): Promise<Response | null>;
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
	export type HttpTransportOptions = {
		getSessionId?: () => string;
		path?: string | null;
		oauth?: OAuth<"built">;
		cors?: CorsConfig | boolean;
		sessionManager?: {
			streams?: StreamSessionManager;
			info?: OptionalizeSessionManager<InfoSessionManager>;
		};
	};
	type ToOmit = 'removeSubscription';

	type OptionalizeSessionManager<TInfoSessionManager extends InfoSessionManager> = Omit<TInfoSessionManager, ToOmit> & Partial<Pick<TInfoSessionManager, ToOmit>>;

	export {};
}

//# sourceMappingURL=index.d.ts.map