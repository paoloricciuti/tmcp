declare module '@tmcp/transport-http' {
	import type { McpServer } from 'tmcp';
	import type { OAuth } from '@tmcp/auth';
	import type {
		StreamSessionManager,
		InfoSessionManager,
		SubscriptionManager,
	} from '@tmcp/session-manager';
	export class HttpTransport<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> {
		constructor(
			server: McpServer<any, TCustom>,
			options?: HttpTransportOptions,
		);
		/**
		 * Gracefully complete one active per-request subscription.
		 * */
		closeSubscription(response: Response): Promise<boolean>;
		/**
		 * Close every active per-request subscription owned by this transport.
		 */
		close(): Promise<void>;

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
		oauth?: OAuth<'built'>;
		cors?: CorsConfig | boolean;
		allowedOrigins?: string | string[] | true;
		sessionManager?: {
			streams?: StreamSessionManager;
			info?: OptionalizeSessionManager<InfoSessionManager>;
		};
		subscriptionManager?: SubscriptionManager;
		disableSse?: boolean;
	};
	export type SubscriptionRegistration = {
		promise: Promise<boolean>;
		resolve: (registered: boolean) => void;
	};
	export type SubscriptionSink = {
		controller?: ReadableStreamDefaultController;
		state: 'open' | 'cancelled' | 'disconnected';
		signal?: AbortSignal;
		subscription?: {
			id: string | number;
			registration: SubscriptionRegistration;
		};
	};
	type ToOmit = 'removeSubscription';

	type OptionalizeSessionManager<
		TInfoSessionManager extends InfoSessionManager,
	> = Omit<TInfoSessionManager, ToOmit> &
		Partial<Pick<TInfoSessionManager, ToOmit>>;

	export {};
}

//# sourceMappingURL=index.d.ts.map
