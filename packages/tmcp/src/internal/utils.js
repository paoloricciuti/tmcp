/**
 * @import {McpEvents} from "./internal.js"
 */
/**
 *	@template {keyof McpEvents} Key
 * @param {Key} type
 * @param {Parameters<McpEvents[Key]>[0]} detail
 * @returns
 */
export function event(type, detail) {
	return new CustomEvent(type, { detail });
}
