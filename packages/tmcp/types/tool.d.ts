/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 */
export function defineTool<TSchema extends StandardSchemaV1 | undefined = undefined, TOutputSchema extends StandardSchemaV1 | undefined = undefined>(options: ToolOptions<TSchema, TOutputSchema>, execute: TSchema extends undefined ? (() => Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)): CreatedTool<TSchema, TOutputSchema>;
/**
 * A tool created with `defineTool`.
 */
export type CreatedTool<TSchema extends StandardSchemaV1 | undefined = undefined, TOutputSchema extends StandardSchemaV1 | undefined = undefined> = ToolOptions<TSchema, TOutputSchema> & {
    [created_tool]: typeof created_tool;
};
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ToolOptions } from "./internal/internal.js";
//# sourceMappingURL=tool.d.ts.map