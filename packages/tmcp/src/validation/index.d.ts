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
     * See [MCP specification] for notes on _meta usage.
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
     * See [MCP specification] for notes on _meta usage.
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
     * See [MCP specification] for notes on _meta usage.
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
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const TextResourceContentsSchema: v.LooseObjectSchema<{
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    readonly text: v.StringSchema<undefined>;
    /**
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const BlobResourceContentsSchema: v.LooseObjectSchema<{
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
    /**
     * See [MCP specification] for notes on _meta usage.
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
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 */
export const ResourceLinkSchema: v.LooseObjectSchema<{
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * A description of what this resource represents.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly type: v.LiteralSchema<"resource_link", undefined>;
    /**
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
     * See [MCP specification] for notes on _meta usage.
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
     * See [MCP specification] for notes on _meta usage.
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
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    readonly name: v.StringSchema<undefined>;
    readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The URI of this resource.
     */
    readonly uri: v.StringSchema<undefined>;
    /**
     * A description of what this resource represents.
     */
    readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    /**
     * The MIME type of this resource, if known.
     */
    readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly type: v.LiteralSchema<"resource_link", undefined>;
    /**
     * See [MCP specification] for notes on _meta usage.
     */
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>, v.LooseObjectSchema<{
    readonly type: v.LiteralSchema<"resource", undefined>;
    readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
    /**
     * See [MCP specification] for notes on _meta usage.
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
         * See [MCP specification] for notes on _meta usage.
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
         * See [MCP specification] for notes on _meta usage.
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
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>;
}, undefined>;
/**
 * The server's response to a tool call.
 */
export const CallToolResultSchema: v.LooseObjectSchema<{
    /**
     * A list of content objects that represent the result of the tool call.
     */
    readonly content: v.OptionalSchema<v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"text", undefined>;
        /**
         * The text content of the message.
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
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
         * See [MCP specification] for notes on _meta usage.
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
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
        readonly name: v.StringSchema<undefined>;
        readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * A description of what this resource represents.
         */
        readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly type: v.LiteralSchema<"resource_link", undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        readonly type: v.LiteralSchema<"resource", undefined>;
        readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
             */
            readonly text: v.StringSchema<undefined>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * A base64-encoded string representing the binary data of the item.
             */
            readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>, readonly []>;
    /**
     * An object containing structured tool output.
     */
    readonly structuredContent: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    /**
     * Whether the tool call ended in an error.
     */
    readonly isError: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema: v.LooseObjectSchema<{
    readonly contents: v.ArraySchema<v.UnionSchema<[v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
         */
        readonly text: v.StringSchema<undefined>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>, v.LooseObjectSchema<{
        /**
         * The URI of this resource.
         */
        readonly uri: v.StringSchema<undefined>;
        /**
         * The MIME type of this resource, if known.
         */
        readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        /**
         * A base64-encoded string representing the binary data of the item.
         */
        readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
        /**
         * See [MCP specification] for notes on _meta usage.
         */
        readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>], undefined>, undefined>;
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
             * See [MCP specification] for notes on _meta usage.
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
             * See [MCP specification] for notes on _meta usage.
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
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
            readonly name: v.StringSchema<undefined>;
            readonly title: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The URI of this resource.
             */
            readonly uri: v.StringSchema<undefined>;
            /**
             * A description of what this resource represents.
             */
            readonly description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            /**
             * The MIME type of this resource, if known.
             */
            readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
            readonly type: v.LiteralSchema<"resource_link", undefined>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>, v.LooseObjectSchema<{
            readonly type: v.LiteralSchema<"resource", undefined>;
            readonly resource: v.UnionSchema<[v.LooseObjectSchema<{
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
                 */
                readonly text: v.StringSchema<undefined>;
                /**
                 * See [MCP specification] for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>, v.LooseObjectSchema<{
                /**
                 * The URI of this resource.
                 */
                readonly uri: v.StringSchema<undefined>;
                /**
                 * The MIME type of this resource, if known.
                 */
                readonly mimeType: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
                /**
                 * A base64-encoded string representing the binary data of the item.
                 */
                readonly blob: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.Base64Action<string, undefined>]>;
                /**
                 * See [MCP specification] for notes on _meta usage.
                 */
                readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
            }, undefined>], undefined>;
            /**
             * See [MCP specification] for notes on _meta usage.
             */
            readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        }, undefined>], undefined>;
    }, undefined>, undefined>;
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
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
    readonly _meta: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const ClientCapabilitiesSchema: v.LooseObjectSchema<{
    readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
        readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
    }, undefined>, undefined>;
    readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
}, undefined>;
export const InitializeRequestSchema: v.LooseObjectSchema<{
    readonly protocolVersion: v.StringSchema<undefined>;
    readonly capabilities: v.LooseObjectSchema<{
        readonly roots: v.OptionalSchema<v.LooseObjectSchema<{
            readonly listChanged: v.OptionalSchema<v.BooleanSchema<undefined>, undefined>;
        }, undefined>, undefined>;
        readonly sampling: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
        readonly elicitation: v.OptionalSchema<v.LooseObjectSchema<{}, undefined>, undefined>;
    }, undefined>;
}, undefined>;
export type ClientCapabilities = v.InferInput<typeof ClientCapabilitiesSchema>;
export type InitializeRequest = v.InferInput<typeof InitializeRequestSchema>;
export type CallToolResult = v.InferInput<typeof CallToolResultSchema>;
export type ReadResourceResult = v.InferInput<typeof ReadResourceResultSchema>;
export type GetPromptResult = v.InferInput<typeof GetPromptResultSchema>;
export type CompleteResult = v.InferInput<typeof CompleteResultSchema>;
import * as v from 'valibot';
