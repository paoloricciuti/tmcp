export type JsonSchema = {
	type?: string | Array<string>;
	title?: string;
	description?: string;
	default?: unknown;
	enum?: Array<unknown>;
	properties?: Record<string, JsonSchema>;
	required?: Array<string>;
	items?: JsonSchema | Array<JsonSchema>;
	additionalProperties?: boolean | JsonSchema;
	oneOf?: Array<JsonSchema>;
	anyOf?: Array<JsonSchema>;
	allOf?: Array<JsonSchema>;
	[key: string]: unknown;
};

export type InputSchema = JsonSchema & {
	type: 'object';
};

export type Tool = {
	name: string;
	title?: string;
	description?: string;
	icons?: Array<unknown>;
	annotations?: Record<string, unknown>;
	_meta?: Record<string, unknown>;
	inputSchema: InputSchema;
	outputSchema?: JsonSchema;
};

export type ListToolsResult = {
	tools: Array<Tool>;
	nextCursor?: string;
};
