/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { TemplateOptions, CreatedTemplate } from "./internal/internal.js";
 * @import { ReadResourceResult } from "./validation/index.js";
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
 * @param {TemplateOptions<TUri>} options
 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
 */
export function defineTemplate(options, execute) {
	return /** @type {CreatedTemplate<TUri>} */ (
		/** @type {unknown} */ ({
			...options,
			execute,
		})
	);
}
