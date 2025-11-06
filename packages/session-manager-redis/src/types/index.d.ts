declare module '@tmcp/session-manager-redis' {
	import type { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
	export class RedisStreamSessionManager implements StreamSessionManager {
		
		constructor(redis_url: string);
		
		create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
		
		delete(id: string): Promise<void>;
		
		has(id: string): Promise<boolean>;
		
		send(sessions: string[] | undefined, data: string): Promise<void>;
		#private;
	}

	export class RedisInfoSessionManager implements InfoSessionManager {
		
		constructor(redis_url: string);
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

	export {};
}

//# sourceMappingURL=index.d.ts.map