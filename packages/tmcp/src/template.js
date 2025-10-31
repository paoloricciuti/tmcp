/**
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { Completion } from "./internal/internal.js";
 */

/**
 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
 * be invoked to provide completions for the template variables to the user.
 * Use the description and title to help the user to understand what the resource is.
 *
 * @template {string} TUri
 * @template {ExtractURITemplateVariables<TUri>} TVariables
 */
export class Template {
	/**
	 * @param {{ name: string; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; uri: TUri; complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>; list?: () => Promise<Array<import("./index.js").Resource>> | Array<import("./index.js").Resource> } & import("./index.js").Icons} options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<import("./index.js").ReadResourceResult> | import("./index.js").ReadResourceResult} execute
	 */
	constructor(
		{ name, description, title, uri, complete, list, enabled, icons },
		execute,
	) {
		this.name = name;
		this.description = description;
		this.title = title;
		this.uri = uri;
		this.complete = complete;
		this.list = list;
		this.enabled = enabled;
		this.icons = icons;
		this.execute = execute;
	}
}
