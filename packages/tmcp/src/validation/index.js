/* eslint-disable jsdoc/no-undefined-types */
import * as v from 'valibot';
import { ProtocolVersionSchema } from './version.js';

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
 * A model hint for sampling requests.
 */
export const ModelHintSchema = v.looseObject({
	/**
	 * Optional name of the model.
	 */
	name: v.optional(v.string()),
});

/**
 * A sampling message used in sampling requests.
 */
export const SamplingMessageSchema = v.looseObject({
	role: v.picklist(['user', 'assistant']),
	content: ContentBlockSchema,
});

/**
 * Model preferences for sampling requests.
 */
export const ModelPreferencesSchema = v.looseObject({
	/**
	 * Optional hints for which model to use, in order of preference.
	 */
	hints: v.optional(v.array(ModelHintSchema)),
	/**
	 * Priority for cost considerations (0-1, where 1 is highest priority).
	 */
	costPriority: v.optional(v.number()),
	/**
	 * Priority for speed considerations (0-1, where 1 is highest priority).
	 */
	speedPriority: v.optional(v.number()),
	/**
	 * Priority for intelligence considerations (0-1, where 1 is highest priority).
	 */
	intelligencePriority: v.optional(v.number()),
});

/**
 * Request for sampling/createMessage.
 */
export const CreateMessageRequestSchema = v.looseObject({
	/**
	 * The messages to be processed.
	 */
	messages: v.array(SamplingMessageSchema),
	/**
	 * Optional system prompt to provide context.
	 */
	systemPrompt: v.optional(v.string()),
	/**
	 * Optional context inclusion preference.
	 */
	includeContext: v.optional(
		v.picklist(['none', 'thisServer', 'allServers']),
	),
	/**
	 * Optional temperature for generation.
	 */
	temperature: v.optional(v.number()),
	/**
	 * Maximum number of tokens to generate.
	 */
	maxTokens: v.pipe(v.number(), v.integer(), v.minValue(1)),
	/**
	 * Optional stop sequences.
	 */
	stopSequences: v.optional(v.array(v.string())),
	/**
	 * Optional metadata for the request.
	 */
	metadata: v.optional(v.looseObject({})),
	/**
	 * Optional model preferences for the request.
	 */
	modelPreferences: v.optional(ModelPreferencesSchema),
});

/**
 * Response for sampling/createMessage.
 */
export const CreateMessageResultSchema = v.looseObject({
	/**
	 * The model that generated the message.
	 */
	model: v.string(),
	/**
	 * Optional stop reason.
	 */
	stopReason: v.optional(
		v.union([
			v.literal('endTurn'),
			v.literal('stopSequence'),
			v.literal('maxTokens'),
			v.string(),
		]),
	),
	/**
	 * The role of the generated message.
	 */
	role: v.picklist(['user', 'assistant']),
	/**
	 * The content of the generated message.
	 */
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

export const ClientCapabilitiesSchema = v.looseObject({
	roots: v.optional(
		v.looseObject({
			listChanged: v.optional(v.boolean()),
		}),
	),
	sampling: v.optional(v.looseObject({})),
	elicitation: v.optional(v.looseObject({})),
	experimental: v.optional(v.looseObject({})),
});

/**
 * Client implementation information
 */
export const ClientInfoSchema = v.looseObject({
	name: v.string(),
	version: v.string(),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

export const InitializeRequestSchema = v.looseObject({
	protocolVersion: ProtocolVersionSchema, // Use flexible validation for negotiation
	capabilities: ClientCapabilitiesSchema,
	clientInfo: v.optional(ClientInfoSchema),
});

/**
 * Server capabilities that can be declared during initialization
 */
export const ServerCapabilitiesSchema = v.looseObject({
	prompts: v.optional(
		v.looseObject({
			listChanged: v.optional(v.boolean()),
		}),
	),
	resources: v.optional(
		v.looseObject({
			subscribe: v.optional(v.boolean()),
			listChanged: v.optional(v.boolean()),
		}),
	),
	tools: v.optional(
		v.looseObject({
			listChanged: v.optional(v.boolean()),
		}),
	),
	logging: v.optional(v.looseObject({})),
	experimental: v.optional(v.looseObject({})),
});

/**
 * Server implementation information
 */
export const ServerInfoSchema = v.looseObject({
	name: v.string(),
	version: v.string(),
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * Initialize response schema
 */
export const InitializeResponseSchema = v.looseObject({
	protocolVersion: v.string(),
	capabilities: ServerCapabilitiesSchema,
	serverInfo: ServerInfoSchema,
	/**
	 * See [MCP specification] for notes on _meta usage.
	 */
	_meta: v.optional(v.looseObject({})),
});

/**
 * @typedef {v.InferInput<typeof ClientCapabilitiesSchema>} ClientCapabilities
 */

/**
 * @typedef {v.InferInput<typeof ServerCapabilitiesSchema>} ServerCapabilities
 */

/**
 * @typedef {v.InferInput<typeof ClientInfoSchema>} ClientInfo
 */

/**
 * @typedef {v.InferInput<typeof ServerInfoSchema>} ServerInfo
 */

/**
 * @typedef {v.InferInput<typeof InitializeResponseSchema>} InitializeResponse
 */

/**
 * @typedef {v.InferInput<typeof InitializeRequestSchema>} InitializeRequest
 */

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

/**
 * @typedef {v.InferInput<typeof CreateMessageRequestSchema>} CreateMessageRequest
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
 * JSON-RPC 2.0 Request
 */
export const JSONRPCRequestSchema = v.looseObject({
	jsonrpc: v.literal('2.0'),
	method: v.string(),
	params: v.optional(v.union([v.array(v.unknown()), v.looseObject({})])),
	id: v.optional(v.union([v.string(), v.number(), v.null()])),
});

/**
 * JSON-RPC 2.0 Response Success
 */
export const JSONRPCResponseSuccessSchema = v.looseObject({
	jsonrpc: v.literal('2.0'),
	result: v.unknown(),
	id: v.union([v.string(), v.number(), v.null()]),
});

/**
 * JSON-RPC 2.0 Response Error
 */
export const JSONRPCResponseErrorSchema = v.looseObject({
	jsonrpc: v.literal('2.0'),
	error: v.looseObject({
		code: v.number(),
		message: v.string(),
		data: v.optional(v.unknown()),
	}),
	id: v.union([v.string(), v.number(), v.null()]),
});

/**
 * JSON-RPC 2.0 Response (Success or Error)
 */
export const JSONRPCResponseSchema = v.union([
	JSONRPCResponseSuccessSchema,
	JSONRPCResponseErrorSchema,
]);

/**
 * @typedef {v.InferInput<typeof JSONRPCRequestSchema>} JSONRPCRequest
 */

/**
 * @typedef {v.InferInput<typeof JSONRPCResponseSchema>} JSONRPCResponse
 */

// Export only necessary version utilities
export {
	ProtocolVersionSchema,
	SupportedProtocolVersionSchema,
	get_supported_versions,
	negotiate_protocol_version,
	should_version_negotiation_fail,
} from './version.js';

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
