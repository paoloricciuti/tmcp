import * as v from 'valibot';
export const LATEST_PROTOCOL_VERSION = '2025-06-18';
export const DEFAULT_NEGOTIATED_PROTOCOL_VERSION = '2025-03-26';
export const SUPPORTED_PROTOCOL_VERSIONS = [
	LATEST_PROTOCOL_VERSION,
	'2025-03-26',
	'2024-11-05',
	'2024-10-07',
];
/* JSON-RPC types */
export const JSONRPC_VERSION = '2.0';

export class McpError extends Error {
	/**
	 * @param {number} code
	 * @param {string} message
	 */
	constructor(code, message) {
		super(`MCP error ${code}: ${message}`);
		this.name = 'McpError';
	}
}

/**
 * A progress token, used to associate progress notifications with the original request.
 */
export const ProgressTokenSchema = v.union([
	v.string(),
	v.pipe(v.number(), v.integer()),
]);

/**
 * An opaque token used to represent a cursor for pagination.
 */
export const CursorSchema = v.string();

const RequestMetaSchema = v.looseObject({
	/**
	 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
	 */
	progressToken: v.optional(ProgressTokenSchema),
});

const BaseRequestParamsSchema = v.looseObject({
	_meta: v.optional(RequestMetaSchema),
});

export const RequestSchema = v.object({
	method: v.string(),
	params: v.optional(BaseRequestParamsSchema),
});

const BaseNotificationParamsSchema = v.looseObject({
	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});
export const NotificationSchema = v.object({
	method: v.string(),
	params: v.optional(BaseNotificationParamsSchema),
});
export const ResultSchema = v.looseObject({
	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
export const RequestIdSchema = v.union([
	v.string(),
	v.pipe(v.number(), v.integer()),
]);

/**
 * A request that expects a response.
 */
export const JSONRPCRequestSchema = v.object({
	jsonrpc: v.literal(JSONRPC_VERSION),
	id: RequestIdSchema,
	...RequestSchema.entries,
});

/**
 * A notification which does not expect a response.
 */
export const JSONRPCNotificationSchema = v.object({
	jsonrpc: v.literal(JSONRPC_VERSION),
	...NotificationSchema.entries,
});

/**
 * A successful (non-error) response to a request.
 */
export const JSONRPCResponseSchema = v.strictObject({
	jsonrpc: v.literal(JSONRPC_VERSION),
	id: RequestIdSchema,
	result: ResultSchema,
});

/**
 * A response to a request that indicates an error occurred.
 */
export const JSONRPCErrorSchema = v.strictObject({
	jsonrpc: v.literal(JSONRPC_VERSION),
	id: RequestIdSchema,
	error: v.object({
		/**
		 * The error type that occurred.
		 */
		code: v.pipe(v.number(), v.integer()),

		/**
		 * A short description of the error. The message SHOULD be limited to a concise single sentence.
		 */
		message: v.string(),

		/**
		 * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
		 */
		data: v.optional(v.unknown()),
	}),
});
export const JSONRPCMessageSchema = v.union([
	JSONRPCRequestSchema,
	JSONRPCNotificationSchema,
	JSONRPCResponseSchema,
	JSONRPCErrorSchema,
]);
/* Empty result */

/**
 * A response that indicates success but carries no data.
 */
export const EmptyResultSchema = v.strictObject({ ...ResultSchema.entries });
/* Cancellation */

/**
 * This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
 *
 * The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
 *
 * This notification indicates that the result will be unused, so any associated processing SHOULD cease.
 *
 * A client MUST NOT attempt to cancel its `initialize` request.
 */
export const CancelledNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/cancelled'),
	params: v.object({
		...BaseNotificationParamsSchema.entries,

		/**
		 * The ID of the request to cancel.
		 *
		 * This MUST correspond to the ID of a request previously issued in the same direction.
		 */
		requestId: RequestIdSchema,

		/**
		 * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
		 */
		reason: v.optional(v.string()),
	}),
});
/* Base Metadata */

/**
 * Base metadata interface for common properties across resources, tools, prompts, and implementations.
 */
export const BaseMetadataSchema = v.object({
	/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
	name: v.string(),

	/**
	 * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
	 * even by those unfamiliar with domain-specific terminology.
	 *
	 * If not provided, the name should be used for display (except for Tool,
	 * where `annotations.title` should be given precedence over using `name`,
	 * if present).
	 */
	title: v.optional(v.string()),
});

/**
 * Icon schema for use in tools, prompts, resources, and implementations.
 */
export const IconSchema = v.object({
	/**
	 * URL or data URI for the icon.
	 */
	src: v.string(),
	/**
	 * Optional MIME type for the icon.
	 */
	mimeType: v.optional(v.string()),
	/**
	 * Optional array of strings that specify sizes at which the icon can be used.
	 * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
	 *
	 * If not provided, the client should assume that the icon can be used at any size.
	 */
	sizes: v.optional(v.array(v.string())),
});

export const IconsSchema = v.object({
	/**
	 * Optional set of sized icons that the client can display in a user interface.
	 *
	 * Clients that support rendering icons MUST support at least the following MIME types:
	 * - `image/png` - PNG images (safe, universal compatibility)
	 * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
	 *
	 * Clients that support rendering icons SHOULD also support:
	 * - `image/svg+xml` - SVG images (scalable but requires security precautions)
	 * - `image/webp` - WebP images (modern, efficient format)
	 */
	icons: v.optional(v.array(IconSchema)),
});

/* Initialization */

/**
 * Describes the name and version of an MCP implementation.
 */
export const ImplementationSchema = v.object({
	...BaseMetadataSchema.entries,
	version: v.string(),
	websiteUrl: v.optional(v.string()),
	...IconsSchema.entries,
});

/**
 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
 */
export const ClientCapabilitiesSchema = v.object({
	/**
	 * Experimental, non-standard capabilities that the client supports.
	 */
	experimental: v.optional(v.object({})),

	/**
	 * Present if the client supports sampling from an LLM.
	 */
	sampling: v.optional(v.object({})),

	/**
	 * Present if the client supports eliciting user input.
	 */
	elicitation: v.optional(v.object({})),

	/**
	 * Present if the client supports listing roots.
	 */
	roots: v.optional(
		v.object({
			/**
			 * Whether the client supports issuing notifications for changes to the roots list.
			 */
			listChanged: v.optional(v.boolean()),
		}),
	),
});

export const InitializeRequestParamsSchema = v.object({
	...BaseRequestParamsSchema.entries,

	/**
	 * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
	 */
	protocolVersion: v.string(),
	capabilities: ClientCapabilitiesSchema,
	clientInfo: ImplementationSchema,
});

/**
 * This request is sent from the client to the server when it first connects, asking it to begin initialization.
 */
export const InitializeRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('initialize'),
	params: InitializeRequestParamsSchema,
});

/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
export const ServerCapabilitiesSchema = v.object({
	/**
	 * Experimental, non-standard capabilities that the server supports.
	 */
	experimental: v.optional(v.object({})),

	/**
	 * Present if the server supports sending log messages to the client.
	 */
	logging: v.optional(v.object({})),

	/**
	 * Present if the server supports sending completions to the client.
	 */
	completions: v.optional(v.object({})),

	/**
	 * Present if the server offers any prompt templates.
	 */
	prompts: v.optional(
		v.object({
			/**
			 * Whether this server supports issuing notifications for changes to the prompt list.
			 */
			listChanged: v.optional(v.boolean()),
		}),
	),

	/**
	 * Present if the server offers any resources to read.
	 */
	resources: v.optional(
		v.object({
			/**
			 * Whether this server supports clients subscribing to resource updates.
			 */
			subscribe: v.optional(v.boolean()),

			/**
			 * Whether this server supports issuing notifications for changes to the resource list.
			 */
			listChanged: v.optional(v.boolean()),
		}),
	),

	/**
	 * Present if the server offers any tools to call.
	 */
	tools: v.optional(
		v.object({
			/**
			 * Whether this server supports issuing notifications for changes to the tool list.
			 */
			listChanged: v.optional(v.boolean()),
		}),
	),
});

/**
 * After receiving an initialize request from the client, the server sends this response.
 */
export const InitializeResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
	 */
	protocolVersion: v.string(),
	capabilities: ServerCapabilitiesSchema,
	serverInfo: ImplementationSchema,

	/**
	 * Instructions describing how to use the server and its features.
	 *
	 * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
	 */
	instructions: v.optional(v.string()),
});

/**
 * This notification is sent from the client to the server after initialization has finished.
 */
export const InitializedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/initialized'),
});
/* Ping */

/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
export const PingRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('ping'),
});
/* Progress notifications */
export const ProgressSchema = v.object({
	/**
	 * The progress thus far. This should increase every time progress is made, even if the total is unknown.
	 */
	progress: v.number(),

	/**
	 * Total number of items to process (or total progress required), if known.
	 */
	total: v.optional(v.number()),

	/**
	 * An optional message describing the current progress.
	 */
	message: v.optional(v.string()),
});

/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 */
export const ProgressNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/progress'),
	params: v.object({
		...BaseNotificationParamsSchema.entries,
		...ProgressSchema.entries,

		/**
		 * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
		 */
		progressToken: ProgressTokenSchema,
	}),
});
/* Pagination */
export const PaginatedRequestSchema = v.object({
	...RequestSchema.entries,
	params: v.optional(
		v.object({
			...BaseRequestParamsSchema.entries,

			/**
			 * An opaque token representing the current pagination position.
			 * If provided, the server should return results starting after this cursor.
			 */
			cursor: v.optional(CursorSchema),
		}),
	),
});
export const PaginatedResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * An opaque token representing the pagination position after the last returned result.
	 * If present, there may be more results available.
	 */
	nextCursor: v.optional(CursorSchema),
});
/* Resources */

/**
 * The contents of a specific resource or sub-resource.
 */
export const ResourceContentsSchema = v.object({
	/**
	 * The URI of this resource.
	 */
	uri: v.string(),

	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});
export const TextResourceContentsSchema = v.object({
	...ResourceContentsSchema.entries,

	/**
	 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
	 */
	text: v.string(),
});
export const BlobResourceContentsSchema = v.object({
	...ResourceContentsSchema.entries,

	/**
	 * A base64-encoded string representing the binary data of the item.
	 */
	blob: v.pipe(v.string(), v.base64()),
});

/**
 * A known resource that the server is capable of reading.
 */
export const ResourceSchema = v.object({
	...BaseMetadataSchema.entries,

	/**
	 * The URI of this resource.
	 */
	uri: v.string(),

	/**
	 * A description of what this resource represents.
	 *
	 * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
	 */
	description: v.optional(v.string()),

	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
	...IconsSchema.entries,
});

/**
 * A template description for resources available on the server.
 */
export const ResourceTemplateSchema = v.object({
	...BaseMetadataSchema.entries,

	/**
	 * A URI template (according to RFC 6570) that can be used to construct resource URIs.
	 */
	uriTemplate: v.string(),

	/**
	 * A description of what this template is for.
	 *
	 * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
	 */
	description: v.optional(v.string()),

	/**
	 * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
	 */
	mimeType: v.optional(v.string()),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
	...IconsSchema.entries,
});

/**
 * Sent from the client to request a list of resources the server has.
 */
export const ListResourcesRequestSchema = v.object({
	...PaginatedRequestSchema.entries,
	method: v.literal('resources/list'),
});

/**
 * The server's response to a resources/list request from the client.
 */
export const ListResourcesResultSchema = v.object({
	...PaginatedResultSchema.entries,
	resources: v.array(ResourceSchema),
});

/**
 * Sent from the client to request a list of resource templates the server has.
 */
export const ListResourceTemplatesRequestSchema = v.object({
	...PaginatedRequestSchema.entries,
	method: v.literal('resources/templates/list'),
});

/**
 * The server's response to a resources/templates/list request from the client.
 */
export const ListResourceTemplatesResultSchema = v.object({
	...PaginatedResultSchema.entries,
	resourceTemplates: v.array(ResourceTemplateSchema),
});

/**
 * Sent from the client to the server, to read a specific resource URI.
 */
export const ReadResourceRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('resources/read'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
		 */
		uri: v.string(),
	}),
});

/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema = v.object({
	...ResultSchema.entries,
	contents: v.array(
		v.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
	),
});

/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ResourceListChangedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/resources/list_changed'),
});

/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
export const SubscribeRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('resources/subscribe'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
		 */
		uri: v.string(),
	}),
});

/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
export const UnsubscribeRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('resources/unsubscribe'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The URI of the resource to unsubscribe from.
		 */
		uri: v.string(),
	}),
});

/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
export const ResourceUpdatedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/resources/updated'),
	params: v.object({
		...BaseNotificationParamsSchema.entries,

		/**
		 * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
		 */
		uri: v.string(),
	}),
});
/* Prompts */

/**
 * Describes an argument that a prompt can accept.
 */
export const PromptArgumentSchema = v.object({
	/**
	 * The name of the argument.
	 */
	name: v.string(),

	/**
	 * A human-readable description of the argument.
	 */
	description: v.optional(v.string()),

	/**
	 * Whether this argument must be provided.
	 */
	required: v.optional(v.boolean()),
});

/**
 * A prompt or prompt template that the server offers.
 */
export const PromptSchema = v.object({
	...BaseMetadataSchema.entries,

	/**
	 * An optional description of what this prompt provides
	 */
	description: v.optional(v.string()),

	/**
	 * A list of arguments to use for templating the prompt.
	 */
	arguments: v.optional(v.array(PromptArgumentSchema)),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
	...IconsSchema.entries,
});

/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
export const ListPromptsRequestSchema = v.object({
	...PaginatedRequestSchema.entries,
	method: v.literal('prompts/list'),
});

/**
 * The server's response to a prompts/list request from the client.
 */
export const ListPromptsResultSchema = v.object({
	...PaginatedResultSchema.entries,
	prompts: v.array(PromptSchema),
});

/**
 * Used by the client to get a prompt provided by the server.
 */
export const GetPromptRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('prompts/get'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The name of the prompt or prompt template.
		 */
		name: v.string(),

		/**
		 * Arguments to use for templating the prompt.
		 */
		arguments: v.optional(v.record(v.string(), v.string())),
	}),
});

/**
 * Text provided to or from an LLM.
 */
export const TextContentSchema = v.object({
	type: v.literal('text'),

	/**
	 * The text content of the message.
	 */
	text: v.string(),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * An image provided to or from an LLM.
 */
export const ImageContentSchema = v.object({
	type: v.literal('image'),

	/**
	 * The base64-encoded image data.
	 */
	data: v.pipe(v.string(), v.base64()),

	/**
	 * The MIME type of the image. Different providers may support different image types.
	 */
	mimeType: v.string(),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * An Audio provided to or from an LLM.
 */
export const AudioContentSchema = v.object({
	type: v.literal('audio'),

	/**
	 * The base64-encoded audio data.
	 */
	data: v.pipe(v.string(), v.base64()),

	/**
	 * The MIME type of the audio. Different providers may support different audio types.
	 */
	mimeType: v.string(),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export const EmbeddedResourceSchema = v.object({
	type: v.literal('resource'),
	resource: v.union([TextResourceContentsSchema, BlobResourceContentsSchema]),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 *
 * Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.
 */
export const ResourceLinkSchema = v.object({
	...ResourceSchema.entries,
	type: v.literal('resource_link'),
});

/**
 * A content block that can be used in prompts and tool results.
 */
export const ContentBlockSchema = v.union([
	TextContentSchema,
	ImageContentSchema,
	AudioContentSchema,
	ResourceLinkSchema,
	EmbeddedResourceSchema,
]);

/**
 * Describes a message returned as part of a prompt.
 */
export const PromptMessageSchema = v.object({
	role: v.picklist(['user', 'assistant']),
	content: ContentBlockSchema,
});

/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * An optional description for the prompt.
	 */
	description: v.optional(v.string()),
	messages: v.array(PromptMessageSchema),
});

/**
 * An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const PromptListChangedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/prompts/list_changed'),
});
/* Tools */

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
export const ToolAnnotationsSchema = v.object({
	/**
	 * A human-readable title for the tool.
	 */
	title: v.optional(v.string()),

	/**
	 * If true, the tool does not modify its environment.
	 *
	 * Default: false
	 */
	readOnlyHint: v.optional(v.boolean()),

	/**
	 * If true, the tool may perform destructive updates to its environment.
	 * If false, the tool performs only additive updates.
	 *
	 * (This property is meaningful only when `readOnlyHint == false`)
	 *
	 * Default: true
	 */
	destructiveHint: v.optional(v.boolean()),

	/**
	 * If true, calling the tool repeatedly with the same arguments
	 * will have no additional effect on the its environment.
	 *
	 * (This property is meaningful only when `readOnlyHint == false`)
	 *
	 * Default: false
	 */
	idempotentHint: v.optional(v.boolean()),

	/**
	 * If true, this tool may interact with an "open world" of external
	 * entities. If false, the tool's domain of interaction is closed.
	 * For example, the world of a web search tool is open, whereas that
	 * of a memory tool is not.
	 *
	 * Default: true
	 */
	openWorldHint: v.optional(v.boolean()),
});

/**
 * Definition for a tool the client can call.
 */
export const ToolSchema = v.object({
	...BaseMetadataSchema.entries,

	/**
	 * A human-readable description of the tool.
	 */
	description: v.optional(v.string()),

	/**
	 * A JSON Schema object defining the expected parameters for the tool.
	 */
	inputSchema: v.object({
		type: v.literal('object'),
		properties: v.optional(v.object({})),
		required: v.optional(v.array(v.string())),
	}),

	/**
	 * An optional JSON Schema object defining the structure of the tool's output returned in
	 * the structuredContent field of a CallToolResult.
	 */
	outputSchema: v.optional(
		v.object({
			type: v.literal('object'),
			properties: v.optional(v.object({})),
			required: v.optional(v.array(v.string())),
		}),
	),

	/**
	 * Optional additional tool information.
	 */
	annotations: v.optional(ToolAnnotationsSchema),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
	...IconsSchema.entries,
});

/**
 * Sent from the client to request a list of tools the server has.
 */
export const ListToolsRequestSchema = v.object({
	...PaginatedRequestSchema.entries,
	method: v.literal('tools/list'),
});

/**
 * The server's response to a tools/list request from the client.
 */
export const ListToolsResultSchema = v.object({
	...PaginatedResultSchema.entries,
	tools: v.array(ToolSchema),
});

/**
 * The server's response to a tool call.
 */
export const CallToolResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * A list of content objects that represent the result of the tool call.
	 *
	 * If the Tool does not define an outputSchema, this field MUST be present in the result.
	 * For backwards compatibility, this field is always present, but it may be empty.
	 */
	content: v.optional(v.array(ContentBlockSchema), []),

	/**
	 * An object containing structured tool output.
	 *
	 * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
	 */
	structuredContent: v.optional(v.looseObject({})),

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
	isError: v.optional(v.boolean()),
});

/**
 * CallToolResultSchema extended with backwards compatibility to protocol version 2024-10-07.
 */
export const CompatibilityCallToolResultSchema = v.union([
	CallToolResultSchema,
	v.object({ ...ResultSchema.entries, toolResult: v.unknown() }),
]);

/**
 * Used by the client to invoke a tool provided by the server.
 */
export const CallToolRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('tools/call'),
	params: v.object({
		...BaseRequestParamsSchema.entries,
		name: v.string(),
		arguments: v.optional(v.record(v.string(), v.unknown())),
	}),
});

/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ToolListChangedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/tools/list_changed'),
});
/* Logging */

/**
 * The severity of a log message.
 */
export const LoggingLevelSchema = v.picklist([
	'debug',
	'info',
	'notice',
	'warning',
	'error',
	'critical',
	'alert',
	'emergency',
]);

/**
 * A request from the client to the server, to enable or adjust logging.
 */
export const SetLevelRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('logging/setLevel'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
		 */
		level: LoggingLevelSchema,
	}),
});

/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
export const LoggingMessageNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/message'),
	params: v.object({
		...BaseNotificationParamsSchema.entries,

		/**
		 * The severity of this log message.
		 */
		level: LoggingLevelSchema,

		/**
		 * An optional name of the logger issuing this message.
		 */
		logger: v.optional(v.string()),

		/**
		 * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
		 */
		data: v.unknown(),
	}),
});
/* Sampling */

/**
 * Hints to use for model selection.
 */
export const ModelHintSchema = v.object({
	/**
	 * A hint for a model name.
	 */
	name: v.optional(v.string()),
});

/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
export const ModelPreferencesSchema = v.object({
	/**
	 * Optional hints to use for model selection.
	 */
	hints: v.optional(v.array(ModelHintSchema)),

	/**
	 * How much to prioritize cost when selecting a model.
	 */
	costPriority: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),

	/**
	 * How much to prioritize sampling speed (latency) when selecting a model.
	 */
	speedPriority: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),

	/**
	 * How much to prioritize intelligence and capabilities when selecting a model.
	 */
	intelligencePriority: v.optional(
		v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
	),
});

/**
 * Describes a message issued to or received from an LLM API.
 */
export const SamplingMessageSchema = v.object({
	role: v.picklist(['user', 'assistant']),
	content: v.union([
		TextContentSchema,
		ImageContentSchema,
		AudioContentSchema,
	]),
});

export const CreateMessageRequestParamsSchema = v.object({
	...BaseRequestParamsSchema.entries,
	messages: v.array(SamplingMessageSchema),

	/**
	 * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
	 */
	systemPrompt: v.optional(v.string()),

	/**
	 * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
	 */
	includeContext: v.optional(
		v.picklist(['none', 'thisServer', 'allServers']),
	),
	temperature: v.optional(v.number()),

	/**
	 * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
	 */
	maxTokens: v.pipe(v.number(), v.integer()),
	stopSequences: v.optional(v.array(v.string())),

	/**
	 * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
	 */
	metadata: v.optional(v.object({})),

	/**
	 * The server's preferences for which model to select.
	 */
	modelPreferences: v.optional(ModelPreferencesSchema),
});

/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
export const CreateMessageRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('sampling/createMessage'),
	params: CreateMessageRequestParamsSchema,
});

/**
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
export const CreateMessageResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * The name of the model that generated the message.
	 */
	model: v.string(),

	/**
	 * The reason why sampling stopped.
	 */
	stopReason: v.optional(
		v.union([
			v.picklist(['endTurn', 'stopSequence', 'maxTokens']),
			v.string(),
		]),
	),
	role: v.picklist(['user', 'assistant']),
	content: v.variant('type', [
		TextContentSchema,
		ImageContentSchema,
		AudioContentSchema,
	]),
});
/* Elicitation */

/**
 * Primitive schema definition for boolean fields.
 */
export const BooleanSchemaSchema = v.object({
	type: v.literal('boolean'),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	default: v.optional(v.boolean()),
});

/**
 * Primitive schema definition for string fields.
 */
export const StringSchemaSchema = v.object({
	type: v.literal('string'),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	minLength: v.optional(v.number()),
	maxLength: v.optional(v.number()),
	format: v.optional(v.picklist(['email', 'uri', 'date', 'date-time'])),
});

/**
 * Primitive schema definition for number fields.
 */
export const NumberSchemaSchema = v.object({
	type: v.picklist(['number', 'integer']),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	minimum: v.optional(v.number()),
	maximum: v.optional(v.number()),
});

/**
 * Primitive schema definition for enum fields.
 */
export const EnumSchemaSchema = v.object({
	type: v.literal('string'),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	enum: v.array(v.string()),
	enumNames: v.optional(v.array(v.string())),
});

/**
 * Union of all primitive schema definitions.
 */
export const PrimitiveSchemaDefinitionSchema = v.union([
	BooleanSchemaSchema,
	StringSchemaSchema,
	NumberSchemaSchema,
	EnumSchemaSchema,
]);

/**
 * A request from the server to elicit user input via the client.
 * The client should present the message and form fields to the user.
 */
export const ElicitRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('elicitation/create'),
	params: v.object({
		...BaseRequestParamsSchema.entries,

		/**
		 * The message to present to the user.
		 */
		message: v.string(),

		/**
		 * The schema for the requested user input.
		 */
		requestedSchema: v.object({
			type: v.literal('object'),
			properties: v.record(v.string(), PrimitiveSchemaDefinitionSchema),
			required: v.optional(v.array(v.string())),
		}),
	}),
});

/**
 * The client's response to an elicitation/create request from the server.
 */
export const ElicitResultSchema = v.object({
	...ResultSchema.entries,

	/**
	 * The user's response action.
	 */
	action: v.picklist(['accept', 'decline', 'cancel']),

	/**
	 * The collected user input content (only present if action is "accept").
	 */
	content: v.optional(v.record(v.string(), v.unknown())),
});
/* Autocomplete */

/**
 * A reference to a resource or resource template definition.
 */
export const ResourceTemplateReferenceSchema = v.object({
	type: v.literal('ref/resource'),

	/**
	 * The URI or URI template of the resource.
	 */
	uri: v.string(),
});

/**
 * @deprecated Use ResourceTemplateReferenceSchema instead
 */
export const ResourceReferenceSchema = ResourceTemplateReferenceSchema;

/**
 * Identifies a prompt.
 */
export const PromptReferenceSchema = v.object({
	type: v.literal('ref/prompt'),

	/**
	 * The name of the prompt or prompt template
	 */
	name: v.string(),
});

/**
 * A request from the client to the server, to ask for completion options.
 */
export const CompleteRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('completion/complete'),
	params: v.object({
		...BaseRequestParamsSchema.entries,
		ref: v.union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),

		/**
		 * The argument's information
		 */
		argument: v.object({
			/**
			 * The name of the argument
			 */
			name: v.string(),

			/**
			 * The value of the argument to use for completion matching.
			 */
			value: v.string(),
		}),
		context: v.optional(
			v.object({
				/**
				 * Previously-resolved variables in a URI template or prompt.
				 */
				arguments: v.optional(v.record(v.string(), v.string())),
			}),
		),
	}),
});

/**
 * The server's response to a completion/complete request
 */
export const CompleteResultSchema = v.object({
	...ResultSchema.entries,
	completion: v.object({
		/**
		 * An array of completion values. Must not exceed 100 items.
		 */
		values: v.pipe(v.array(v.string()), v.maxLength(100)),

		/**
		 * The total number of completion options available. This can exceed the number of values actually sent in the response.
		 */
		total: v.optional(v.pipe(v.number(), v.integer())),

		/**
		 * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
		 */
		hasMore: v.optional(v.boolean()),
	}),
});
/* Roots */

/**
 * Represents a root directory or file that the server can operate on.
 */
export const RootSchema = v.object({
	/**
	 * The URI identifying the root. This *must* start with file:// for now.
	 */
	uri: v.pipe(v.string(), v.startsWith('file://')),

	/**
	 * An optional name for the root.
	 */
	name: v.optional(v.string()),

	/**
	 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
	 * for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * Sent from the server to request a list of root URIs from the client.
 */
export const ListRootsRequestSchema = v.object({
	...RequestSchema.entries,
	method: v.literal('roots/list'),
});

/**
 * The client's response to a roots/list request from the server.
 */
export const ListRootsResultSchema = v.object({
	...ResultSchema.entries,
	roots: v.array(RootSchema),
});

/**
 * A notification from the client to the server, informing it that the list of roots has changed.
 */
export const RootsListChangedNotificationSchema = v.object({
	...NotificationSchema.entries,
	method: v.literal('notifications/roots/list_changed'),
});
/* Client messages */
export const ClientRequestSchema = v.union([
	PingRequestSchema,
	InitializeRequestSchema,
	CompleteRequestSchema,
	SetLevelRequestSchema,
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	ReadResourceRequestSchema,
	SubscribeRequestSchema,
	UnsubscribeRequestSchema,
	CallToolRequestSchema,
	ListToolsRequestSchema,
]);
export const ClientNotificationSchema = v.union([
	CancelledNotificationSchema,
	ProgressNotificationSchema,
	InitializedNotificationSchema,
	RootsListChangedNotificationSchema,
]);
export const ClientResultSchema = v.union([
	EmptyResultSchema,
	CreateMessageResultSchema,
	ElicitResultSchema,
	ListRootsResultSchema,
]);
/* Server messages */
export const ServerRequestSchema = v.union([
	PingRequestSchema,
	CreateMessageRequestSchema,
	ElicitRequestSchema,
	ListRootsRequestSchema,
]);
export const ServerNotificationSchema = v.union([
	CancelledNotificationSchema,
	ProgressNotificationSchema,
	LoggingMessageNotificationSchema,
	ResourceUpdatedNotificationSchema,
	ResourceListChangedNotificationSchema,
	ToolListChangedNotificationSchema,
	PromptListChangedNotificationSchema,
]);
export const ServerResultSchema = v.union([
	EmptyResultSchema,
	InitializeResultSchema,
	CompleteResultSchema,
	GetPromptResultSchema,
	ListPromptsResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ReadResourceResultSchema,
	CallToolResultSchema,
	ListToolsResultSchema,
]);

/**
 * @typedef {v.InferInput<typeof IconsSchema>} Icons
 */
/**
 * @typedef {v.InferInput<typeof ClientCapabilitiesSchema>} ClientCapabilities
 */
/**
 * @typedef {v.InferInput<typeof ServerCapabilitiesSchema>} ServerCapabilities
 */
/**
 * @typedef {v.InferInput<typeof ImplementationSchema>} ClientInfo
 */
// TODO remove description from ServerInfo on next major...it was never in the protocol
/**
 * @typedef {v.InferInput<typeof ImplementationSchema> & { description?: string }} ServerInfo
 */
/**
 * @typedef {v.InferInput<typeof InitializeRequestParamsSchema>} InitializeRequestParams
 */
/**
 * @template {Record<string, unknown> | undefined} TStructuredContent
 * @typedef {Omit<v.InferInput<typeof CallToolResultSchema>, "structuredContent" | "isError"> & (undefined extends TStructuredContent ? { structuredContent?: undefined, isError?: boolean } : ({ structuredContent: TStructuredContent, isError?: false } | { isError: true, structuredContent?: TStructuredContent }))} CallToolResult
 */
/**
 * @typedef {v.InferInput<typeof ReadResourceResultSchema>} ReadResourceResult
 */
/**
 * @typedef {v.InferInput<typeof GetPromptResultSchema>} GetPromptResult
 */
/**
 * @typedef {v.InferInput<typeof CompleteResultSchema>} CompleteResult
 */
/**
 * @typedef {v.InferInput<typeof CreateMessageRequestParamsSchema>} CreateMessageRequestParams
 */
/**
 * @typedef {v.InferInput<typeof CreateMessageResultSchema>} CreateMessageResult
 */
/**
 * @typedef {v.InferInput<typeof ModelPreferencesSchema>} ModelPreferences
 */
/**
 * @typedef {v.InferInput<typeof SamplingMessageSchema>} SamplingMessage
 */
/**
 * @typedef {v.InferInput<typeof ModelHintSchema>} ModelHint
 */
/**
 * @typedef {v.InferInput<typeof ResourceSchema>} Resource
 */
/**
 * @typedef {v.InferInput<typeof JSONRPCRequestSchema>} JSONRPCRequest
 */
/**
 * @typedef {v.InferInput<typeof JSONRPCMessageSchema>} JSONRPCMessage
 */
/**
 * @typedef {v.InferInput<typeof JSONRPCResponseSchema>} JSONRPCResponse
 */
/**
 * @typedef {v.InferInput<typeof LoggingLevelSchema>} LoggingLevel
 */
/**
 * @typedef {v.InferInput<typeof ToolAnnotationsSchema>} ToolAnnotations
 */
/**
 * @typedef {v.InferInput<typeof ElicitResultSchema>} ElicitResult
 */
/**
 * @typedef {v.InferInput<typeof InitializeResultSchema>} InitializeResult
 */
/**
 * @typedef {v.InferInput<typeof ListToolsResultSchema>} ListToolsResult
 */
/**
 * @typedef {v.InferInput<typeof ListPromptsResultSchema>} ListPromptsResult
 */
/**
 * @typedef {v.InferInput<typeof ListResourcesResultSchema>} ListResourcesResult
 */
/**
 * @typedef {v.InferInput<typeof ListResourceTemplatesResultSchema>} ListResourceTemplatesResult
 */
/**
 * @typedef {v.InferInput<typeof EmbeddedResourceSchema>} EmbeddedResource
 */
/**
 * @typedef {v.InferInput<typeof ResourceLinkSchema>} ResourceLink
 */
