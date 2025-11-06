/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { Completion } from "./internal/internal.js";
 */

/**
 * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
 * Use the description and title to help the user to understand what the prompt does and when to use it.
 *
 * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
 * for each input that will be used to provide completions for the user.
 *
 * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
 */
export class Prompt {
	/**
	 * @readonly
	 */
	name;
	/**
	 * @readonly
	 */
	description;
	/**
	 * @readonly
	 */
	title;
	/**
	 * @readonly
	 * @type {(StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never) | undefined}
	 */
	schema;
	/**
	 * @readonly
	 */
	complete;
	/**
	 * @readonly
	 */
	enabled;
	/**
	 * @readonly
	 */
	icons;
	/**
	 * @readonly
	 * @type {*}
	 */
	execute;

	/**
	 * @param {{ name: string; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>>> } & import("./index.js").Icons} options
	 * @param {TSchema extends undefined ? (()=>Promise<import("./index.js").GetPromptResult> | import("./index.js").GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<import("./index.js").GetPromptResult> | import("./index.js").GetPromptResult} execute
	 */
	constructor(
		{ name, description, title, schema, complete, enabled, icons },
		execute,
	) {
		this.name = name;
		this.description = description;
		this.title = title;
		this.schema = schema;
		this.complete = complete;
		this.enabled = enabled;
		this.icons = icons;
		this.execute = execute;
	}
}
