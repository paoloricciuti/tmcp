declare module '@tmcp/session-manager-durable-objects' {
	import type { SessionManager } from '@tmcp/session-manager';
	import type { DurableObject } from 'cloudflare:workers';
	export class DurableObjectSessionManager implements SessionManager {
		
		constructor(binding?: string);
		
		create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
		
		delete(id: string): Promise<void>;
		
		has(id: string): Promise<boolean>;
		
		send(sessions: undefined | string[], data: unknown): Promise<void>;
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
	export class SyncLayer extends DurableObject<any> {
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