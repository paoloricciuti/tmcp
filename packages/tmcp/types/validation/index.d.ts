/**
 * A required header was missing, malformed, or mismatched the request body.
 */
export const HEADER_MISMATCH: -32020;
/**
 * The request requires a client capability that was not declared.
 * `error.data` contains `{ requiredCapabilities }`.
 */
export const MISSING_REQUIRED_CLIENT_CAPABILITY: -32021;
/**
 * The requested per-request protocol version is not supported.
 * `error.data` contains `{ supported, requested }`.
 */
export const UNSUPPORTED_PROTOCOL_VERSION: -32022;
export const SUBSCRIPTION_ID_META_KEY: "io.modelcontextprotocol/subscriptionId";
export class McpError extends JSONRPCErrorException {
    constructor(code: number, message: string, data?: unknown);
}
/**
 * The severity of a log message.
 */
export const LoggingLevelSchema: v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>;
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
 * Describes the name and version of an MCP implementation.
 */
export const ImplementationSchema: v.ObjectSchema<{
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
    readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        /**
         * URL or data URI for the icon.
         */
        readonly src: v.StringSchema<undefined>;
        /**
         * Optional MIME type for the icon.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * Optional array of strings that specify sizes at which the icon can be used.
         * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
         *
         * If not provided, the client should assume that the icon can be used at any size.
         */
        readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
    readonly version: v.StringSchema<undefined>;
    readonly websiteUrl: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
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
     * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
     */
    readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the client supports eliciting user input.
     * Accepts both the legacy bare `{}` shape and the modern `{ form?, url? }` sub-shapes.
     */
    readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{
        readonly form: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        readonly url: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * Extensions supported by the client, keyed by prefixed extension identifier.
     */
    readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
    /**
     * Present if the client supports listing roots.
     * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
     */
    readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
        /**
         * Whether the client supports issuing notifications for changes to the roots list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
export const InitializeRequestParamsSchema: v.ObjectSchema<{
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
         * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
         */
        readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the client supports eliciting user input.
         * Accepts both the legacy bare `{}` shape and the modern `{ form?, url? }` sub-shapes.
         */
        readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{
            readonly form: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            readonly url: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Extensions supported by the client, keyed by prefixed extension identifier.
         */
        readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
        /**
         * Present if the client supports listing roots.
         * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
         */
        readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * Whether the client supports issuing notifications for changes to the roots list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
    readonly clientInfo: v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        readonly version: v.StringSchema<undefined>;
        readonly websiteUrl: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
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
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema: v.LooseObjectSchema<{
    readonly contents: v.ArraySchema<v.UnionSchema<[v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
export const DiscoverRequestParamsSchema: v.LooseObjectSchema<{
    readonly _meta: v.LooseObjectSchema<{
        readonly 'io.modelcontextprotocol/protocolVersion': v.StringSchema<undefined>;
        readonly 'io.modelcontextprotocol/clientCapabilities': v.LooseObjectSchema<{
            /**
             * Experimental, non-standard capabilities that the client supports.
             */
            readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports sampling from an LLM.
             * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
             */
            readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            /**
             * Present if the client supports eliciting user input.
             * Accepts both the legacy bare `{}` shape and the modern `{ form?, url? }` sub-shapes.
             */
            readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{
                readonly form: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
                readonly url: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, undefined>;
            /**
             * Extensions supported by the client, keyed by prefixed extension identifier.
             */
            readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
            /**
             * Present if the client supports listing roots.
             * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
             */
            readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * Whether the client supports issuing notifications for changes to the roots list.
                 */
                readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>;
        readonly 'io.modelcontextprotocol/clientInfo': v.OptionalSchema<v.ObjectSchema<{
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
            readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
                /**
                 * URL or data URI for the icon.
                 */
                readonly src: v.StringSchema<undefined>;
                /**
                 * Optional MIME type for the icon.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * Optional array of strings that specify sizes at which the icon can be used.
                 * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
                 *
                 * If not provided, the client should assume that the icon can be used at any size.
                 */
                readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>, undefined>, undefined>;
            readonly version: v.StringSchema<undefined>;
            readonly websiteUrl: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
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
        readonly 'io.modelcontextprotocol/logLevel': v.OptionalSchema<v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>, undefined>;
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
         */
        readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
    }, undefined>;
}, undefined>;
export const SubscriptionsListenRequestSchema: v.ObjectSchema<{
    readonly method: v.LiteralSchema<"subscriptions/listen", undefined>;
    readonly params: v.ObjectSchema<{
        readonly _meta: v.LooseObjectSchema<{
            readonly 'io.modelcontextprotocol/protocolVersion': v.StringSchema<undefined>;
            readonly 'io.modelcontextprotocol/clientCapabilities': v.LooseObjectSchema<{
                /**
                 * Experimental, non-standard capabilities that the client supports.
                 */
                readonly experimental: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
                /**
                 * Present if the client supports sampling from an LLM.
                 * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
                 */
                readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
                /**
                 * Present if the client supports eliciting user input.
                 * Accepts both the legacy bare `{}` shape and the modern `{ form?, url? }` sub-shapes.
                 */
                readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{
                    readonly form: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
                    readonly url: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
                }, undefined>, undefined>;
                /**
                 * Extensions supported by the client, keyed by prefixed extension identifier.
                 */
                readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
                /**
                 * Present if the client supports listing roots.
                 * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
                 */
                readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
                    /**
                     * Whether the client supports issuing notifications for changes to the roots list.
                     */
                    readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
                }, undefined>, undefined>;
            }, undefined>;
            readonly 'io.modelcontextprotocol/clientInfo': v.OptionalSchema<v.ObjectSchema<{
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
                readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
                    /**
                     * URL or data URI for the icon.
                     */
                    readonly src: v.StringSchema<undefined>;
                    /**
                     * Optional MIME type for the icon.
                     */
                    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    /**
                     * Optional array of strings that specify sizes at which the icon can be used.
                     * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
                     *
                     * If not provided, the client should assume that the icon can be used at any size.
                     */
                    readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
                }, undefined>, undefined>, undefined>;
                readonly version: v.StringSchema<undefined>;
                readonly websiteUrl: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
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
            readonly 'io.modelcontextprotocol/logLevel': v.OptionalSchema<v.PicklistSchema<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"], undefined>, undefined>;
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>;
        readonly notifications: v.ObjectSchema<{
            readonly toolsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly promptsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly resourcesListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly resourceSubscriptions: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
    }, undefined>;
}, undefined>;
/**
 * Returned when the server gracefully closes a subscription stream.
 */
export const SubscriptionsListenResultSchema: v.LooseObjectSchema<{
    readonly resultType: v.LiteralSchema<"complete", undefined>;
    readonly _meta: v.LooseObjectSchema<{
        readonly "io.modelcontextprotocol/subscriptionId": v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
    }, undefined>;
}, undefined>;
/**
 * The first notification emitted for a per-request subscription stream.
 */
export const SubscriptionsAcknowledgedNotificationSchema: v.ObjectSchema<{
    readonly method: v.LiteralSchema<"notifications/subscriptions/acknowledged", undefined>;
    readonly params: v.ObjectSchema<{
        readonly _meta: v.LooseObjectSchema<{
            readonly "io.modelcontextprotocol/subscriptionId": v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
        }, undefined>;
        readonly notifications: v.ObjectSchema<{
            readonly toolsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly promptsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly resourcesListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            readonly resourceSubscriptions: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
    }, undefined>;
}, undefined>;
/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResultSchema: v.LooseObjectSchema<{
    /**
     * An optional description for the prompt.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly messages: v.ArraySchema<v.ObjectSchema<{
        readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
        readonly content: v.UnionSchema<[v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
            readonly type: v.LiteralSchema<"resource_link", undefined>;
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
            readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
                /**
                 * URL or data URI for the icon.
                 */
                readonly src: v.StringSchema<undefined>;
                /**
                 * Optional MIME type for the icon.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * Optional array of strings that specify sizes at which the icon can be used.
                 * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
                 *
                 * If not provided, the client should assume that the icon can be used at any size.
                 */
                readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>, undefined>, undefined>;
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
        }, undefined>, v.ObjectSchema<{
            readonly type: v.LiteralSchema<"resource", undefined>;
            readonly resource: v.UnionSchema<[v.ObjectSchema<{
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
            }, undefined>, v.ObjectSchema<{
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
 * The server's response to a tool call.
 */
export const CallToolResultSchema: v.LooseObjectSchema<{
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    readonly content: v.OptionalSchema<v.ArraySchema<v.UnionSchema<[v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
        readonly type: v.LiteralSchema<"resource_link", undefined>;
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
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
    }, undefined>, v.ObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
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
     * Structured tool output. May be ANY JSON value, not only objects.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result and match the schema.
     */
    readonly structuredContent: v.OptionalSchema<v.UnknownSchema, undefined>;
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
export const CreateMessageRequestParamsSchema: v.ObjectSchema<{
    readonly messages: v.ArraySchema<v.ObjectSchema<{
        readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
        readonly content: v.UnionSchema<[v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
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
        }, undefined>, v.ObjectSchema<{
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
    readonly metadata: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
    /**
     * The server's preferences for which model to select.
     */
    readonly modelPreferences: v.OptionalSchema<v.ObjectSchema<{
        /**
         * Optional hints to use for model selection.
         */
        readonly hints: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
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
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
export const CreateMessageResultSchema: v.ObjectSchema<{
    /**
     * The name of the model that generated the message.
     */
    readonly model: v.StringSchema<undefined>;
    /**
     * The reason why sampling stopped.
     */
    readonly stopReason: v.OptionalSchema<v.UnionSchema<[v.PicklistSchema<["endTurn", "stopSequence", "maxTokens"], undefined>, v.StringSchema<undefined>], undefined>, undefined>;
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.VariantSchema<"type", [v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
 * The client's response to an elicitation/create request from the server.
 */
export const ElicitResultSchema: v.ObjectSchema<{
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
 * The server's response to a completion/complete request
 */
export const CompleteResultSchema: v.LooseObjectSchema<{
    readonly completion: v.ObjectSchema<{
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
 * Answers returned by the client. Each name matches one from `inputRequests`.
 * tmcp checks an answer when the handler reaches the matching input call, so
 * unrelated answers are left alone.
 */
export const InputResponsesSchema: v.CustomSchema<any, "Expected an input response map">;
/**
 * A result sent by the server to indicate that additional input is needed
 * before the request can be completed. At least one of `inputRequests` or
 * `requestState` MUST be present.
 */
export const InputRequiredResultSchema: v.SchemaWithPipe<readonly [v.LooseObjectSchema<{
    readonly resultType: v.LiteralSchema<"input_required", undefined>;
    readonly inputRequests: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.ObjectSchema<{
        readonly method: v.LiteralSchema<"elicitation/create", undefined>;
        readonly params: v.UnionSchema<[v.ObjectSchema<{
            readonly mode: v.OptionalSchema<v.LiteralSchema<"form", undefined>, undefined>;
            /**
             * The message to present to the user.
             */
            readonly message: v.StringSchema<undefined>;
            /**
             * The schema for the requested user input.
             */
            readonly requestedSchema: v.ObjectSchema<{
                readonly $schema: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly type: v.LiteralSchema<"object", undefined>;
                readonly properties: v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"boolean", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
                }, undefined>, v.ObjectSchema<{
                    readonly type: v.PicklistSchema<["number", "integer"], undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                }, undefined>, v.UnionSchema<[v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"string", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                    readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                }, undefined>, v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"string", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                }, undefined>, v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"string", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly oneOf: v.ArraySchema<v.ObjectSchema<{
                        readonly const: v.StringSchema<undefined>;
                        readonly title: v.StringSchema<undefined>;
                    }, undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                }, undefined>, v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"array", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly minItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly maxItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly items: v.ObjectSchema<{
                        readonly type: v.LiteralSchema<"string", undefined>;
                        readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                    }, undefined>;
                    readonly default: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
                }, undefined>, v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"array", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly minItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly maxItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly items: v.ObjectSchema<{
                        readonly anyOf: v.ArraySchema<v.ObjectSchema<{
                            readonly const: v.StringSchema<undefined>;
                            readonly title: v.StringSchema<undefined>;
                        }, undefined>, undefined>;
                    }, undefined>;
                    readonly default: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
                }, undefined>], undefined>, v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"string", undefined>;
                    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                    readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                    readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
                    readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                }, undefined>], undefined>, undefined>;
                readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>;
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
                 */
                readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>, v.ObjectSchema<{
            readonly mode: v.LiteralSchema<"url", undefined>;
            readonly message: v.StringSchema<undefined>;
            readonly url: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>;
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
                 */
                readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>], undefined>;
    }, undefined>, v.ObjectSchema<{
        readonly method: v.LiteralSchema<"sampling/createMessage", undefined>;
        readonly params: v.ObjectSchema<{
            readonly messages: v.ArraySchema<v.ObjectSchema<{
                readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
                readonly content: v.UnionSchema<[v.ObjectSchema<{
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
                }, undefined>, v.ObjectSchema<{
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
                }, undefined>, v.ObjectSchema<{
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
            readonly metadata: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
            /**
             * The server's preferences for which model to select.
             */
            readonly modelPreferences: v.OptionalSchema<v.ObjectSchema<{
                /**
                 * Optional hints to use for model selection.
                 */
                readonly hints: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
        readonly method: v.LiteralSchema<"roots/list", undefined>;
        readonly params: v.OptionalSchema<v.LooseObjectSchema<{
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
                /**
                 * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
                 */
                readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
            }, undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>], undefined>, undefined>, undefined>;
    readonly requestState: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.CheckAction<{
    resultType: "input_required";
    inputRequests?: {
        [x: string]: {
            method: "elicitation/create";
            params: {
                mode?: "form" | undefined;
                message: string;
                requestedSchema: {
                    $schema?: string | undefined;
                    type: "object";
                    properties: {
                        [x: string]: {
                            type: "string";
                            title?: string | undefined;
                            description?: string | undefined;
                            enum: string[];
                            enumNames?: string[] | undefined;
                            default?: string | undefined;
                        } | {
                            type: "string";
                            title?: string | undefined;
                            description?: string | undefined;
                            enum: string[];
                            default?: string | undefined;
                        } | {
                            type: "string";
                            title?: string | undefined;
                            description?: string | undefined;
                            oneOf: {
                                const: string;
                                title: string;
                            }[];
                            default?: string | undefined;
                        } | {
                            type: "array";
                            title?: string | undefined;
                            description?: string | undefined;
                            minItems?: number | undefined;
                            maxItems?: number | undefined;
                            items: {
                                type: "string";
                                enum: string[];
                            };
                            default?: string[] | undefined;
                        } | {
                            type: "array";
                            title?: string | undefined;
                            description?: string | undefined;
                            minItems?: number | undefined;
                            maxItems?: number | undefined;
                            items: {
                                anyOf: {
                                    const: string;
                                    title: string;
                                }[];
                            };
                            default?: string[] | undefined;
                        } | {
                            type: "boolean";
                            title?: string | undefined;
                            description?: string | undefined;
                            default?: boolean | undefined;
                        } | {
                            type: "number" | "integer";
                            title?: string | undefined;
                            description?: string | undefined;
                            minimum?: number | undefined;
                            maximum?: number | undefined;
                            default?: number | undefined;
                        } | {
                            type: "string";
                            title?: string | undefined;
                            description?: string | undefined;
                            minLength?: number | undefined;
                            maxLength?: number | undefined;
                            format?: "uri" | "email" | "date" | "date-time" | undefined;
                            default?: string | undefined;
                        };
                    };
                    required?: string[] | undefined;
                };
                _meta?: ({
                    progressToken?: string | number | undefined;
                } & {
                    [key: string]: unknown;
                }) | undefined;
            } | {
                mode: "url";
                message: string;
                url: string;
                _meta?: ({
                    progressToken?: string | number | undefined;
                } & {
                    [key: string]: unknown;
                }) | undefined;
            };
        } | {
            method: "sampling/createMessage";
            params: {
                messages: {
                    role: "user" | "assistant";
                    content: {
                        type: "text";
                        text: string;
                        _meta?: ({} & {
                            [key: string]: unknown;
                        }) | undefined;
                    } | {
                        type: "image";
                        data: string;
                        mimeType: string;
                        _meta?: ({} & {
                            [key: string]: unknown;
                        }) | undefined;
                    } | {
                        type: "audio";
                        data: string;
                        mimeType: string;
                        _meta?: ({} & {
                            [key: string]: unknown;
                        }) | undefined;
                    };
                }[];
                systemPrompt?: string | undefined;
                includeContext?: "none" | "thisServer" | "allServers" | undefined;
                temperature?: number | undefined;
                maxTokens: number;
                stopSequences?: string[] | undefined;
                metadata?: {} | undefined;
                modelPreferences?: {
                    hints?: {
                        name?: string | undefined;
                    }[] | undefined;
                    costPriority?: number | undefined;
                    speedPriority?: number | undefined;
                    intelligencePriority?: number | undefined;
                } | undefined;
                _meta?: ({
                    progressToken?: string | number | undefined;
                } & {
                    [key: string]: unknown;
                }) | undefined;
            };
        } | {
            method: "roots/list";
            params?: ({
                _meta?: ({
                    progressToken?: string | number | undefined;
                } & {
                    [key: string]: unknown;
                }) | undefined;
            } & {
                [key: string]: unknown;
            }) | undefined;
        };
    } | undefined;
    requestState?: string | undefined;
    _meta?: ({} & {
        [key: string]: unknown;
    }) | undefined;
} & {
    [key: string]: unknown;
}, "InputRequiredResult requires inputRequests or requestState">]>;
export type Icons = v.InferInput<typeof IconsSchema>;
export type ClientCapabilities = v.InferInput<typeof ClientCapabilitiesSchema>;
export type ServerCapabilities = v.InferInput<typeof ServerCapabilitiesSchema>;
export type ClientInfo = v.InferInput<typeof ImplementationSchema>;
export type ServerInfo = v.InferInput<typeof ImplementationSchema> & {
    description?: string;
};
export type InitializeRequestParams = v.InferInput<typeof InitializeRequestParamsSchema>;
export type DiscoverRequestParams = v.InferInput<typeof DiscoverRequestParamsSchema>;
export type CallToolResult<TStructuredContent> = v.InferInput<v.LooseObjectSchema<Omit<(typeof CallToolResultSchema)["entries"], "structuredContent" | "isError">, undefined>> & (undefined extends TStructuredContent ? {
    structuredContent?: undefined;
    isError?: boolean;
} : ({
    structuredContent: TStructuredContent;
    isError?: false;
} | {
    isError: true;
    structuredContent?: TStructuredContent;
}));
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
export type JSONRPCMessage = v.InferInput<typeof JSONRPCMessageSchema>;
export type JSONRPCResponse = v.InferInput<typeof JSONRPCResponseSchema>;
export type LoggingLevel = v.InferInput<typeof LoggingLevelSchema>;
export type ToolAnnotations = v.InferInput<typeof ToolAnnotationsSchema>;
export type ElicitResult = v.InferInput<typeof ElicitResultSchema>;
export type InitializeResult = v.InferInput<typeof InitializeResultSchema>;
export type ListToolsResult = v.InferInput<typeof ListToolsResultSchema>;
export type ListPromptsResult = v.InferInput<typeof ListPromptsResultSchema>;
export type ListResourcesResult = v.InferInput<typeof ListResourcesResultSchema>;
export type ListResourceTemplatesResult = v.InferInput<typeof ListResourceTemplatesResultSchema>;
export type EmbeddedResource = v.InferInput<typeof EmbeddedResourceSchema>;
export type ResourceLink = v.InferInput<typeof ResourceLinkSchema>;
export type InputRequests = v.InferInput<typeof InputRequestsSchema>;
export type InputResponses = v.InferInput<typeof InputResponsesSchema>;
export type InputRequiredResult = v.InferInput<typeof InputRequiredResultSchema>;
export type RequestId = v.InferInput<typeof RequestIdSchema>;
export type SubscriptionFilter = v.InferInput<typeof SubscriptionFilterSchema>;
export type SubscriptionsListenResult = v.InferInput<typeof SubscriptionsListenResultSchema>;
export type SubscriptionsListenRequest = v.InferInput<typeof JSONRPCRequestSchema> & v.InferInput<typeof SubscriptionsListenRequestSchema>;
export type SubscriptionsAcknowledgedNotification = v.InferInput<typeof JSONRPCNotificationSchema> & v.InferInput<typeof SubscriptionsAcknowledgedNotificationSchema>;
import { JSONRPCErrorException } from 'json-rpc-2.0';
import * as v from 'valibot';
declare const IconsSchema: v.ObjectSchema<{
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
    readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        /**
         * URL or data URI for the icon.
         */
        readonly src: v.StringSchema<undefined>;
        /**
         * Optional MIME type for the icon.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * Optional array of strings that specify sizes at which the icon can be used.
         * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
         *
         * If not provided, the client should assume that the icon can be used at any size.
         */
        readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
}, undefined>;
/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
declare const ServerCapabilitiesSchema: v.ObjectSchema<{
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    readonly experimental: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the server supports sending log messages to the client.
     * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
     */
    readonly logging: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
    /**
     * Extensions supported by the server, keyed by prefixed extension identifier.
     */
    readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
    /**
     * Present if the server supports sending completions to the client.
     */
    readonly completions: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
    /**
     * Present if the server offers any prompt templates.
     */
    readonly prompts: v.OptionalSchema<v.ObjectSchema<{
        /**
         * Whether this server supports issuing notifications for changes to the prompt list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    /**
     * Present if the server offers any resources to read.
     */
    readonly resources: v.OptionalSchema<v.ObjectSchema<{
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
    readonly tools: v.OptionalSchema<v.ObjectSchema<{
        /**
         * Whether this server supports issuing notifications for changes to the tool list.
         */
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>;
/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
declare const ModelPreferencesSchema: v.ObjectSchema<{
    /**
     * Optional hints to use for model selection.
     */
    readonly hints: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
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
declare const SamplingMessageSchema: v.ObjectSchema<{
    readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
    readonly content: v.UnionSchema<[v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
/**
 * Hints to use for model selection.
 */
declare const ModelHintSchema: v.ObjectSchema<{
    /**
     * A hint for a model name.
     */
    readonly name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * A known resource that the server is capable of reading.
 */
declare const ResourceSchema: v.ObjectSchema<{
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
    readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        /**
         * URL or data URI for the icon.
         */
        readonly src: v.StringSchema<undefined>;
        /**
         * Optional MIME type for the icon.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * Optional array of strings that specify sizes at which the icon can be used.
         * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
         *
         * If not provided, the client should assume that the icon can be used at any size.
         */
        readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
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
 * Additional properties describing a Tool to clients.
 *
 * NOTE: all properties in ToolAnnotations are **hints**.
 * They are not guaranteed to provide a faithful description of
 * tool behavior (including descriptive properties like `title`).
 *
 * Clients should never make tool use decisions based on ToolAnnotations
 * received from untrusted servers.
 */
declare const ToolAnnotationsSchema: v.ObjectSchema<{
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
 * After receiving an initialize request from the client, the server sends this response.
 */
declare const InitializeResultSchema: v.ObjectSchema<{
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    readonly protocolVersion: v.StringSchema<undefined>;
    readonly capabilities: v.ObjectSchema<{
        /**
         * Experimental, non-standard capabilities that the server supports.
         */
        readonly experimental: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server supports sending log messages to the client.
         * @deprecated in the per-request (2026-07-28) protocol; still fully supported for session-negotiated clients.
         */
        readonly logging: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
        /**
         * Extensions supported by the server, keyed by prefixed extension identifier.
         */
        readonly extensions: v.OptionalSchema<v.RecordSchema<v.StringSchema<undefined>, v.LooseObjectSchema<{}, undefined>, undefined>, undefined>;
        /**
         * Present if the server supports sending completions to the client.
         */
        readonly completions: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
        /**
         * Present if the server offers any prompt templates.
         */
        readonly prompts: v.OptionalSchema<v.ObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the prompt list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Present if the server offers any resources to read.
         */
        readonly resources: v.OptionalSchema<v.ObjectSchema<{
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
        readonly tools: v.OptionalSchema<v.ObjectSchema<{
            /**
             * Whether this server supports issuing notifications for changes to the tool list.
             */
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>;
    readonly serverInfo: v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        readonly version: v.StringSchema<undefined>;
        readonly websiteUrl: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
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
 * The server's response to a tools/list request from the client.
 */
declare const ListToolsResultSchema: v.ObjectSchema<{
    readonly tools: v.ArraySchema<v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        /**
         * A human-readable description of the tool.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A JSON Schema object defining the expected parameters for the tool.
         * Any JSON Schema 2020-12 keywords are allowed alongside the required `type: "object"` root.
         */
        readonly inputSchema: v.LooseObjectSchema<{
            readonly $schema: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            readonly type: v.LiteralSchema<"object", undefined>;
        }, undefined>;
        /**
         * An optional JSON Schema object defining the structure of the tool's output returned in
         * the structuredContent field of a CallToolResult. Any JSON Schema 2020-12 keywords are allowed.
         */
        readonly outputSchema: v.OptionalSchema<v.LooseObjectSchema<{
            readonly $schema: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        /**
         * Optional additional tool information.
         */
        readonly annotations: v.OptionalSchema<v.ObjectSchema<{
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
 * The server's response to a prompts/list request from the client.
 */
declare const ListPromptsResultSchema: v.ObjectSchema<{
    readonly prompts: v.ArraySchema<v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
        /**
         * An optional description of what this prompt provides
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A list of arguments to use for templating the prompt.
         */
        readonly arguments: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
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
 * The server's response to a resources/list request from the client.
 */
declare const ListResourcesResultSchema: v.ObjectSchema<{
    readonly resources: v.ArraySchema<v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
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
 * The server's response to a resources/templates/list request from the client.
 */
declare const ListResourceTemplatesResultSchema: v.ObjectSchema<{
    readonly resourceTemplates: v.ArraySchema<v.ObjectSchema<{
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
        readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
            /**
             * URL or data URI for the icon.
             */
            readonly src: v.StringSchema<undefined>;
            /**
             * Optional MIME type for the icon.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * Optional array of strings that specify sizes at which the icon can be used.
             * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
             *
             * If not provided, the client should assume that the icon can be used at any size.
             */
            readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>, undefined>, undefined>;
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
 * The contents of a resource, embedded into a prompt or tool call result.
 */
declare const EmbeddedResourceSchema: v.ObjectSchema<{
    readonly type: v.LiteralSchema<"resource", undefined>;
    readonly resource: v.UnionSchema<[v.ObjectSchema<{
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
    }, undefined>, v.ObjectSchema<{
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
declare const ResourceLinkSchema: v.ObjectSchema<{
    readonly type: v.LiteralSchema<"resource_link", undefined>;
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
    readonly icons: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
        /**
         * URL or data URI for the icon.
         */
        readonly src: v.StringSchema<undefined>;
        /**
         * Optional MIME type for the icon.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * Optional array of strings that specify sizes at which the icon can be used.
         * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
         *
         * If not provided, the client should assume that the icon can be used at any size.
         */
        readonly sizes: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>, undefined>;
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
 * Questions or tasks the client must complete, stored by name.
 */
declare const InputRequestsSchema: v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.ObjectSchema<{
    readonly method: v.LiteralSchema<"elicitation/create", undefined>;
    readonly params: v.UnionSchema<[v.ObjectSchema<{
        readonly mode: v.OptionalSchema<v.LiteralSchema<"form", undefined>, undefined>;
        /**
         * The message to present to the user.
         */
        readonly message: v.StringSchema<undefined>;
        /**
         * The schema for the requested user input.
         */
        readonly requestedSchema: v.ObjectSchema<{
            readonly $schema: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            readonly type: v.LiteralSchema<"object", undefined>;
            readonly properties: v.RecordSchema<v.StringSchema<undefined>, v.UnionSchema<[v.ObjectSchema<{
                readonly type: v.LiteralSchema<"boolean", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly default: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
            }, undefined>, v.ObjectSchema<{
                readonly type: v.PicklistSchema<["number", "integer"], undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minimum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maximum: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly default: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
            }, undefined>, v.UnionSchema<[v.ObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                readonly enumNames: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
                readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>, v.ObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>, v.ObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly oneOf: v.ArraySchema<v.ObjectSchema<{
                    readonly const: v.StringSchema<undefined>;
                    readonly title: v.StringSchema<undefined>;
                }, undefined>, undefined>;
                readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>, v.ObjectSchema<{
                readonly type: v.LiteralSchema<"array", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maxItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly items: v.ObjectSchema<{
                    readonly type: v.LiteralSchema<"string", undefined>;
                    readonly enum: v.ArraySchema<v.StringSchema<undefined>, undefined>;
                }, undefined>;
                readonly default: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>, v.ObjectSchema<{
                readonly type: v.LiteralSchema<"array", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maxItems: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly items: v.ObjectSchema<{
                    readonly anyOf: v.ArraySchema<v.ObjectSchema<{
                        readonly const: v.StringSchema<undefined>;
                        readonly title: v.StringSchema<undefined>;
                    }, undefined>, undefined>;
                }, undefined>;
                readonly default: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
            }, undefined>], undefined>, v.ObjectSchema<{
                readonly type: v.LiteralSchema<"string", undefined>;
                readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                readonly minLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly maxLength: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
                readonly format: v.OptionalSchema<v.PicklistSchema<["email", "uri", "date", "date-time"], undefined>, undefined>;
                readonly default: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            }, undefined>], undefined>, undefined>;
            readonly required: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        }, undefined>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, v.ObjectSchema<{
        readonly mode: v.LiteralSchema<"url", undefined>;
        readonly message: v.StringSchema<undefined>;
        readonly url: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>;
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>], undefined>;
}, undefined>, v.ObjectSchema<{
    readonly method: v.LiteralSchema<"sampling/createMessage", undefined>;
    readonly params: v.ObjectSchema<{
        readonly messages: v.ArraySchema<v.ObjectSchema<{
            readonly role: v.PicklistSchema<["user", "assistant"], undefined>;
            readonly content: v.UnionSchema<[v.ObjectSchema<{
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
            }, undefined>, v.ObjectSchema<{
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
            }, undefined>, v.ObjectSchema<{
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
        readonly metadata: v.OptionalSchema<v.ObjectSchema<{}, undefined>, undefined>;
        /**
         * The server's preferences for which model to select.
         */
        readonly modelPreferences: v.OptionalSchema<v.ObjectSchema<{
            /**
             * Optional hints to use for model selection.
             */
            readonly hints: v.OptionalSchema<v.ArraySchema<v.ObjectSchema<{
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
}, undefined>, v.ObjectSchema<{
    readonly method: v.LiteralSchema<"roots/list", undefined>;
    readonly params: v.OptionalSchema<v.LooseObjectSchema<{
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            readonly progressToken: v.OptionalSchema<v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>, undefined>;
        }, undefined>, undefined>;
    }, undefined>, undefined>;
}, undefined>], undefined>, undefined>;
/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
declare const RequestIdSchema: v.UnionSchema<[v.StringSchema<undefined>, v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>], undefined>;
/**
 * Notification types requested on a per-request subscription stream. Every field
 * is opt-in.
 */
declare const SubscriptionFilterSchema: v.ObjectSchema<{
    readonly toolsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    readonly promptsListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    readonly resourcesListChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    readonly resourceSubscriptions: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
}, undefined>;
export {};
//# sourceMappingURL=index.d.ts.map