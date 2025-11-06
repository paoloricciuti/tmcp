/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { ToolAnnotations } from "./validation/index.js";
 */

/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 *
 * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
 * @template {StandardSchemaV1 | undefined} [TOutputSchema=undefined]
 */
export class Tool {
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
	 * @type {(StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema> extends Record<string, unknown> ? TOutputSchema : never) | undefined}
	 */
	outputSchema;
	/**
	 * @readonly
	 */
	annotations;
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
	 */
	_meta;
	/**
	 * This is only available in the Tool class. Pass the execute function as the second argument.
	 * @readonly
	 * @private
	 * @deprecated
	 * @type {*}
	 */
	execute;
	/**
	 * @param {{ name: string; _meta?: Record<string, any>; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; outputSchema?: StandardSchemaV1.InferOutput<TOutputSchema extends undefined ? never : TOutputSchema> extends Record<string, unknown> ? TOutputSchema : never; annotations?: ToolAnnotations } & import("./index.js").Icons} options
	 * @param {TSchema extends undefined ? (()=>Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | import("./index.js").CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} execute
	 */
	constructor(
		{
			name,
			description,
			title,
			schema,
			outputSchema,
			annotations,
			enabled,
			icons,
			_meta,
		},
		execute,
	) {
		this.name = name;
		this.description = description;
		this.title = title;
		this.schema = schema;
		this.outputSchema = outputSchema;
		this.annotations = annotations;
		this.enabled = enabled;
		this.icons = icons;
		this._meta = _meta;
		this.execute = execute;
	}
}
