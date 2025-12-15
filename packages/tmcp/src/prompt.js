/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { PromptOptions, CreatedPrompt } from "./internal/internal.js";
 * @import { GetPromptResult } from "./validation/index.js"
 */

/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 *
 * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
 * @param {PromptOptions<TSchema>} options
 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
 */
export function definePrompt(options, execute) {
	// eslint-disable-next-line jsdoc/no-undefined-types
	return /** @type {CreatedPrompt<TSchema>} */ (
		/** @type {unknown} */ ({
			...options,
			execute,
		})
	);
}
