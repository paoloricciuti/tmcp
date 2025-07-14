/* eslint-disable jsdoc/no-undefined-types */
import * as v from 'valibot';

/**
 * Text provided to or from an LLM.
 */
export const TextContentSchema = v.looseObject({
	type: v.literal('text'),
	/**
	 * The text content of the message.
	 */
	text: v.string(),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * An image provided to or from an LLM.
 */
export const ImageContentSchema = v.looseObject({
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
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * An Audio provided to or from an LLM.
 */
export const AudioContentSchema = v.looseObject({
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
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * The contents of a specific resource or sub-resource.
 */
export const ResourceContentsSchema = v.looseObject({
	/**
	 * The URI of this resource.
	 */
	uri: v.string(),
	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

export const TextResourceContentsSchema = v.looseObject({
	/**
	 * The URI of this resource.
	 */
	uri: v.string(),
	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),
	/**
	 * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
	 */
	text: v.string(),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

export const BlobResourceContentsSchema = v.looseObject({
	/**
	 * The URI of this resource.
	 */
	uri: v.string(),
	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),
	/**
	 * A base64-encoded string representing the binary data of the item.
	 */
	blob: v.pipe(v.string(), v.base64()),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export const EmbeddedResourceSchema = v.looseObject({
	type: v.literal('resource'),
	resource: v.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 */
export const ResourceLinkSchema = v.looseObject({
	/** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
	name: v.string(),
	title: v.optional(v.string()),
	/**
	 * The URI of this resource.
	 */
	uri: v.string(),
	/**
	 * A description of what this resource represents.
	 */
	description: v.optional(v.string()),
	/**
	 * The MIME type of this resource, if known.
	 */
	mimeType: v.optional(v.string()),
	type: v.literal('resource_link'),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
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
export const PromptMessageSchema = v.looseObject({
	role: v.picklist(['user', 'assistant']),
	content: ContentBlockSchema,
});

/**
 * The server's response to a tool call.
 */
export const CallToolResultSchema = v.looseObject({
	/**
	 * A list of content objects that represent the result of the tool call.
	 */
	content: v.optional(v.array(ContentBlockSchema), []),

	/**
	 * An object containing structured tool output.
	 */
	structuredContent: v.optional(v.looseObject({})),

	/**
	 * Whether the tool call ended in an error.
	 */
	isError: v.optional(v.boolean()),
	_meta: v.optional(v.looseObject({})),
});

/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema = v.looseObject({
	contents: v.array(
		v.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
	),
	_meta: v.optional(v.looseObject({})),
});

/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResultSchema = v.looseObject({
	/**
	 * An optional description for the prompt.
	 */
	description: v.optional(v.string()),
	messages: v.array(PromptMessageSchema),
	_meta: v.optional(v.looseObject({})),
});

/**
 * The server's response to a completion/complete request
 */
export const CompleteResultSchema = v.looseObject({
	completion: v.looseObject({
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
	_meta: v.optional(v.looseObject({})),
});

/**
 * @typedef {v.InferInput<typeof CallToolResultSchema>} CallToolResult
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
