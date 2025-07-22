declare module 'tmcp' {
	import type { StandardSchemaV1 } from '@standard-schema/spec';
	import type { JSONRPCRequest, JSONRPCServer, JSONRPCClient } from 'json-rpc-2.0';
	import type { JSONSchema7 } from 'json-schema';
	import * as v from 'valibot';
	export class McpServer<StandardSchema extends StandardSchemaV1> {
		
		constructor(server_info: ServerInfo, options: ServerOptions<StandardSchema>);
		
		roots: Array<{
			uri: string;
			name?: string;
		}>;
		currentClientCapabilities(): {
			experimental?: {} | undefined;
			sampling?: {} | undefined;
			elicitation?: {} | undefined;
			roots?: {
				listChanged?: boolean | undefined;
			} | undefined;
		} | undefined;
		
		on<TEvent extends keyof McpEvents>(event: TEvent, callback: McpEvents[TEvent], options?: AddEventListenerOptions): () => void;
		
		tool<TSchema extends StandardSchema | undefined = undefined>({ name, description, title, schema, annotations }: {
			name: string;
			description: string;
			title?: string;
			schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
			annotations?: ToolAnnotations;
		}, execute: TSchema extends undefined ? (() => Promise<CallToolResult> | CallToolResult) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult> | CallToolResult)): void;
		
		prompt<TSchema extends StandardSchema | undefined = undefined>({ name, description, title, schema, complete }: {
			name: string;
			description: string;
			title?: string;
			schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
			complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>, Completion>>>;
		}, execute: TSchema extends undefined ? (() => Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult): void;
		
		resource({ name, description, title, uri }: {
			name: string;
			description: string;
			title?: string;
			uri: string;
		}, execute: (uri: string) => Promise<ReadResourceResult> | ReadResourceResult): void;
		
		template<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>({ name, description, title, uri, complete, list: list_resources }: {
			name: string;
			description: string;
			title?: string;
			uri: TUri;
			complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>;
			list?: () => Promise<Array<Resource>> | Array<Resource>;
		}, execute: (uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult): void;
		
		receive(message: JSONRPCResponse | JSONRPCRequest, session_id?: string): ReturnType<JSONRPCServer["receive"]> | ReturnType<JSONRPCClient["receive"] | undefined>;
		/**
		 * Send a notification for subscriptions
		 * */
		changed(what: SubscriptionsKeys, id: string): void;
		/**
		 * Refresh roots list from client
		 */
		refreshRoots(): Promise<void>;
		
		elicitation<TSchema extends StandardSchema>(schema: TSchema): Promise<StandardSchemaV1.InferOutput<TSchema>>;
		/**
		 * Request language model sampling from the client
		 * */
		message(request: CreateMessageRequestParams): Promise<CreateMessageResult>;
		/**
		 * Log a message to the client if logging is enabled and the level is appropriate
		 * 
		 */
		log(level: LoggingLevel, data: unknown, logger?: string): void;
		#private;
	}
	export type ClientCapabilities = ClientCapabilities_1;
	type Completion = (
		query: string,
		context: { arguments: Record<string, string> },
	) => CompleteResult;

	type ServerOptions<TSchema extends StandardSchemaV1> = {
		capabilities?: ServerCapabilities;
		instructions?: string;
		adapter: JsonSchemaAdapter<TSchema>;
		pagination?: {
			resources?: { size?: number };
			prompts?: { size?: number };
		};
		logging?: {
			default: LoggingLevel;
		}
	};

	type ServerInfo = {
		name: string;
		version: string;
		description: string;
	};

	type SubscriptionsKeys = 'resource';

	type McpEvents = {
		send: (message: {
			request: JSONRPCRequest;
			context: {
				sessions?: string[] | undefined;
			};
		}) => void;
		initialize: (initialize_request: InitializeRequestParams) => void;
	};
	/**
	 * A successful (non-error) response to a request.
	 */
	const JSONRPCResponseSchema:StrictObjectSchema<{
		readonly jsonrpc:LiteralSchema<"2.0", undefined>;
		readonly id:UnionSchema<[StringSchema<undefined>,SchemaWithPipe<readonly [NumberSchema<undefined>,IntegerAction<number, undefined>]>], undefined>;
		readonly result:ObjectSchema<{
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
		}, undefined>;
	}, undefined>;
	/**
	 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
	 */
	const ClientCapabilitiesSchema:ObjectSchema<{
		/**
		 * Experimental, non-standard capabilities that the client supports.
		 */
		readonly experimental:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the client supports sampling from an LLM.
		 */
		readonly sampling:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the client supports eliciting user input.
		 */
		readonly elicitation:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the client supports listing roots.
		 */
		readonly roots:OptionalSchema<ObjectSchema<{
			/**
			 * Whether the client supports issuing notifications for changes to the roots list.
			 */
			readonly listChanged:OptionalSchema<BooleanSchema<undefined>, undefined>;
		}, undefined>, undefined>;
	}, undefined>;
	const InitializeRequestParamsSchema:ObjectSchema<{
		/**
		 * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
		 */
		readonly protocolVersion:StringSchema<undefined>;
		readonly capabilities:ObjectSchema<{
			/**
			 * Experimental, non-standard capabilities that the client supports.
			 */
			readonly experimental:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			/**
			 * Present if the client supports sampling from an LLM.
			 */
			readonly sampling:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			/**
			 * Present if the client supports eliciting user input.
			 */
			readonly elicitation:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			/**
			 * Present if the client supports listing roots.
			 */
			readonly roots:OptionalSchema<ObjectSchema<{
				/**
				 * Whether the client supports issuing notifications for changes to the roots list.
				 */
				readonly listChanged:OptionalSchema<BooleanSchema<undefined>, undefined>;
			}, undefined>, undefined>;
		}, undefined>;
		readonly clientInfo:ObjectSchema<{
			readonly version:StringSchema<undefined>;
			/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
			readonly name:StringSchema<undefined>;
			/**
			 * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
			 * even by those unfamiliar with domain-specific terminology.
			 *
			 * If not provided, the name should be used for display (except for Tool,
			 * where `annotations.title` should be given precedence over using `name`,
			 * if present).
			 */
			readonly title:OptionalSchema<StringSchema<undefined>, undefined>;
		}, undefined>;
		readonly _meta:OptionalSchema<LooseObjectSchema<{
			/**
			 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
			 */
			readonly progressToken:OptionalSchema<UnionSchema<[StringSchema<undefined>,SchemaWithPipe<readonly [NumberSchema<undefined>,IntegerAction<number, undefined>]>], undefined>, undefined>;
		}, undefined>, undefined>;
	}, undefined>;
	/**
	 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
	 */
	const ServerCapabilitiesSchema:ObjectSchema<{
		/**
		 * Experimental, non-standard capabilities that the server supports.
		 */
		readonly experimental:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the server supports sending log messages to the client.
		 */
		readonly logging:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the server supports sending completions to the client.
		 */
		readonly completions:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * Present if the server offers any prompt templates.
		 */
		readonly prompts:OptionalSchema<ObjectSchema<{
			/**
			 * Whether this server supports issuing notifications for changes to the prompt list.
			 */
			readonly listChanged:OptionalSchema<BooleanSchema<undefined>, undefined>;
		}, undefined>, undefined>;
		/**
		 * Present if the server offers any resources to read.
		 */
		readonly resources:OptionalSchema<ObjectSchema<{
			/**
			 * Whether this server supports clients subscribing to resource updates.
			 */
			readonly subscribe:OptionalSchema<BooleanSchema<undefined>, undefined>;
			/**
			 * Whether this server supports issuing notifications for changes to the resource list.
			 */
			readonly listChanged:OptionalSchema<BooleanSchema<undefined>, undefined>;
		}, undefined>, undefined>;
		/**
		 * Present if the server offers any tools to call.
		 */
		readonly tools:OptionalSchema<ObjectSchema<{
			/**
			 * Whether this server supports issuing notifications for changes to the tool list.
			 */
			readonly listChanged:OptionalSchema<BooleanSchema<undefined>, undefined>;
		}, undefined>, undefined>;
	}, undefined>;
	/**
	 * A known resource that the server is capable of reading.
	 */
	const ResourceSchema:ObjectSchema<{
		/**
		 * The URI of this resource.
		 */
		readonly uri:StringSchema<undefined>;
		/**
		 * A description of what this resource represents.
		 *
		 * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
		 */
		readonly description:OptionalSchema<StringSchema<undefined>, undefined>;
		/**
		 * The MIME type of this resource, if known.
		 */
		readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
		readonly name:StringSchema<undefined>;
		/**
		 * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
		 * even by those unfamiliar with domain-specific terminology.
		 *
		 * If not provided, the name should be used for display (except for Tool,
		 * where `annotations.title` should be given precedence over using `name`,
		 * if present).
		 */
		readonly title:OptionalSchema<StringSchema<undefined>, undefined>;
	}, undefined>;
	/**
	 * The server's response to a resources/read request from the client.
	 */
	const ReadResourceResultSchema:ObjectSchema<{
		readonly contents:ArraySchema<UnionSchema<[ObjectSchema<{
			/**
			 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
			 */
			readonly text:StringSchema<undefined>;
			/**
			 * The URI of this resource.
			 */
			readonly uri:StringSchema<undefined>;
			/**
			 * The MIME type of this resource, if known.
			 */
			readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			/**
			 * A base64-encoded string representing the binary data of the item.
			 */
			readonly blob:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
			/**
			 * The URI of this resource.
			 */
			readonly uri:StringSchema<undefined>;
			/**
			 * The MIME type of this resource, if known.
			 */
			readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>], undefined>, undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
	}, undefined>;
	/**
	 * The server's response to a prompts/get request from the client.
	 */
	const GetPromptResultSchema:ObjectSchema<{
		/**
		 * An optional description for the prompt.
		 */
		readonly description:OptionalSchema<StringSchema<undefined>, undefined>;
		readonly messages:ArraySchema<ObjectSchema<{
			readonly role:PicklistSchema<["user", "assistant"], undefined>;
			readonly content:UnionSchema<[ObjectSchema<{
				readonly type:LiteralSchema<"text", undefined>;
				/**
				 * The text content of the message.
				 */
				readonly text:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"image", undefined>;
				/**
				 * The base64-encoded image data.
				 */
				readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
				/**
				 * The MIME type of the image. Different providers may support different image types.
				 */
				readonly mimeType:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"audio", undefined>;
				/**
				 * The base64-encoded audio data.
				 */
				readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
				/**
				 * The MIME type of the audio. Different providers may support different audio types.
				 */
				readonly mimeType:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"resource_link", undefined>;
				/**
				 * The URI of this resource.
				 */
				readonly uri:StringSchema<undefined>;
				/**
				 * A description of what this resource represents.
				 *
				 * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
				 */
				readonly description:OptionalSchema<StringSchema<undefined>, undefined>;
				/**
				 * The MIME type of this resource, if known.
				 */
				readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
				/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
				readonly name:StringSchema<undefined>;
				/**
				 * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
				 * even by those unfamiliar with domain-specific terminology.
				 *
				 * If not provided, the name should be used for display (except for Tool,
				 * where `annotations.title` should be given precedence over using `name`,
				 * if present).
				 */
				readonly title:OptionalSchema<StringSchema<undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"resource", undefined>;
				readonly resource:UnionSchema<[ObjectSchema<{
					/**
					 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
					 */
					readonly text:StringSchema<undefined>;
					/**
					 * The URI of this resource.
					 */
					readonly uri:StringSchema<undefined>;
					/**
					 * The MIME type of this resource, if known.
					 */
					readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
					/**
					 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
					 * for notes on _meta usage.
					 */
					readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
				}, undefined>,ObjectSchema<{
					/**
					 * A base64-encoded string representing the binary data of the item.
					 */
					readonly blob:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
					/**
					 * The URI of this resource.
					 */
					readonly uri:StringSchema<undefined>;
					/**
					 * The MIME type of this resource, if known.
					 */
					readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
					/**
					 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
					 * for notes on _meta usage.
					 */
					readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
				}, undefined>], undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>], undefined>;
		}, undefined>, undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
	}, undefined>;
	/**
	 * Additional properties describing a Tool to clients.
	 *
	 * NOTE: all properties in ToolAnnotations are **hints**.
	 * They are not guaranteed to provide a faithful description of
	 * tool behavior (including descriptive properties like `title`).
	 *
	 * Clients should never make tool use decisions based on ToolAnnotations
	 * received from untrusted servers.
	 */
	const ToolAnnotationsSchema:ObjectSchema<{
		/**
		 * A human-readable title for the tool.
		 */
		readonly title:OptionalSchema<StringSchema<undefined>, undefined>;
		/**
		 * If true, the tool does not modify its environment.
		 *
		 * Default: false
		 */
		readonly readOnlyHint:OptionalSchema<BooleanSchema<undefined>, undefined>;
		/**
		 * If true, the tool may perform destructive updates to its environment.
		 * If false, the tool performs only additive updates.
		 *
		 * (This property is meaningful only when `readOnlyHint == false`)
		 *
		 * Default: true
		 */
		readonly destructiveHint:OptionalSchema<BooleanSchema<undefined>, undefined>;
		/**
		 * If true, calling the tool repeatedly with the same arguments
		 * will have no additional effect on the its environment.
		 *
		 * (This property is meaningful only when `readOnlyHint == false`)
		 *
		 * Default: false
		 */
		readonly idempotentHint:OptionalSchema<BooleanSchema<undefined>, undefined>;
		/**
		 * If true, this tool may interact with an "open world" of external
		 * entities. If false, the tool's domain of interaction is closed.
		 * For example, the world of a web search tool is open, whereas that
		 * of a memory tool is not.
		 *
		 * Default: true
		 */
		readonly openWorldHint:OptionalSchema<BooleanSchema<undefined>, undefined>;
	}, undefined>;
	/**
	 * The server's response to a tool call.
	 */
	const CallToolResultSchema:ObjectSchema<{
		/**
		 * A list of content objects that represent the result of the tool call.
		 *
		 * If the Tool does not define an outputSchema, this field MUST be present in the result.
		 * For backwards compatibility, this field is always present, but it may be empty.
		 */
		readonly content:OptionalSchema<ArraySchema<UnionSchema<[ObjectSchema<{
			readonly type:LiteralSchema<"text", undefined>;
			/**
			 * The text content of the message.
			 */
			readonly text:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"image", undefined>;
			/**
			 * The base64-encoded image data.
			 */
			readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
			/**
			 * The MIME type of the image. Different providers may support different image types.
			 */
			readonly mimeType:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"audio", undefined>;
			/**
			 * The base64-encoded audio data.
			 */
			readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
			/**
			 * The MIME type of the audio. Different providers may support different audio types.
			 */
			readonly mimeType:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"resource_link", undefined>;
			/**
			 * The URI of this resource.
			 */
			readonly uri:StringSchema<undefined>;
			/**
			 * A description of what this resource represents.
			 *
			 * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
			 */
			readonly description:OptionalSchema<StringSchema<undefined>, undefined>;
			/**
			 * The MIME type of this resource, if known.
			 */
			readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
			readonly name:StringSchema<undefined>;
			/**
			 * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
			 * even by those unfamiliar with domain-specific terminology.
			 *
			 * If not provided, the name should be used for display (except for Tool,
			 * where `annotations.title` should be given precedence over using `name`,
			 * if present).
			 */
			readonly title:OptionalSchema<StringSchema<undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"resource", undefined>;
			readonly resource:UnionSchema<[ObjectSchema<{
				/**
				 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
				 */
				readonly text:StringSchema<undefined>;
				/**
				 * The URI of this resource.
				 */
				readonly uri:StringSchema<undefined>;
				/**
				 * The MIME type of this resource, if known.
				 */
				readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				/**
				 * A base64-encoded string representing the binary data of the item.
				 */
				readonly blob:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
				/**
				 * The URI of this resource.
				 */
				readonly uri:StringSchema<undefined>;
				/**
				 * The MIME type of this resource, if known.
				 */
				readonly mimeType:OptionalSchema<StringSchema<undefined>, undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>], undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>], undefined>, undefined>, readonly []>;
		/**
		 * An object containing structured tool output.
		 *
		 * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
		 */
		readonly structuredContent:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
		/**
		 * Whether the tool call ended in an error.
		 *
		 * If not set, this is assumed to be false (the call was successful).
		 *
		 * Any errors that originate from the tool SHOULD be reported inside the result
		 * object, with `isError` set to true, _not_ as an MCP protocol-level error
		 * response. Otherwise, the LLM would not be able to see that an error occurred
		 * and self-correct.
		 *
		 * However, any errors in _finding_ the tool, an error indicating that the
		 * server does not support tool calls, or any other exceptional conditions,
		 * should be reported as an MCP error response.
		 */
		readonly isError:OptionalSchema<BooleanSchema<undefined>, undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
	}, undefined>;
	/**
	 * The severity of a log message.
	 */
	const LoggingLevelSchema:PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
	const CreateMessageRequestParamsSchema:ObjectSchema<{
		readonly messages:ArraySchema<ObjectSchema<{
			readonly role:PicklistSchema<["user", "assistant"], undefined>;
			readonly content:UnionSchema<[ObjectSchema<{
				readonly type:LiteralSchema<"text", undefined>;
				/**
				 * The text content of the message.
				 */
				readonly text:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"image", undefined>;
				/**
				 * The base64-encoded image data.
				 */
				readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
				/**
				 * The MIME type of the image. Different providers may support different image types.
				 */
				readonly mimeType:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>,ObjectSchema<{
				readonly type:LiteralSchema<"audio", undefined>;
				/**
				 * The base64-encoded audio data.
				 */
				readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
				/**
				 * The MIME type of the audio. Different providers may support different audio types.
				 */
				readonly mimeType:StringSchema<undefined>;
				/**
				 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
				 * for notes on _meta usage.
				 */
				readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
			}, undefined>], undefined>;
		}, undefined>, undefined>;
		/**
		 * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
		 */
		readonly systemPrompt:OptionalSchema<StringSchema<undefined>, undefined>;
		/**
		 * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
		 */
		readonly includeContext:OptionalSchema<PicklistSchema<["none", "thisServer", "allServers"], undefined>, undefined>;
		readonly temperature:OptionalSchema<NumberSchema<undefined>, undefined>;
		/**
		 * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
		 */
		readonly maxTokens:SchemaWithPipe<readonly [NumberSchema<undefined>,IntegerAction<number, undefined>]>;
		readonly stopSequences:OptionalSchema<ArraySchema<StringSchema<undefined>, undefined>, undefined>;
		/**
		 * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
		 */
		readonly metadata:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		/**
		 * The server's preferences for which model to select.
		 */
		readonly modelPreferences:OptionalSchema<ObjectSchema<{
			/**
			 * Optional hints to use for model selection.
			 */
			readonly hints:OptionalSchema<ArraySchema<ObjectSchema<{
				/**
				 * A hint for a model name.
				 */
				readonly name:OptionalSchema<StringSchema<undefined>, undefined>;
			}, undefined>, undefined>, undefined>;
			/**
			 * How much to prioritize cost when selecting a model.
			 */
			readonly costPriority:OptionalSchema<SchemaWithPipe<readonly [NumberSchema<undefined>,MinValueAction<number, 0, undefined>,MaxValueAction<number, 1, undefined>]>, undefined>;
			/**
			 * How much to prioritize sampling speed (latency) when selecting a model.
			 */
			readonly speedPriority:OptionalSchema<SchemaWithPipe<readonly [NumberSchema<undefined>,MinValueAction<number, 0, undefined>,MaxValueAction<number, 1, undefined>]>, undefined>;
			/**
			 * How much to prioritize intelligence and capabilities when selecting a model.
			 */
			readonly intelligencePriority:OptionalSchema<SchemaWithPipe<readonly [NumberSchema<undefined>,MinValueAction<number, 0, undefined>,MaxValueAction<number, 1, undefined>]>, undefined>;
		}, undefined>, undefined>;
		readonly _meta:OptionalSchema<LooseObjectSchema<{
			/**
			 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
			 */
			readonly progressToken:OptionalSchema<UnionSchema<[StringSchema<undefined>,SchemaWithPipe<readonly [NumberSchema<undefined>,IntegerAction<number, undefined>]>], undefined>, undefined>;
		}, undefined>, undefined>;
	}, undefined>;
	/**
	 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
	 */
	const CreateMessageResultSchema:ObjectSchema<{
		/**
		 * The name of the model that generated the message.
		 */
		readonly model:StringSchema<undefined>;
		/**
		 * The reason why sampling stopped.
		 */
		readonly stopReason:OptionalSchema<UnionSchema<[PicklistSchema<["endTurn", "stopSequence", "maxTokens"], undefined>,StringSchema<undefined>], undefined>, undefined>;
		readonly role:PicklistSchema<["user", "assistant"], undefined>;
		readonly content:VariantSchema<"type", [ObjectSchema<{
			readonly type:LiteralSchema<"text", undefined>;
			/**
			 * The text content of the message.
			 */
			readonly text:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"image", undefined>;
			/**
			 * The base64-encoded image data.
			 */
			readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
			/**
			 * The MIME type of the image. Different providers may support different image types.
			 */
			readonly mimeType:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>,ObjectSchema<{
			readonly type:LiteralSchema<"audio", undefined>;
			/**
			 * The base64-encoded audio data.
			 */
			readonly data:SchemaWithPipe<readonly [StringSchema<undefined>,Base64Action<string, undefined>]>;
			/**
			 * The MIME type of the audio. Different providers may support different audio types.
			 */
			readonly mimeType:StringSchema<undefined>;
			/**
			 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
			 * for notes on _meta usage.
			 */
			readonly _meta:OptionalSchema<ObjectSchema<{}, undefined>, undefined>;
		}, undefined>], undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
	}, undefined>;
	/**
	 * The server's response to a completion/complete request
	 */
	const CompleteResultSchema:ObjectSchema<{
		readonly completion:ObjectSchema<{
			/**
			 * An array of completion values. Must not exceed 100 items.
			 */
			readonly values:SchemaWithPipe<readonly [ArraySchema<StringSchema<undefined>, undefined>,MaxLengthAction<string[], 100, undefined>]>;
			/**
			 * The total number of completion options available. This can exceed the number of values actually sent in the response.
			 */
			readonly total:OptionalSchema<SchemaWithPipe<readonly [NumberSchema<undefined>,IntegerAction<number, undefined>]>, undefined>;
			/**
			 * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
			 */
			readonly hasMore:OptionalSchema<BooleanSchema<undefined>, undefined>;
		}, undefined>;
		/**
		 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
		 * for notes on _meta usage.
		 */
		readonly _meta:OptionalSchema<LooseObjectSchema<{}, undefined>, undefined>;
	}, undefined>;
	type ClientCapabilities_1 =InferInput<typeof ClientCapabilitiesSchema>;
	type ServerCapabilities =InferInput<typeof ServerCapabilitiesSchema>;
	type InitializeRequestParams =InferInput<typeof InitializeRequestParamsSchema>;
	type CallToolResult =InferInput<typeof CallToolResultSchema>;
	type ReadResourceResult =InferInput<typeof ReadResourceResultSchema>;
	type GetPromptResult =InferInput<typeof GetPromptResultSchema>;
	type CompleteResult =InferInput<typeof CompleteResultSchema>;
	type CreateMessageRequestParams =InferInput<typeof CreateMessageRequestParamsSchema>;
	type CreateMessageResult =InferInput<typeof CreateMessageResultSchema>;
	type Resource =InferInput<typeof ResourceSchema>;
	type JSONRPCResponse =InferInput<typeof JSONRPCResponseSchema>;
	type LoggingLevel =InferInput<typeof LoggingLevelSchema>;
	type ToolAnnotations =InferInput<typeof ToolAnnotationsSchema>;
	// Helper type to remove whitespace
	type Trim<S extends string> = S extends ` ${infer R}`
		? Trim<R>
		: S extends `${infer L} `
			? Trim<L>
			: S;

	// Helper type to extract variable name, removing modifiers
	type ExtractVarName<S extends string> = S extends `${infer Name}:${string}`
		? Trim<Name> // Remove prefix modifier
		: S extends `${infer Name}*`
			? Trim<Name> // Remove explode modifier
			: Trim<S>;

	// Helper type to split comma-separated variables
	type SplitVariables<S extends string> = S extends `${infer First},${infer Rest}`
		? ExtractVarName<First> | SplitVariables<Rest>
		: ExtractVarName<S>;

	// Helper type to extract content from braces and handle operators
	type ExtractFromExpression<S extends string> = S extends `+${infer Vars}`
		? SplitVariables<Vars> // Reserved {+var}
		: S extends `#${infer Vars}`
			? SplitVariables<Vars> // Fragment {#var}
			: S extends `.${infer Vars}`
				? SplitVariables<Vars> // Label {.var}
				: S extends `/${infer Vars}`
					? SplitVariables<Vars> // Path {/var}
					: S extends `;${infer Vars}`
						? SplitVariables<Vars> // Path-style {;var}
						: S extends `?${infer Vars}`
							? SplitVariables<Vars> // Query {?var}
							: S extends `&${infer Vars}`
								? SplitVariables<Vars> // Query continuation {&var}
								: SplitVariables<S>; // Simple {var}

	// Main recursive type to extract all variables from URI template
	type ExtractVariablesFromTemplate<S extends string> =
		S extends `${string}{${infer Expression}}${infer Rest}`
			? ExtractFromExpression<Expression> | ExtractVariablesFromTemplate<Rest>
			: never;

	// Main exported type
	type ExtractURITemplateVariables<T extends string> =
		ExtractVariablesFromTemplate<T>;
	/**
	 * @import { StandardSchemaV1 } from "@standard-schema/spec";
	 * @import { JSONSchema7 } from "json-schema";
	 */

	class JsonSchemaAdapter<TSchema extends StandardSchemaV1> {
		
		toJsonSchema(schema: TSchema): Promise<JSONSchema7>;
	}

	export {};
}

declare module 'tmcp/adapter' {
	import type { StandardSchemaV1 } from '@standard-schema/spec';
	import type { JSONSchema7 } from 'json-schema';
	/**
	 * @import { StandardSchemaV1 } from "@standard-schema/spec";
	 * @import { JSONSchema7 } from "json-schema";
	 */

	export class JsonSchemaAdapter<TSchema extends StandardSchemaV1> {
		
		toJsonSchema(schema: TSchema): Promise<JSONSchema7>;
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map