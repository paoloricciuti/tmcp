declare module '@tmcp/session-manager-postgres' {
	import type { SessionManager } from '@tmcp/session-manager';
	export class PostgresSessionManager implements SessionManager {
		
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

	export {};
}

//# sourceMappingURL=index.d.ts.map