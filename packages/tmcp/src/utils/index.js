/**
 * @import { EmbeddedResource, ResourceLink, CallToolResult, ReadResourceResult, GetPromptResult,  CompleteResult } from "../validation/index.js";
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
