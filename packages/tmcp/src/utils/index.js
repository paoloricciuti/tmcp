/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { EmbeddedResource, ResourceLink, ReadResourceResult, GetPromptResult, CompleteResult } from "../validation/index.js";
 * @import { CallToolResult } from "../index.js";
 */

/**
 * @satisfies {Record<string, (...args: any[])=>CallToolResult<any>>}
 */
export const tool = {
	/**
	 * @param {string} text
	 */
	text(text) {
		return {
			content: [
				{
					type: /** @type {const} */ ('text'),
					text,
				},
			],
		};
	},
	/**
	 * @param {string} text
	 */
	error(text) {
		return {
			isError: true,
			content: [
				{
					type: /** @type {const} */ ('text'),
					text,
				},
			],
		};
	},
	/**
	 * @param {"audio" | "image"} type
	 * @param {string} data
	 * @param {string} mime_type
	 */
	media(type, data, mime_type) {
		return {
			content: [
				{
					type,
					data,
					mimeType: mime_type,
				},
			],
		};
	},
	/**
	 * @param {EmbeddedResource["resource"]} resource
	 */
	resource(resource) {
		return {
			content: [
				{
					type: /** @type {const} */ ('resource'),
					resource,
				},
			],
		};
	},

	/**
	 * @param {Omit<ResourceLink, "type">} resource_link
	 */
	resourceLink(resource_link) {
		return {
			content: [
				{
					type: /** @type {const} */ ('resource_link'),
					...resource_link,
				},
			],
		};
	},
	/**
	 * @template {Record<string, unknown>} T
	 * @param {T} obj
	 */
	structured(obj) {
		return /** @type {const} */ ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(obj),
				},
			],
			structuredContent: obj,
		});
	},
	/**
	 * @template {Record<string, unknown> | undefined} [T=undefined]
	 * @param {Array<CallToolResult<undefined>>} results
	 * @param {T} [obj]
	 */
	mix(results, obj) {
		return /** @type {CallToolResult<T>} */ ({
			isError: results.some((r) => r.isError),
			content: results.flatMap((r) => (r.content ? r.content : [])),
			structuredContent: obj,
		});
	},
};
/**
 * @satisfies {Record<string, (...args: any[])=>ReadResourceResult>}
 */
export const resource = {
	/**
	 * @param {string} uri
	 * @param {string} text
	 * @param {string} [mime_type]
	 */
	text(uri, text, mime_type) {
		return {
			contents: [
				{
					uri,
					text,
					mimeType: mime_type,
				},
			],
		};
	},
	/**
	 * @param {string} uri
	 * @param {string} blob
	 * @param {string} [mime_type]
	 */
	blob(uri, blob, mime_type) {
		return {
			contents: [
				{
					uri,
					blob,
					mimeType: mime_type,
				},
			],
		};
	},
	/**
	 *
	 * @param {Array<ReadResourceResult>} resources
	 */
	mix(resources) {
		return {
			contents: resources.flatMap((resource) => resource.contents),
		};
	},
};

/**
 * @satisfies {Record<string, (...args: any[])=>GetPromptResult>}
 */
export const prompt = {
	/**
	 *
	 * @param {string} text
	 */
	message(text) {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text,
					},
				},
			],
		};
	},
	/**
	 * Alias for message
	 * @param {string} text
	 */
	text(text) {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text,
					},
				},
			],
		};
	},
	/**
	 *
	 * @param {"audio" | "image"} type
	 * @param {string} data
	 * @param {string} mime_type
	 */
	media(type, data, mime_type) {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type,
						data,
						mimeType: mime_type,
					},
				},
			],
		};
	},
	/**
	 * @param {EmbeddedResource["resource"]} resource
	 */
	resource(resource) {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'resource',
						resource,
					},
				},
			],
		};
	},

	/**
	 * @param {Omit<ResourceLink, "type">} resource
	 */
	resourceLink(resource) {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'resource_link',
						...resource,
					},
				},
			],
		};
	},
	/**
	 *
	 * @param {Array<GetPromptResult>} messages
	 */
	mix(messages) {
		return {
			messages: messages.flatMap((m) => m.messages),
		};
	},
	/**
	 *
	 * @param {Array<string>} messages
	 * @returns
	 */
	messages(messages) {
		return {
			messages: messages.map((message) => {
				return {
					role: 'user',
					content: {
						type: 'text',
						text: message,
					},
				};
			}),
		};
	},
	/**
	 *
	 * @param {Array<GetPromptResult["messages"][number]["content"]>} messages
	 * @returns
	 * @deprecated Use `mix` instead
	 */
	various(messages) {
		return {
			messages: messages.map((content) => {
				return {
					role: 'user',
					content,
				};
			}),
		};
	},
};
/**
 * @satisfies {Record<string, (...args: any[])=>CompleteResult>}
 */
export const complete = {
	/**
	 *
	 * @param {Array<string>} values
	 * @param {boolean} [has_more]
	 * @param {number} [total]
	 */
	values(values, has_more, total) {
		return {
			completion: {
				values,
				hasMore: has_more,
				total,
			},
		};
	},
};

/**
 * Error class to break out of the tool loop early with a message.
 * Throw this from a tool's execute function to stop the loop and return the message as the answer.
 */
export class BreakLoopError extends Error {
	/**
	 * @param {string} message
	 */
	constructor(message) {
		super(message);
		this.name = 'BreakLoopError';
	}
}

/**
 * @import { McpServer, CreateMessageRequestParams, CreateMessageResult } from "../index.js";
 * @import { CreatedTool } from "../internal/internal.js";
 */
import { executeTool } from '../tool.js';

/**
 * @typedef {Object} LoopResult
 * @property {CreateMessageResult<true>} response
 * @property {Array<CreateMessageRequestParams<any>["messages"][number]>} transcript
 */

/**
 * @typedef {Object} LoopOptions
 * @property {McpServer<any, any>} server - The MCP server instance to use for messaging
 * @property {Array<CreateMessageRequestParams<any>["messages"][number]>} initialMessages - Initial messages to start the conversation
 * @property {Array<CreatedTool<any, any>>} tools - Array of tools available for the LLM to call
 * @property {string} [systemPrompt] - Optional system prompt
 * @property {number} [maxIterations] - Maximum number of iterations (defaults to Infinity)
 * @property {number} [maxTokens] - Maximum tokens for each message request (defaults to 4000)
 * @property {"auto" | "required" | "none"} [defaultToolChoice] - Default tool choice mode (defaults to 'auto')
 */

/**
 * @param {CreatedTool<any, any>[]} tools
 * @param {Array<{ id: string; name: string; input?: Record<string, unknown> }>} tool_calls
 * @returns {Promise<Array<{ type: 'tool_result'; toolUseId: string; content?: CallToolResult<any>["content"]; isError?: boolean }>>}
 */
async function call_tools(tools, tool_calls) {
	const results = await Promise.all(
		tool_calls.map(async (tool_call) => {
			const tool = tools.find((t) => t.name === tool_call.name);
			if (!tool) {
				return {
					type: /** @type {const} */ ('tool_result'),
					toolUseId: tool_call.id,
					content: /** @type {CallToolResult<any>["content"]} */ ([
						{
							type: 'text',
							text: `Tool "${tool_call.name}" not found`,
						},
					]),
					isError: true,
				};
			}
			try {
				const result = /** @type {CallToolResult<any>} */ (
					await executeTool(tool, tool_call.input)
				);
				return {
					type: /** @type {const} */ ('tool_result'),
					toolUseId: tool_call.id,
					content: result.content,
					isError: result.isError,
				};
			} catch (error) {
				// Re-throw BreakLoopError to be handled by the loop
				if (error instanceof BreakLoopError) {
					throw error;
				}
				return {
					type: /** @type {const} */ ('tool_result'),
					toolUseId: tool_call.id,
					content: /** @type {CallToolResult<any>["content"]} */ ([
						{
							type: 'text',
							text:
								error instanceof Error
									? error.message
									: 'Unknown error occurred',
						},
					]),
					isError: true,
				};
			}
		}),
	);
	return results;
}

export const sampling = {
	/**
	 * Runs an agentic loop that sends messages to the LLM and executes tool calls until the LLM returns a final answer.
	 *
	 * @param {LoopOptions} options
	 * @returns {Promise<LoopResult>}
	 */
	async loop(options) {
		const messages =
			/** @type {Array<CreateMessageRequestParams<any>["messages"][number]>} */ ([
				...options.initialMessages,
			]);

		let iteration = 0;
		const max_iterations =
			options.maxIterations ?? Number.POSITIVE_INFINITY;
		const max_tokens = options.maxTokens ?? 4000;
		const default_tool_choice = options.defaultToolChoice ?? 'auto';

		/** @type {Parameters<typeof options.server.message>[0] | undefined} */
		let request;
		/** @type {CreateMessageResult<true> | undefined} */
		let response;

		while (iteration < max_iterations) {
			iteration++;

			const is_last_iteration = iteration >= max_iterations;

			// Request message from LLM with available tools
			request = {
				messages,
				systemPrompt: options.systemPrompt,
				maxTokens: max_tokens,
				// Don't pass tools on the last iteration to force a final answer
				tools: is_last_iteration ? undefined : options.tools,
				// Don't allow tool calls at the last iteration: finish with an answer no matter what!
				toolChoice: {
					mode: is_last_iteration ? 'none' : default_tool_choice,
				},
			};
			response = /** @type {CreateMessageResult<true>} */ (
				await options.server.message(request)
			);

			// Add assistant's response to message history
			messages.push({
				role: 'assistant',
				content: response.content,
			});

			if (response.stopReason === 'toolUse') {
				const content_array = Array.isArray(response.content)
					? response.content
					: [response.content];
				const tool_calls = content_array.filter(
					(content) => content.type === 'tool_use',
				);

				let tool_results;

				tool_results = await call_tools(
					options.tools,
					/** @type {Array<{ id: string; name: string; input?: Record<string, unknown> }>} */ (
						tool_calls
					),
				);

				messages.push({
					role: 'user',
					content: tool_results,
				});
			} else if (response.stopReason === 'endTurn') {
				return {
					response,
					transcript: messages,
				};
			} else if (response.stopReason === 'maxTokens') {
				throw new Error('LLM response hit max tokens limit');
			} else {
				throw new Error(
					`Unsupported stop reason: ${response.stopReason}`,
				);
			}
		}

		throw new Error(
			`Tool loop exceeded maximum iterations (${max_iterations}); request: ${JSON.stringify(request)}\nresponse: ${JSON.stringify(response)}`,
		);
	},
};
