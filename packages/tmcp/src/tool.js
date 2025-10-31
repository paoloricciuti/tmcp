/**
 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
 */
export class Tool {
	/**
	 * @param {{ name: string; _meta?: Record<string, any>; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; schema?: import("@standard-schema/spec").StandardSchemaV1; outputSchema?: import("@standard-schema/spec").StandardSchemaV1; annotations?: import("./validation/index.js").ToolAnnotations } & import("./index.js").Icons} options
	 * @param {((input?: any) => Promise<import("./index.js").CallToolResult<any>> | import("./index.js").CallToolResult<any>)} execute
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
