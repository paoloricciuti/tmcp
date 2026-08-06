declare module '@tmcp/transport-in-memory' {
	import type { JSONRPCRequest } from 'json-rpc-2.0';
	import type { InMemorySubscriptionManager } from '@tmcp/session-manager';
	import type {
		SubscriptionsListenResult,
		SubscriptionFilter,
		Context,
		Subscriptions,
		McpServer,
		InitializeResult,
	} from 'tmcp';
	export class StatelessSubscription {
		constructor(
			id: string | number,
			origin: string,
			manager: InMemorySubscriptionManager,
			pending: Promise<SubscriptionsListenResult>,
			messages: () => Array<JSONRPCRequest>,
		);

		id: string | number;
		/** All acknowledged and change notifications for this subscription. */
		get messages(): JSONRPCRequest[];
		get acknowledgement(): JSONRPCRequest | undefined;
		get notifications(): JSONRPCRequest[];
		/** Gracefully close the subscription and await its final listen result. */
		close(): Promise<
			{
				resultType: 'complete';
				_meta: {
					'io.modelcontextprotocol/subscriptionId': string | number;
				} & {
					[key: string]: unknown;
				};
			} & {
				[key: string]: unknown;
			}
		>;
		#private;
	}
	/**
	 * A sessionless MCP client for the per-request protocol. Its ordinary MCP
	 * methods have the same signatures as `Session`.
	 *
	 */
	export class StatelessClient<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> extends Client<TCustom> {
		constructor(
			request: ClientRequest<TCustom>,
			sent_messages: () => Array<JSONRPCRequest>,
			clear: () => void,
			close: () => void | Promise<void>,
			listen: (
				notifications: SubscriptionFilter,
				ctx?: TCustom,
			) => Promise<StatelessSubscription>,
		);
		/**
		 * Discover the server's per-request protocol support.
		 * */
		discover(ctx?: TCustom): Promise<DiscoverResult>;
		/**
		 * Open a long-lived per-request notification subscription.
		 *
		 */
		listen(
			notifications: SubscriptionFilter,
			ctx?: TCustom,
		): Promise<StatelessSubscription>;
		/**
		 * Repeat a sessionless request until it completes, resolving every batch of
		 * MRTR input requests with `respond`. The server may re-run the handler from
		 * the top on each round.
		 * */
		requestWithInput<TResult = unknown>(
			method: string,
			params: Record<string, unknown>,
			respond: (
				request: InputRequest,
				key: string,
			) => unknown | Promise<unknown>,
			options?: StatelessInputRequestOptions<TCustom>,
		): Promise<TResult>;

		get sentMessages(): Array<JSONRPCRequest>;
		clear(): void;
		close(): void | Promise<void>;
		#private;
	}

	export class Session<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> extends Client<TCustom> {
		constructor(adapter: InMemoryTransport<TCustom>, session_id: string);
		get sessionId(): string;
		/**
		 * Initialize the MCP server connection
		 * @param protocolVersion - The protocol version to use
		 * @param capabilities - Client capabilities
		 * @param clientInfo - Client information
		 * */
		initialize(
			protocolVersion: string,
			capabilities: import('tmcp').ClientCapabilities,
			clientInfo: import('tmcp').ClientInfo,
			ctx?: TCustom,
		): Promise<import('tmcp').InitializeResult>;
		/**
		 * Ping the server
		 * */
		ping(ctx?: TCustom): Promise<{}>;
		/**
		 * Subscribe to resource updates
		 * @param uri - Resource URI to subscribe to
		 * */
		subscribeResource(uri: string, ctx?: TCustom): Promise<{}>;
		/**
		 * Unsubscribe from resource updates
		 * @param uri - Resource URI to subscribe to
		 * */
		unsubscribeResource(uri: string, ctx?: TCustom): Promise<{}>;
		/**
		 * Set the logging level
		 * @param level - Logging level
		 * */
		setLogLevel(
			level: import('tmcp').LoggingLevel,
			ctx?: TCustom,
		): Promise<{}>;
		/**
		 * Send a response to a request that was sent by the server (available in sentMessages)
		 * @param request_id - The ID of the request to respond to
		 * @param result - The result to send back (either result or error must be provided)
		 * @param error - The error to send back (either result or error must be provided)
		 * */
		response(
			request_id: number | string,
			result?: any,
			error?: {
				code: number;
				message: string;
				data?: any;
			},
			ctx?: TCustom,
		): Promise<void>;
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
		get sessionInfo(): NonNullable<Partial<Context['sessionInfo']>>;
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

	export class InMemoryTransport<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> {
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
		 * Create a sessionless client for the per-request protocol.
		 * */
		stateless(options?: StatelessClientOptions): StatelessClient<TCustom>;
		/**
		 * Send a request to the server by method name and params
		 * */
		request(
			method: string,
			params?: Record<string, unknown>,
			sessionId?: string,
			ctx?: TCustom,
		): Promise<any>;
		/**
		 * Send a response to a request that was sent by the server
		 * @param request_id - The ID of the request to respond to
		 * @param result - The result to send back (either result or error must be provided)
		 * @param error - The error to send back (either result or error must be provided)
		 * */
		response(
			request_id: number | string,
			result?: any,
			error?: {
				code: number;
				message: string;
				data?: any;
			},
			sessionId?: string,
			ctx?: TCustom,
		): Promise<void>;
		/**
		 * Internal method to get the current session ID from AsyncLocalStorage
		 * */
		get sessionId(): string | undefined;
		/**
		 * Internal method to get sent messages for a session
		 * */
		sentMessages(client_id: string): Array<JSONRPCRequest>;
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
		close(): Promise<void>;
		#private;
	}
	export type StatelessClientOptions = {
		protocolVersion?: string | undefined;
		clientCapabilities?:
			| ({
					experimental?:
						| ({} & {
								[key: string]: unknown;
						  })
						| undefined;
					sampling?:
						| ({} & {
								[key: string]: unknown;
						  })
						| undefined;
					elicitation?:
						| ({
								form?:
									| ({} & {
											[key: string]: unknown;
									  })
									| undefined;
								url?:
									| ({} & {
											[key: string]: unknown;
									  })
									| undefined;
						  } & {
								[key: string]: unknown;
						  })
						| undefined;
					extensions?:
						| {
								[x: string]: {} & {
									[key: string]: unknown;
								};
						  }
						| undefined;
					roots?:
						| ({
								listChanged?: boolean | undefined;
						  } & {
								[key: string]: unknown;
						  })
						| undefined;
			  } & {
					[key: string]: unknown;
			  })
			| undefined;
		clientInfo?:
			| {
					icons?:
						| {
								src: string;
								mimeType?: string | undefined;
								sizes?: string[] | undefined;
						  }[]
						| undefined;
					version: string;
					websiteUrl?: string | undefined;
					name: string;
					title?: string | undefined;
			  }
			| undefined;
		logLevel?:
			| 'debug'
			| 'info'
			| 'notice'
			| 'warning'
			| 'error'
			| 'critical'
			| 'alert'
			| 'emergency'
			| undefined;
	};
	export type StatelessInputRequestOptions<
		TCustom extends Record<string, unknown> | undefined,
	> = {
		maxRounds?: number | undefined;
		ctx?: TCustom | undefined;
	};
	export type DiscoverResult = {
		resultType: 'complete';
		supportedVersions: string[];
		capabilities: InitializeResult['capabilities'];
		instructions?: string | undefined;
		ttlMs?: number | undefined;
		cacheScope?: 'private' | 'public' | undefined;
		_meta?: Record<string, unknown> | undefined;
	};
	export type InputRequest = {
		method: string;
		params?: Record<string, unknown>;
	};
	export type ClientRequest<
		TCustom extends Record<string, unknown> | undefined,
	> = (
		method: string,
		params?: Record<string, unknown>,
		ctx?: TCustom,
	) => Promise<any>;

	/**
	 * High-level methods shared by session-negotiated and sessionless clients.
	 *
	 */
	class Client<
		TCustom extends Record<string, unknown> | undefined = undefined,
	> {
		constructor(request: ClientRequest<TCustom>);
		/**
		 * Send a low-level request.
		 * */
		request<TResult = unknown>(
			method: string,
			params?: Record<string, unknown>,
			ctx?: TCustom,
		): Promise<TResult>;
		/**
		 * List all available tools.
		 * */
		listTools(
			params?: {
				cursor?: string;
			},
			ctx?: TCustom,
		): Promise<import('tmcp').ListToolsResult>;
		/**
		 * Call a tool.
		 * */
		callTool<TStructuredContent = undefined>(
			name: string,
			args?: Record<string, unknown>,
			ctx?: TCustom,
		): Promise<import('tmcp').CallToolResult<TStructuredContent>>;
		/**
		 * List all available prompts.
		 * */
		listPrompts(
			params?: {
				cursor?: string;
			},
			ctx?: TCustom,
		): Promise<import('tmcp').ListPromptsResult>;
		/**
		 * Get a prompt with optional arguments.
		 * */
		getPrompt(
			name: string,
			args?: Record<string, string>,
			ctx?: TCustom,
		): Promise<import('tmcp').GetPromptResult>;
		/**
		 * List all available resources.
		 * */
		listResources(
			params?: {
				cursor?: string;
			},
			ctx?: TCustom,
		): Promise<import('tmcp').ListResourcesResult>;
		/**
		 * List all available resource templates.
		 * */
		listResourceTemplates(
			params?: {
				cursor?: string;
			},
			ctx?: TCustom,
		): Promise<import('tmcp').ListResourceTemplatesResult>;
		/**
		 * Read a resource by URI.
		 * */
		readResource(
			uri: string,
			ctx?: TCustom,
		): Promise<import('tmcp').ReadResourceResult>;
		/**
		 * Request completion suggestions.
		 * */
		complete(
			ref: {
				type: 'ref/prompt' | 'ref/resource';
				name?: string;
				uri?: string;
			},
			argument: {
				name: string;
				value: string;
			},
			context?: {
				arguments?: Record<string, string>;
			},
			ctx?: TCustom,
		): Promise<import('tmcp').CompleteResult>;
		#private;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map
