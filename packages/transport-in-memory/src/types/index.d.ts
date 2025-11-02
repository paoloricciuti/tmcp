declare module '@tmcp/transport-in-memory' {
	import type { JSONRPCRequest } from 'json-rpc-2.0';
	import type { Context, Subscriptions, McpServer } from 'tmcp';
	export class Session<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(adapter: InMemoryTransport<TCustom>, session_id: string);
		get sessionId(): string;
		/**
		 * Initialize the MCP server connection
		 * @param protocolVersion - The protocol version to use
		 * @param capabilities - Client capabilities
		 * @param clientInfo - Client information
		 * */
		initialize(protocolVersion: string, capabilities: import("tmcp").ClientCapabilities, clientInfo: import("tmcp").ClientInfo, ctx?: TCustom): Promise<import("tmcp").InitializeResult>;
		/**
		 * Ping the server
		 * */
		ping(ctx?: TCustom): Promise<{}>;
		/**
		 * List all available tools
		 * */
		listTools(params?: {
			cursor?: string;
		}, ctx?: TCustom): Promise<import("tmcp").ListToolsResult>;
		/**
		 * Call a tool
		 * @param name - Tool name
		 * @param args - Tool arguments
		 * */
		callTool(name: string, args?: Record<string, unknown>, ctx?: TCustom): Promise<import("tmcp").CallToolResult<any>>;
		/**
		 * List all available prompts
		 * */
		listPrompts(params?: {
			cursor?: string;
		}, ctx?: TCustom): Promise<import("tmcp").ListPromptsResult>;
		/**
		 * Get a prompt with optional arguments
		 * @param name - Prompt name
		 * @param args - Prompt arguments
		 * */
		getPrompt(name: string, args?: Record<string, string>, ctx?: TCustom): Promise<import("tmcp").GetPromptResult>;
		/**
		 * List all available resources
		 * */
		listResources(params?: {
			cursor?: string;
		}, ctx?: TCustom): Promise<import("tmcp").ListResourcesResult>;
		/**
		 * List all available resource templates
		 * */
		listResourceTemplates(params?: {
			cursor?: string;
		}, ctx?: TCustom): Promise<import("tmcp").ListResourceTemplatesResult>;
		/**
		 * Read a resource by URI
		 * @param uri - Resource URI
		 * */
		readResource(uri: string, ctx?: TCustom): Promise<import("tmcp").ReadResourceResult>;
		/**
		 * Subscribe to resource updates
		 * @param uri - Resource URI to subscribe to
		 * */
		subscribeResource(uri: string, ctx?: TCustom): Promise<{}>;
		/**
		 * Request completion suggestions
		 * @param ref - Reference to prompt or resource
		 * @param argument - Argument to complete
		 * @param context - Optional context
		 * */
		complete(ref: {
			type: "ref/prompt" | "ref/resource";
			name?: string;
			uri?: string;
		}, argument: {
			name: string;
			value: string;
		}, context?: {
			arguments?: Record<string, string>;
		}, ctx?: TCustom): Promise<import("tmcp").CompleteResult>;
		/**
		 * Set the logging level
		 * @param level - Logging level
		 * */
		setLogLevel(level: import("tmcp").LoggingLevel, ctx?: TCustom): Promise<{}>;
		/**
		 * Send a response to a request that was sent by the server (available in sentMessages)
		 * @param request_id - The ID of the request to respond to
		 * @param result - The result to send back (either result or error must be provided)
		 * @param error - The error to send back (either result or error must be provided)
		 * */
		response(request_id: number | string, result?: any, error?: {
			code: number;
			message: string;
			data?: any;
		}, ctx?: TCustom): Promise<void>;
		/**
		 * Get all messages sent by the server for this session (excluding broadcasts)
		 * */
		get sentMessages(): Array<JSONRPCRequest>;
		/**
		 * Get all messages sent by the server for this session (excluding broadcasts)
		 * */
		get lastRequest(): JSONRPCRequest | undefined;
		/**
		 * Get all broadcast messages sent by the server for this session
		 * */
		get broadcastMessages(): Array<JSONRPCRequest>;
		/**
		 * Get the current session info
		 * */
		get sessionInfo(): NonNullable<Partial<Context["sessionInfo"]>>;
		/**
		 * Get the current subscriptions
		 * */
		get subscriptions(): Subscriptions;
		/**
		 * Clear all captured messages for this session
		 */
		clear(): void;
		/**
		 * Close the session and clean up event listeners
		 */
		close(): void;
		/**
		 * Internal method to get and increment request ID
		 * */
		nextId(): number;
		#private;
	}

	export class InMemoryTransport<TCustom extends Record<string, unknown> | undefined = undefined> {
		
		constructor(server: McpServer<any, TCustom>);
		/**
		 * Get the underlying server instance
		 * */
		get server(): McpServer<any, TCustom>;
		/**
		 * Get or create a session
		 * */
		session(session_id?: string): Session<TCustom>;
		/**
		 * Send a request to the server by method name and params
		 * */
		request(method: string, params?: Record<string, unknown>, sessionId?: string, ctx?: TCustom): Promise<any>;
		/**
		 * Send a response to a request that was sent by the server
		 * @param request_id - The ID of the request to respond to
		 * @param result - The result to send back (either result or error must be provided)
		 * @param error - The error to send back (either result or error must be provided)
		 * */
		response(request_id: number | string, result?: any, error?: {
			code: number;
			message: string;
			data?: any;
		}, sessionId?: string, ctx?: TCustom): Promise<void>;
		/**
		 * Internal method to get the current session ID from AsyncLocalStorage
		 * */
		get sessionId(): string | undefined;
		/**
		 * Internal method to get sent messages for a session
		 * */
		sentMessages(session_id: string): Array<JSONRPCRequest>;
		/**
		 * Internal method to get broadcast messages for a session
		 * */
		broadcastMessages(session_id: string): Array<JSONRPCRequest>;
		/**
		 * Internal method to clear messages for a session
		 * */
		clearSessionMessages(session_id: string): void;
		/**
		 * Internal method to remove a session
		 * */
		closeSession(session_id: string): void;
		/**
		 * Clear all messages for all sessions
		 */
		clear(): void;
		/**
		 * Close all sessions and clean up all event listeners
		 */
		close(): void;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map