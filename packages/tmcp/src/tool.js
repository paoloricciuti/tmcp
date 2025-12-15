/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { ToolOptions, CreatedTool } from "./internal/internal.js";
 */

/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 *
 * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
 * @template {StandardSchemaV1 | undefined} [TOutputSchema=undefined]
 * @param {ToolOptions<TSchema, TOutputSchema>} options
 * @param {TSchema extends undefined ? (()=>Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} execute
 */
export function defineTool(options, execute) {
	// eslint-disable-next-line jsdoc/no-undefined-types
	return /** @type {CreatedTool<TSchema, TOutputSchema>} */ (
		/** @type {unknown} */ ({
			...options,
			execute,
		})
	);
}
