/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 */

/**
 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
 * Use the description and title to help the user to understand what the resource is.
 */
export class Resource {
	/**
	 * @param {{ name: string; description: string; title?: string; uri: string, enabled?: ()=>boolean | Promise<boolean>; } & import("./index.js").Icons} options
	 * @param {(uri: string) => Promise<import("./index.js").ReadResourceResult> | import("./index.js").ReadResourceResult} execute
	 */
	constructor({ name, description, title, uri, enabled, icons }, execute) {
		this.name = name;
		this.description = description;
		this.title = title;
		this.uri = uri;
		this.enabled = enabled;
		this.icons = icons;
		this.execute = execute;
	}
}
