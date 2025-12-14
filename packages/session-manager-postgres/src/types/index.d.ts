declare module '@tmcp/session-manager-postgres' {
	import type { StreamSessionManager, InfoSessionManager } from '@tmcp/session-manager';
	export class PostgresStreamSessionManager implements StreamSessionManager {
		
		constructor({ connectionString: connection_string, tableName: table_name, create, }: {
			connectionString: string;
			tableName?: string | undefined;
			create?: boolean | undefined;
		});
		
		create(id: string, controller: ReadableStreamDefaultController): Promise<void>;
		
		delete(id: string): Promise<void>;
		
		has(id: string): Promise<boolean>;
		
		send(sessions: string[] | undefined, data: string): Promise<void>;
		#private;
	}

	export class PostgresInfoSessionManager implements InfoSessionManager {
		
		constructor({ connectionString: connection_string, tableNames: table_names, create, }: {
			connectionString: string;
			tableNames?: {
				clientCapabilities: string;
				clientInfo: string;
				logLevel: string;
				subscriptions: string;
			} | undefined;
			create?: boolean | undefined;
		});
		getClientInfo(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]>;
		setClientInfo(id: string, client_info: NonNullable<import("tmcp").Context["sessionInfo"]>["clientInfo"]): void;
		getClientCapabilities(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]>;
		setClientCapabilities(id: string, client_capabilities: NonNullable<import("tmcp").Context["sessionInfo"]>["clientCapabilities"]): void;
		getLogLevel(id: string): Promise<NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]>;
		setLogLevel(id: string, log_level: NonNullable<import("tmcp").Context["sessionInfo"]>["logLevel"]): void;
		getSubscriptions(uri: string): Promise<string[]>;
		addSubscription(id: string, uri: string): void;
		removeSubscription(id: string, uri: string): void;
		
		delete(id: string): Promise<void>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map