declare module '@tmcp/session-manager-redis' {
	import type { SessionManager } from '@tmcp/session-manager';
	export class RedisSessionManager implements SessionManager {
		
		constructor(redis_url: string);
		
		create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
		
		delete(id: string): Promise<void>;
		
		has(id: string): Promise<boolean>;
		
		send(sessions: string[] | undefined, data: string): Promise<void>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map