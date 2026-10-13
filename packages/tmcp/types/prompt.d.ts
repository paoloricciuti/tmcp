/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 */
export function definePrompt<TSchema extends StandardSchemaV1 | undefined = undefined>(options: PromptOptions<TSchema>, execute: TSchema extends undefined ? (() => Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult): CreatedPrompt<TSchema>;
/**
 * A prompt created with `definePrompt`.
 */
export type CreatedPrompt<TSchema extends StandardSchemaV1 | undefined = undefined> = PromptOptions<TSchema> & {
    [created_prompt]: typeof created_prompt;
};
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { PromptOptions } from "./internal/internal.js";
import type { GetPromptResult } from "./validation/index.js";
//# sourceMappingURL=prompt.d.ts.map