declare module '@tmcp/session-manager-durable-objects' {
	import type { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
	import type { DurableObject } from 'cloudflare:workers';
	export class DurableObjectStreamSessionManager implements StreamSessionManager {
		
		constructor(binding?: string);
		
		create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
		
		delete(id: string): Promise<void>;
		
		has(id: string): Promise<boolean>;
		
		send(sessions: undefined | string[], data: unknown): Promise<void>;
		#private;
	}

	export class KVInfoSessionManager implements InfoSessionManager {
		
		constructor(binding?: string);
		getClientInfo(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]>;
		setClientInfo(id: string, client_info: NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]): void;
		getClientCapabilities(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]>;
		setClientCapabilities(id: string, client_capabilities: NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]): void;
		getLogLevel(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]>;
		setLogLevel(id: string, log_level: NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]): void;
		getSubscriptions(uri: string): Promise<string[]>;
		addSubscription(id: string, uri: string): void;
		removeSubscription(id: string, uri: string): void;
		delete(id: string): void;
		#private;
	}
	/**
	 * WebSocket Hibernation Server using Cloudflare Durable Objects
	 *
	 * This class manages WebSocket connections that can hibernate when inactive,
	 * allowing the Durable Object to be evicted from memory while keeping
	 * connections open. When a message is received, the DO is recreated and
	 * the connection state is restored.
	 *
	 */
	export class SyncLayer extends DurableObject<any, any> {
		/**
		 * Creates a new WebSocketHibernationServer instance
		 *
		 * @param ctx - The Durable Object state context
		 * @param env - Environment variables and bindings
		 */
		constructor(ctx: DurableObjectState, env: Cloudflare.Env);
		
		has(id: string): Promise<boolean>;
		
		delete(id: string): Promise<void>;
		
		broadcast(sessions: string[] | undefined, payload: any): Promise<void>;
		/**
		 * Handles incoming HTTP requests and upgrades them to WebSocket connections
		 *
		 * @param request - The incoming HTTP request
		 * @returns Response with WebSocket upgrade or error
		 */
		fetch(request: Request): Promise<Response>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map