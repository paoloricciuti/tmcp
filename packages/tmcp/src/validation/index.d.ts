export const LATEST_PROTOCOL_VERSION: "2025-06-18";
export const DEFAULT_NEGOTIATED_PROTOCOL_VERSION: "2025-03-26";
export const SUPPORTED_PROTOCOL_VERSIONS: string[];
export const JSONRPC_VERSION: "2.0";
export class McpError extends Error {
    /**
     * @param {number} code
     * @param {string} message
     */
    constructor(code: number, message: string);
}
/**
 * A progress token, used to associate progress notifications with the original request.
 */
export const ProgressTokenSchema: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
/**
 * An opaque token used to represent a cursor for pagination.
 */
export const CursorSchema: v.StringSchema<undefined>;
export const RequestSchema: v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const NotificationSchema: v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const ResultSchema: v.LooseObjectSchema<{
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
export const RequestIdSchema: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
/**
 * A request that expects a response.
 */
export const JSONRPCRequestSchema: v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
}, undefined>;
/**
 * A notification which does not expect a response.
 */
export const JSONRPCNotificationSchema: v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
}, undefined>;
/**
 * A successful (non-error) response to a request.
 */
export const JSONRPCResponseSchema: v.StrictObjectSchema<{
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
    readonly result: v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * A response to a request that indicates an error occurred.
 */
export const JSONRPCErrorSchema: v.StrictObjectSchema<{
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
    readonly error: v.ObjectSchema<{
        /**
         * The error type that occurred.
         */
        readonly code: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>;
        /**
         * A short description of the error. The message SHOULD be limited to a concise single sentence.
         */
        readonly message: v.StringSchema<undefined>;
        /**
         * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
         */
        readonly data: v.OptionalSchema<v.UnknownSchema, undefined>;
    }, undefined>;
}, undefined>;
export const JSONRPCMessageSchema: v.UnionSchema<[v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
}, undefined>, v.ObjectSchema<{
    readonly method: v.StringSchema<undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
}, undefined>, v.StrictObjectSchema<{
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
    readonly result: v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.StrictObjectSchema<{
    readonly jsonrpc: v.LiteralSchema<"2.0", undefined>;
    readonly id: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
    readonly error: v.ObjectSchema<{
        /**
         * The error type that occurred.
         */
        readonly code: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>;
        /**
         * A short description of the error. The message SHOULD be limited to a concise single sentence.
         */
        readonly message: v.StringSchema<undefined>;
        /**
         * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
         */
        readonly data: v.OptionalSchema<v.UnknownSchema, undefined>;
    }, undefined>;
}, undefined>], undefined>;
/**
 * A response that indicates success but carries no data.
 */
export const EmptyResultSchema: v.StrictObjectSchema<{
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
 *
 * The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
 *
 * This notification indicates that the result will be unused, so any associated processing SHOULD cease.
 *
 * A client MUST NOT attempt to cancel its `initialize` request.
 */
export const CancelledNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/cancelled", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The ID of the request to cancel.
         *
         * This MUST correspond to the ID of a request previously issued in the same direction.
         */
        readonly requestId: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
         */
        readonly reason: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Base metadata interface for common properties across resources, tools, prompts, and implementations.
 */
export const BaseMetadataSchema: v.LooseObjectSchema<{
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Describes the name and version of an MCP implementation.
 */
export const ImplementationSchema: v.LooseObjectSchema<{
    readonly version: v.StringSchema<undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
 */
export const ClientCapabilitiesSchema: v.LooseObjectSchema<{
    /**
     * Experimental, non-standard capabilities that the client supports.
     */
    readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the client supports sampling from an LLM.
     */
    readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the client supports eliciting user input.
     */
    readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the client supports listing roots.
     */
    readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Whether the client supports issuing notifications for changes to the roots list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const InitializeRequestParamsSchema: v.LooseObjectSchema<{
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    readonly protocolVersion: v.StringSchema<undefined>;
    readonly capabilities: v.LooseObjectSchema<{
        /**
         * Experimental, non-standard capabilities that the client supports.
         */
        readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the client supports sampling from an LLM.
         */
        readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the client supports eliciting user input.
         */
        readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the client supports listing roots.
         */
        readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether the client supports issuing notifications for changes to the roots list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
    readonly clientInfo: v.LooseObjectSchema<{
        readonly version: v.StringSchema<undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
         */
        readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * This request is sent from the client to the server when it first connects, asking it to begin initialization.
 */
export const InitializeRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"initialize", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
         */
        readonly protocolVersion: v.StringSchema<undefined>;
        readonly capabilities: v.LooseObjectSchema<{
            /**
             * Experimental, non-standard capabilities that the client supports.
             */
            readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports sampling from an LLM.
             */
            readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports eliciting user input.
             */
            readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports listing roots.
             */
            readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * Whether the client supports issuing notifications for changes to the roots list.
                 */
                readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>;
        readonly clientInfo: v.LooseObjectSchema<{
            readonly version: v.StringSchema<undefined>;
            /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
            readonly name: v.StringSchema<undefined>;
            /**
             * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
             * even by those unfamiliar with domain-specific terminology.
             *
             * If not provided, the name should be used for display (except for Tool,
             * where `annotations.title` should be given precedence over using `name`,
             * if present).
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
export const ServerCapabilitiesSchema: v.LooseObjectSchema<{
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the server supports sending log messages to the client.
     */
    readonly logging: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the server supports sending completions to the client.
     */
    readonly completions: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the server offers any prompt templates.
     */
    readonly prompts: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Whether this server supports issuing notifications for changes to the prompt list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * Present if the server offers any resources to read.
     */
    readonly resources: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Whether this server supports clients subscribing to resource updates.
         */
        readonly subscribe: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        /**
         * Whether this server supports issuing notifications for changes to the resource list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * Present if the server offers any tools to call.
     */
    readonly tools: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Whether this server supports issuing notifications for changes to the tool list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * After receiving an initialize request from the client, the server sends this response.
 */
export const InitializeResultSchema: v.LooseObjectSchema<{
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    readonly protocolVersion: v.StringSchema<undefined>;
    readonly capabilities: v.LooseObjectSchema<{
        /**
         * Experimental, non-standard capabilities that the server supports.
         */
        readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server supports sending log messages to the client.
         */
        readonly logging: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server supports sending completions to the client.
         */
        readonly completions: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server offers any prompt templates.
         */
        readonly prompts: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the prompt list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Present if the server offers any resources to read.
         */
        readonly resources: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports clients subscribing to resource updates.
             */
            readonly subscribe: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * Whether this server supports issuing notifications for changes to the resource list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Present if the server offers any tools to call.
         */
        readonly tools: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the tool list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
    readonly serverInfo: v.LooseObjectSchema<{
        readonly version: v.StringSchema<undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    readonly instructions: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * This notification is sent from the client to the server after initialization has finished.
 */
export const InitializedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/initialized", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
export const PingRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"ping", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const ProgressSchema: v.LooseObjectSchema<{
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    readonly progress: v.NumberSchema<undefined>;
    /**
     * Total number of items to process (or total progress required), if known.
     */
    readonly total: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    /**
     * An optional message describing the current progress.
     */
    readonly message: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 */
export const ProgressNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/progress", undefined>;
    readonly params: v.ObjectSchema<{
        /**
         * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
         */
        readonly progressToken: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * The progress thus far. This should increase every time progress is made, even if the total is unknown.
         */
        readonly progress: v.NumberSchema<undefined>;
        /**
         * Total number of items to process (or total progress required), if known.
         */
        readonly total: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        /**
         * An optional message describing the current progress.
         */
        readonly message: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
export const PaginatedRequestSchema: v.LooseObjectSchema<{
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly method: v.StringSchema<undefined>;
}, undefined>;
export const PaginatedResultSchema: v.LooseObjectSchema<{
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * The contents of a specific resource or sub-resource.
 */
export const ResourceContentsSchema: v.LooseObjectSchema<{
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const TextResourceContentsSchema: v.LooseObjectSchema<{
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    readonly text: v.StringSchema<undefined>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const BlobResourceContentsSchema: v.LooseObjectSchema<{
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A known resource that the server is capable of reading.
 */
export const ResourceSchema: v.LooseObjectSchema<{
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * A template description for resources available on the server.
 */
export const ResourceTemplateSchema: v.LooseObjectSchema<{
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    readonly uriTemplate: v.StringSchema<undefined>;
    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to request a list of resources the server has.
 */
export const ListResourcesRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a resources/list request from the client.
 */
export const ListResourcesResultSchema: v.LooseObjectSchema<{
    readonly resources: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to request a list of resource templates the server has.
 */
export const ListResourceTemplatesRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/templates/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a resources/templates/list request from the client.
 */
export const ListResourceTemplatesResultSchema: v.LooseObjectSchema<{
    readonly resourceTemplates: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * A URI template (according to RFC 6570) that can be used to construct resource URIs.
         */
        readonly uriTemplate: v.StringSchema<undefined>;
        /**
         * A description of what this template is for.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to the server, to read a specific resource URI.
 */
export const ReadResourceRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/read", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema: v.LooseObjectSchema<{
    readonly contents: v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ResourceListChangedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/resources/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
export const SubscribeRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/subscribe", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
export const UnsubscribeRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/unsubscribe", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to unsubscribe from.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
export const ResourceUpdatedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/resources/updated", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Describes an argument that a prompt can accept.
 */
export const PromptArgumentSchema: v.LooseObjectSchema<{
    /**
     * The name of the argument.
     */
    readonly name: v.StringSchema<undefined>;
    /**
     * A human-readable description of the argument.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * Whether this argument must be provided.
     */
    readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>;
/**
 * A prompt or prompt template that the server offers.
 */
export const PromptSchema: v.LooseObjectSchema<{
    /**
     * An optional description of what this prompt provides
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * A list of arguments to use for templating the prompt.
     */
    readonly arguments: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
        /**
         * The name of the argument.
         */
        readonly name: v.StringSchema<undefined>;
        /**
         * A human-readable description of the argument.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * Whether this argument must be provided.
         */
        readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
export const ListPromptsRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"prompts/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a prompts/list request from the client.
 */
export const ListPromptsResultSchema: v.LooseObjectSchema<{
    readonly prompts: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * An optional description of what this prompt provides
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A list of arguments to use for templating the prompt.
         */
        readonly arguments: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
            /**
             * The name of the argument.
             */
            readonly name: v.StringSchema<undefined>;
            /**
             * A human-readable description of the argument.
             */
            readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Whether this argument must be provided.
             */
            readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Used by the client to get a prompt provided by the server.
 */
export const GetPromptRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"prompts/get", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The name of the prompt or prompt template.
         */
        readonly name: v.StringSchema<undefined>;
        /**
         * Arguments to use for templating the prompt.
         */
        readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.StringSchema<undefined>, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Text provided to or from an LLM.
 */
export const TextContentSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"text", undefined>;
    /**
     * The text content of the message.
     */
    readonly text: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * An image provided to or from an LLM.
 */
export const ImageContentSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"image", undefined>;
    /**
     * The base64-encoded image data.
     */
    readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    readonly mimeType: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * An Audio provided to or from an LLM.
 */
export const AudioContentSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"audio", undefined>;
    /**
     * The base64-encoded audio data.
     */
    readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    readonly mimeType: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export const EmbeddedResourceSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"resource", undefined>;
    readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 *
 * Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.
 */
export const ResourceLinkSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"resource_link", undefined>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * A content block that can be used in prompts and tool results.
 */
export const ContentBlockSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"text", undefined>;
    /**
     * The text content of the message.
     */
    readonly text: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"image", undefined>;
    /**
     * The base64-encoded image data.
     */
    readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    readonly mimeType: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"audio", undefined>;
    /**
     * The base64-encoded audio data.
     */
    readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    readonly mimeType: v.StringSchema<undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"resource_link", undefined>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"resource", undefined>;
    readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>], undefined>;
/**
 * Describes a message returned as part of a prompt.
 */
export const PromptMessageSchema: v.LooseObjectSchema<{
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
}, undefined>;
/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResultSchema: v.LooseObjectSchema<{
    /**
     * An optional description for the prompt.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly messages: v.ArraySchema<v.LooseObjectSchema<{
        readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
        readonly content: v.UnionSchema<[v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"text", undefined>;
            /**
             * The text content of the message.
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"image", undefined>;
            /**
             * The base64-encoded image data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the image. Different providers may support different image types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"audio", undefined>;
            /**
             * The base64-encoded audio data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the audio. Different providers may support different audio types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"resource_link", undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * A description of what this resource represents.
             *
             * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
             */
            readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
            readonly name: v.StringSchema<undefined>;
            /**
             * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
             * even by those unfamiliar with domain-specific terminology.
             *
             * If not provided, the name should be used for display (except for Tool,
             * where `annotations.title` should be given precedence over using `name`,
             * if present).
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"resource", undefined>;
            readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
                /**
                 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
                 */
                readonly text: v.StringSchema<undefined>;
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                /**
                 * A base64-encoded string representing the binary data of the item.
                 */
                readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>], undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
    }, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const PromptListChangedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/prompts/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
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
export const ToolAnnotationsSchema: v.LooseObjectSchema<{
    /**
     * A human-readable title for the tool.
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * If true, the tool does not modify its environment.
     *
     * Default: false
     */
    readonly readOnlyHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * If true, the tool may perform destructive updates to its environment.
     * If false, the tool performs only additive updates.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: true
     */
    readonly destructiveHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * If true, calling the tool repeatedly with the same arguments
     * will have no additional effect on the its environment.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: false
     */
    readonly idempotentHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * If true, this tool may interact with an "open world" of external
     * entities. If false, the tool's domain of interaction is closed.
     * For example, the world of a web search tool is open, whereas that
     * of a memory tool is not.
     *
     * Default: true
     */
    readonly openWorldHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>;
/**
 * Definition for a tool the client can call.
 */
export const ToolSchema: v.LooseObjectSchema<{
    /**
     * A human-readable description of the tool.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * A JSON Schema object defining the expected parameters for the tool.
     */
    readonly inputSchema: v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"object", undefined>;
        readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>;
    /**
     * An optional JSON Schema object defining the structure of the tool's output returned in
     * the structuredContent field of a CallToolResult.
     */
    readonly outputSchema: v.OptionalSchema<v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"object", undefined>;
        readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * Optional additional tool information.
     */
    readonly annotations: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * A human-readable title for the tool.
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * If true, the tool does not modify its environment.
         *
         * Default: false
         */
        readonly readOnlyHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        /**
         * If true, the tool may perform destructive updates to its environment.
         * If false, the tool performs only additive updates.
         *
         * (This property is meaningful only when `readOnlyHint == false`)
         *
         * Default: true
         */
        readonly destructiveHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        /**
         * If true, calling the tool repeatedly with the same arguments
         * will have no additional effect on the its environment.
         *
         * (This property is meaningful only when `readOnlyHint == false`)
         *
         * Default: false
         */
        readonly idempotentHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        /**
         * If true, this tool may interact with an "open world" of external
         * entities. If false, the tool's domain of interaction is closed.
         * For example, the world of a web search tool is open, whereas that
         * of a memory tool is not.
         *
         * Default: true
         */
        readonly openWorldHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Sent from the client to request a list of tools the server has.
 */
export const ListToolsRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"tools/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a tools/list request from the client.
 */
export const ListToolsResultSchema: v.LooseObjectSchema<{
    readonly tools: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * A human-readable description of the tool.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A JSON Schema object defining the expected parameters for the tool.
         */
        readonly inputSchema: v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
        /**
         * An optional JSON Schema object defining the structure of the tool's output returned in
         * the structuredContent field of a CallToolResult.
         */
        readonly outputSchema: v.OptionalSchema<v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Optional additional tool information.
         */
        readonly annotations: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * A human-readable title for the tool.
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * If true, the tool does not modify its environment.
             *
             * Default: false
             */
            readonly readOnlyHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, the tool may perform destructive updates to its environment.
             * If false, the tool performs only additive updates.
             *
             * (This property is meaningful only when `readOnlyHint == false`)
             *
             * Default: true
             */
            readonly destructiveHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, calling the tool repeatedly with the same arguments
             * will have no additional effect on the its environment.
             *
             * (This property is meaningful only when `readOnlyHint == false`)
             *
             * Default: false
             */
            readonly idempotentHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, this tool may interact with an "open world" of external
             * entities. If false, the tool's domain of interaction is closed.
             * For example, the world of a web search tool is open, whereas that
             * of a memory tool is not.
             *
             * Default: true
             */
            readonly openWorldHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a tool call.
 */
export const CallToolResultSchema: v.LooseObjectSchema<{
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    readonly content: v.OptionalSchema<v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>, readonly []>;
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    readonly structuredContent: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
    readonly isError: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * CallToolResultSchema extended with backwards compatibility to protocol version 2024-10-07.
 */
export const CompatibilityCallToolResultSchema: v.UnionSchema<[v.LooseObjectSchema<{
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    readonly content: v.OptionalSchema<v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>, readonly []>;
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    readonly structuredContent: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
    readonly isError: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly toolResult: v.UnknownSchema;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>], undefined>;
/**
 * Used by the client to invoke a tool provided by the server.
 */
export const CallToolRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"tools/call", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly name: v.StringSchema<undefined>;
        readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ToolListChangedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/tools/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The severity of a log message.
 */
export const LoggingLevelSchema: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
/**
 * A request from the client to the server, to enable or adjust logging.
 */
export const SetLevelRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"logging/setLevel", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
         */
        readonly level: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
export const LoggingMessageNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/message", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The severity of this log message.
         */
        readonly level: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
        /**
         * An optional name of the logger issuing this message.
         */
        readonly logger: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
         */
        readonly data: v.UnknownSchema;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Hints to use for model selection.
 */
export const ModelHintSchema: v.LooseObjectSchema<{
    /**
     * A hint for a model name.
     */
    readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
export const ModelPreferencesSchema: v.LooseObjectSchema<{
    /**
     * Optional hints to use for model selection.
     */
    readonly hints: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
        /**
         * A hint for a model name.
         */
        readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
    /**
     * How much to prioritize cost when selecting a model.
     */
    readonly costPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    readonly speedPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    readonly intelligencePriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
}, undefined>;
/**
 * Describes a message issued to or received from an LLM API.
 */
export const SamplingMessageSchema: v.LooseObjectSchema<{
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
}, undefined>;
export const CreateMessageRequestParamsSchema: v.LooseObjectSchema<{
    readonly messages: v.ArraySchema<v.LooseObjectSchema<{
        readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
        readonly content: v.UnionSchema<[v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"text", undefined>;
            /**
             * The text content of the message.
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"image", undefined>;
            /**
             * The base64-encoded image data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the image. Different providers may support different image types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"audio", undefined>;
            /**
             * The base64-encoded audio data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the audio. Different providers may support different audio types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
    }, undefined>, undefined>;
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    readonly systemPrompt: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
     */
    readonly includeContext: v.OptionalSchema<v.PicklistSchema<["none", "thisServer", "allServers"], undefined>, undefined>;
    readonly temperature: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    /**
     * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
     */
    readonly maxTokens: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>;
    readonly stopSequences: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    readonly metadata: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * The server's preferences for which model to select.
     */
    readonly modelPreferences: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Optional hints to use for model selection.
         */
        readonly hints: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
            /**
             * A hint for a model name.
             */
            readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        /**
         * How much to prioritize cost when selecting a model.
         */
        readonly costPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
        /**
         * How much to prioritize sampling speed (latency) when selecting a model.
         */
        readonly speedPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
        /**
         * How much to prioritize intelligence and capabilities when selecting a model.
         */
        readonly intelligencePriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
    }, undefined>, undefined>;
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
         */
        readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
export const CreateMessageRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"sampling/createMessage", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly messages: v.ArraySchema<v.LooseObjectSchema<{
            readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
            readonly content: v.UnionSchema<[v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"text", undefined>;
                /**
                 * The text content of the message.
                 */
                readonly text: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"image", undefined>;
                /**
                 * The base64-encoded image data.
                 */
                readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The MIME type of the image. Different providers may support different image types.
                 */
                readonly mimeType: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"audio", undefined>;
                /**
                 * The base64-encoded audio data.
                 */
                readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The MIME type of the audio. Different providers may support different audio types.
                 */
                readonly mimeType: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>], undefined>;
        }, undefined>, undefined>;
        /**
         * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
         */
        readonly systemPrompt: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
         */
        readonly includeContext: v.OptionalSchema<v.PicklistSchema<["none", "thisServer", "allServers"], undefined>, undefined>;
        readonly temperature: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        /**
         * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
         */
        readonly maxTokens: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>;
        readonly stopSequences: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        /**
         * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
         */
        readonly metadata: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * The server's preferences for which model to select.
         */
        readonly modelPreferences: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Optional hints to use for model selection.
             */
            readonly hints: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
                /**
                 * A hint for a model name.
                 */
                readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>, undefined>, undefined>;
            /**
             * How much to prioritize cost when selecting a model.
             */
            readonly costPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
            /**
             * How much to prioritize sampling speed (latency) when selecting a model.
             */
            readonly speedPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
            /**
             * How much to prioritize intelligence and capabilities when selecting a model.
             */
            readonly intelligencePriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
        }, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
export const CreateMessageResultSchema: v.LooseObjectSchema<{
    /**
     * The name of the model that generated the message.
     */
    readonly model: v.StringSchema<undefined>;
    /**
     * The reason why sampling stopped.
     */
    readonly stopReason: v.OptionalSchema<v.UnionSchema<[v.PicklistSchema<["endTurn", "stopSequence", "maxTokens"], undefined>, v.StringSchema<undefined>], undefined>, undefined>;
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.VariantSchema<"type", [v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Primitive schema definition for boolean fields.
 */
export const BooleanSchemaSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"boolean", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>;
/**
 * Primitive schema definition for string fields.
 */
export const StringSchemaSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"string", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
}, undefined>;
/**
 * Primitive schema definition for number fields.
 */
export const NumberSchemaSchema: v.LooseObjectSchema<{
    readonly type: v.PicklistSchema<["number", "integer"], undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
}, undefined>;
/**
 * Primitive schema definition for enum fields.
 */
export const EnumSchemaSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"string", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
    readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
}, undefined>;
/**
 * Union of all primitive schema definitions.
 */
export const PrimitiveSchemaDefinitionSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"boolean", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"string", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.PicklistSchema<["number", "integer"], undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"string", undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
    readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
}, undefined>], undefined>;
/**
 * A request from the server to elicit user input via the client.
 * The client should present the message and form fields to the user.
 */
export const ElicitRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"elicitation/create", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The message to present to the user.
         */
        readonly message: v.StringSchema<undefined>;
        /**
         * The schema for the requested user input.
         */
        readonly requestedSchema: v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"boolean", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.PicklistSchema<["number", "integer"], undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>], undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * The client's response to an elicitation/create request from the server.
 */
export const ElicitResultSchema: v.LooseObjectSchema<{
    /**
     * The user's response action.
     */
    readonly action: v.PicklistSchema<["accept", "decline", "cancel"], undefined>;
    /**
     * The collected user input content (only present if action is "accept").
     */
    readonly content: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A reference to a resource or resource template definition.
 */
export const ResourceTemplateReferenceSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"ref/resource", undefined>;
    /**
     * The URI or URI template of the resource.
     */
    readonly uri: v.StringSchema<undefined>;
}, undefined>;
/**
 * @deprecated Use ResourceTemplateReferenceSchema instead
 */
export const ResourceReferenceSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"ref/resource", undefined>;
    /**
     * The URI or URI template of the resource.
     */
    readonly uri: v.StringSchema<undefined>;
}, undefined>;
/**
 * Identifies a prompt.
 */
export const PromptReferenceSchema: v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"ref/prompt", undefined>;
    /**
     * The name of the prompt or prompt template
     */
    readonly name: v.StringSchema<undefined>;
}, undefined>;
/**
 * A request from the client to the server, to ask for completion options.
 */
export const CompleteRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"completion/complete", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly ref: v.UnionSchema<[v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"ref/prompt", undefined>;
            /**
             * The name of the prompt or prompt template
             */
            readonly name: v.StringSchema<undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"ref/resource", undefined>;
            /**
             * The URI or URI template of the resource.
             */
            readonly uri: v.StringSchema<undefined>;
        }, undefined>], undefined>;
        /**
         * The argument's information
         */
        readonly argument: v.LooseObjectSchema<{
            /**
             * The name of the argument
             */
            readonly name: v.StringSchema<undefined>;
            /**
             * The value of the argument to use for completion matching.
             */
            readonly value: v.StringSchema<undefined>;
        }, undefined>;
        readonly context: v.OptionalSchema<v.ObjectSchema<{
            /**
             * Previously-resolved variables in a URI template or prompt.
             */
            readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>;
/**
 * The server's response to a completion/complete request
 */
export const CompleteResultSchema: v.LooseObjectSchema<{
    readonly completion: v.LooseObjectSchema<{
        /**
         * An array of completion values. Must not exceed 100 items.
         */
        readonly values: v.SchemaWithPipe<readonly [v.ArraySchema<v.StringSchema<undefined>, undefined>, v.MaxLengthAction<string[], 100, undefined>]>;
        /**
         * The total number of completion options available. This can exceed the number of values actually sent in the response.
         */
        readonly total: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>, undefined>;
        /**
         * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
         */
        readonly hasMore: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Represents a root directory or file that the server can operate on.
 */
export const RootSchema: v.LooseObjectSchema<{
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    readonly uri: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.StartsWithAction<string, "file://", undefined>]>;
    /**
     * An optional name for the root.
     */
    readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * Sent from the server to request a list of root URIs from the client.
 */
export const ListRootsRequestSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"roots/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The client's response to a roots/list request from the server.
 */
export const ListRootsResultSchema: v.LooseObjectSchema<{
    readonly roots: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * The URI identifying the root. This *must* start with file:// for now.
         */
        readonly uri: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.StartsWithAction<string, "file://", undefined>]>;
        /**
         * An optional name for the root.
         */
        readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A notification from the client to the server, informing it that the list of roots has changed.
 */
export const RootsListChangedNotificationSchema: v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/roots/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const ClientRequestSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"ping", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"initialize", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
         */
        readonly protocolVersion: v.StringSchema<undefined>;
        readonly capabilities: v.LooseObjectSchema<{
            /**
             * Experimental, non-standard capabilities that the client supports.
             */
            readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports sampling from an LLM.
             */
            readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports eliciting user input.
             */
            readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports listing roots.
             */
            readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * Whether the client supports issuing notifications for changes to the roots list.
                 */
                readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>;
        readonly clientInfo: v.LooseObjectSchema<{
            readonly version: v.StringSchema<undefined>;
            /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
            readonly name: v.StringSchema<undefined>;
            /**
             * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
             * even by those unfamiliar with domain-specific terminology.
             *
             * If not provided, the name should be used for display (except for Tool,
             * where `annotations.title` should be given precedence over using `name`,
             * if present).
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"completion/complete", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly ref: v.UnionSchema<[v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"ref/prompt", undefined>;
            /**
             * The name of the prompt or prompt template
             */
            readonly name: v.StringSchema<undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"ref/resource", undefined>;
            /**
             * The URI or URI template of the resource.
             */
            readonly uri: v.StringSchema<undefined>;
        }, undefined>], undefined>;
        /**
         * The argument's information
         */
        readonly argument: v.LooseObjectSchema<{
            /**
             * The name of the argument
             */
            readonly name: v.StringSchema<undefined>;
            /**
             * The value of the argument to use for completion matching.
             */
            readonly value: v.StringSchema<undefined>;
        }, undefined>;
        readonly context: v.OptionalSchema<v.ObjectSchema<{
            /**
             * Previously-resolved variables in a URI template or prompt.
             */
            readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"logging/setLevel", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
         */
        readonly level: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"prompts/get", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The name of the prompt or prompt template.
         */
        readonly name: v.StringSchema<undefined>;
        /**
         * Arguments to use for templating the prompt.
         */
        readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.StringSchema<undefined>, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"prompts/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/templates/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/read", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/subscribe", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"resources/unsubscribe", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource to unsubscribe from.
         */
        readonly uri: v.StringSchema<undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"tools/call", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly name: v.StringSchema<undefined>;
        readonly arguments: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"tools/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * An opaque token representing the current pagination position.
         * If provided, the server should return results starting after this cursor.
         */
        readonly cursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>], undefined>;
export const ClientNotificationSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/cancelled", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The ID of the request to cancel.
         *
         * This MUST correspond to the ID of a request previously issued in the same direction.
         */
        readonly requestId: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
         */
        readonly reason: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/progress", undefined>;
    readonly params: v.ObjectSchema<{
        /**
         * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
         */
        readonly progressToken: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * The progress thus far. This should increase every time progress is made, even if the total is unknown.
         */
        readonly progress: v.NumberSchema<undefined>;
        /**
         * Total number of items to process (or total progress required), if known.
         */
        readonly total: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        /**
         * An optional message describing the current progress.
         */
        readonly message: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/initialized", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/roots/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>], undefined>;
export const ClientResultSchema: v.UnionSchema<[v.StrictObjectSchema<{
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /**
     * The name of the model that generated the message.
     */
    readonly model: v.StringSchema<undefined>;
    /**
     * The reason why sampling stopped.
     */
    readonly stopReason: v.OptionalSchema<v.UnionSchema<[v.PicklistSchema<["endTurn", "stopSequence", "maxTokens"], undefined>, v.StringSchema<undefined>], undefined>, undefined>;
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.VariantSchema<"type", [v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /**
     * The user's response action.
     */
    readonly action: v.PicklistSchema<["accept", "decline", "cancel"], undefined>;
    /**
     * The collected user input content (only present if action is "accept").
     */
    readonly content: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.UnknownSchema, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly roots: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * The URI identifying the root. This *must* start with file:// for now.
         */
        readonly uri: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.StartsWithAction<string, "file://", undefined>]>;
        /**
         * An optional name for the root.
         */
        readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>], undefined>;
export const ServerRequestSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"ping", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"sampling/createMessage", undefined>;
    readonly params: v.LooseObjectSchema<{
        readonly messages: v.ArraySchema<v.LooseObjectSchema<{
            readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
            readonly content: v.UnionSchema<[v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"text", undefined>;
                /**
                 * The text content of the message.
                 */
                readonly text: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"image", undefined>;
                /**
                 * The base64-encoded image data.
                 */
                readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The MIME type of the image. Different providers may support different image types.
                 */
                readonly mimeType: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"audio", undefined>;
                /**
                 * The base64-encoded audio data.
                 */
                readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The MIME type of the audio. Different providers may support different audio types.
                 */
                readonly mimeType: v.StringSchema<undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>], undefined>;
        }, undefined>, undefined>;
        /**
         * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
         */
        readonly systemPrompt: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
         */
        readonly includeContext: v.OptionalSchema<v.PicklistSchema<["none", "thisServer", "allServers"], undefined>, undefined>;
        readonly temperature: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        /**
         * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
         */
        readonly maxTokens: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>;
        readonly stopSequences: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        /**
         * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
         */
        readonly metadata: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * The server's preferences for which model to select.
         */
        readonly modelPreferences: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Optional hints to use for model selection.
             */
            readonly hints: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
                /**
                 * A hint for a model name.
                 */
                readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>, undefined>, undefined>;
            /**
             * How much to prioritize cost when selecting a model.
             */
            readonly costPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
            /**
             * How much to prioritize sampling speed (latency) when selecting a model.
             */
            readonly speedPriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
            /**
             * How much to prioritize intelligence and capabilities when selecting a model.
             */
            readonly intelligencePriority: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 1, undefined>]>, undefined>;
        }, undefined>, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"elicitation/create", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The message to present to the user.
         */
        readonly message: v.StringSchema<undefined>;
        /**
         * The schema for the requested user input.
         */
        readonly requestedSchema: v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"boolean", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.PicklistSchema<["number", "integer"], undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>], undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"roots/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>], undefined>;
export const ServerNotificationSchema: v.UnionSchema<[v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/cancelled", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The ID of the request to cancel.
         *
         * This MUST correspond to the ID of a request previously issued in the same direction.
         */
        readonly requestId: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
         */
        readonly reason: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/progress", undefined>;
    readonly params: v.ObjectSchema<{
        /**
         * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
         */
        readonly progressToken: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        /**
         * The progress thus far. This should increase every time progress is made, even if the total is unknown.
         */
        readonly progress: v.NumberSchema<undefined>;
        /**
         * Total number of items to process (or total progress required), if known.
         */
        readonly total: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        /**
         * An optional message describing the current progress.
         */
        readonly message: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/message", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The severity of this log message.
         */
        readonly level: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
        /**
         * An optional name of the logger issuing this message.
         */
        readonly logger: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
         */
        readonly data: v.UnknownSchema;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/resources/updated", undefined>;
    readonly params: v.LooseObjectSchema<{
        /**
         * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/resources/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/tools/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/prompts/list_changed", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>], undefined>;
export const ServerResultSchema: v.UnionSchema<[v.StrictObjectSchema<{
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    readonly protocolVersion: v.StringSchema<undefined>;
    readonly capabilities: v.LooseObjectSchema<{
        /**
         * Experimental, non-standard capabilities that the server supports.
         */
        readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server supports sending log messages to the client.
         */
        readonly logging: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server supports sending completions to the client.
         */
        readonly completions: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server offers any prompt templates.
         */
        readonly prompts: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the prompt list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Present if the server offers any resources to read.
         */
        readonly resources: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports clients subscribing to resource updates.
             */
            readonly subscribe: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * Whether this server supports issuing notifications for changes to the resource list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Present if the server offers any tools to call.
         */
        readonly tools: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the tool list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
    readonly serverInfo: v.LooseObjectSchema<{
        readonly version: v.StringSchema<undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    readonly instructions: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly completion: v.LooseObjectSchema<{
        /**
         * An array of completion values. Must not exceed 100 items.
         */
        readonly values: v.SchemaWithPipe<readonly [v.ArraySchema<v.StringSchema<undefined>, undefined>, v.MaxLengthAction<string[], 100, undefined>]>;
        /**
         * The total number of completion options available. This can exceed the number of values actually sent in the response.
         */
        readonly total: v.OptionalSchema<v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>, undefined>;
        /**
         * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
         */
        readonly hasMore: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /**
     * An optional description for the prompt.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly messages: v.ArraySchema<v.LooseObjectSchema<{
        readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
        readonly content: v.UnionSchema<[v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"text", undefined>;
            /**
             * The text content of the message.
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"image", undefined>;
            /**
             * The base64-encoded image data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the image. Different providers may support different image types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"audio", undefined>;
            /**
             * The base64-encoded audio data.
             */
            readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The MIME type of the audio. Different providers may support different audio types.
             */
            readonly mimeType: v.StringSchema<undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"resource_link", undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * A description of what this resource represents.
             *
             * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
             */
            readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
            readonly name: v.StringSchema<undefined>;
            /**
             * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
             * even by those unfamiliar with domain-specific terminology.
             *
             * If not provided, the name should be used for display (except for Tool,
             * where `annotations.title` should be given precedence over using `name`,
             * if present).
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"resource", undefined>;
            readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
                /**
                 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
                 */
                readonly text: v.StringSchema<undefined>;
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                /**
                 * A base64-encoded string representing the binary data of the item.
                 */
                readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
                 * for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>], undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
    }, undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly prompts: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * An optional description of what this prompt provides
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A list of arguments to use for templating the prompt.
         */
        readonly arguments: v.OptionalSchema<v.ArraySchema<v.LooseObjectSchema<{
            /**
             * The name of the argument.
             */
            readonly name: v.StringSchema<undefined>;
            /**
             * A human-readable description of the argument.
             */
            readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Whether this argument must be provided.
             */
            readonly required: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly resources: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly resourceTemplates: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * A URI template (according to RFC 6570) that can be used to construct resource URIs.
         */
        readonly uriTemplate: v.StringSchema<undefined>;
        /**
         * A description of what this template is for.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly contents: v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    readonly content: v.OptionalSchema<v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"image", undefined>;
        /**
         * The base64-encoded image data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the image. Different providers may support different image types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"audio", undefined>;
        /**
         * The base64-encoded audio data.
         */
        readonly data: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * The MIME type of the audio. Different providers may support different audio types.
         */
        readonly mimeType: v.StringSchema<undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         *
         * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
             * for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>, readonly []>;
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    readonly structuredContent: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
    readonly isError: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly tools: v.ArraySchema<v.LooseObjectSchema<{
        /**
         * A human-readable description of the tool.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A JSON Schema object defining the expected parameters for the tool.
         */
        readonly inputSchema: v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
        /**
         * An optional JSON Schema object defining the structure of the tool's output returned in
         * the structuredContent field of a CallToolResult.
         */
        readonly outputSchema: v.OptionalSchema<v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Optional additional tool information.
         */
        readonly annotations: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * A human-readable title for the tool.
             */
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * If true, the tool does not modify its environment.
             *
             * Default: false
             */
            readonly readOnlyHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, the tool may perform destructive updates to its environment.
             * If false, the tool performs only additive updates.
             *
             * (This property is meaningful only when `readOnlyHint == false`)
             *
             * Default: true
             */
            readonly destructiveHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, calling the tool repeatedly with the same arguments
             * will have no additional effect on the its environment.
             *
             * (This property is meaningful only when `readOnlyHint == false`)
             *
             * Default: false
             */
            readonly idempotentHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            /**
             * If true, this tool may interact with an "open world" of external
             * entities. If false, the tool's domain of interaction is closed.
             * For example, the world of a web search tool is open, whereas that
             * of a memory tool is not.
             *
             * Default: true
             */
            readonly openWorldHint: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
         * for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        /**
         * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
         * even by those unfamiliar with domain-specific terminology.
         *
         * If not provided, the name should be used for display (except for Tool,
         * where `annotations.title` should be given precedence over using `name`,
         * if present).
         */
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    readonly nextCursor: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>], undefined>;
export type ClientCapabilities = v.InferInput<typeof ClientCapabilitiesSchema>;
export type ServerCapabilities = v.InferInput<typeof ServerCapabilitiesSchema>;
export type ClientInfo = v.InferInput<typeof ImplementationSchema>;
export type ServerInfo = v.InferInput<typeof ImplementationSchema>;
export type InitializeRequestParams = v.InferInput<typeof InitializeRequestParamsSchema>;
export type CallToolResult = v.InferInput<typeof CallToolResultSchema>;
export type ReadResourceResult = v.InferInput<typeof ReadResourceResultSchema>;
export type GetPromptResult = v.InferInput<typeof GetPromptResultSchema>;
export type CompleteResult = v.InferInput<typeof CompleteResultSchema>;
export type CreateMessageRequestParams = v.InferInput<typeof CreateMessageRequestParamsSchema>;
export type CreateMessageResult = v.InferInput<typeof CreateMessageResultSchema>;
export type ModelPreferences = v.InferInput<typeof ModelPreferencesSchema>;
export type SamplingMessage = v.InferInput<typeof SamplingMessageSchema>;
export type ModelHint = v.InferInput<typeof ModelHintSchema>;
export type Resource = v.InferInput<typeof ResourceSchema>;
export type JSONRPCRequest = v.InferInput<typeof JSONRPCRequestSchema>;
export type JSONRPCResponse = v.InferInput<typeof JSONRPCResponseSchema>;
import * as v from 'valibot';
