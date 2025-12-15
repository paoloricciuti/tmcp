/**
 * @import { ResourceOptions, CreatedResource } from "./internal/internal.js";
 * @import { ReadResourceResult } from "./validation/index.js";
 */

/**
 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
 * Use the description and title to help the user to understand what the resource is.
 *
 * @param {ResourceOptions} options
 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
 */
export function defineResource(options, execute) {
	return /** @type {CreatedResource} */ (
		/** @type {unknown} */ ({
			...options,
			execute,
		})
	);
}
