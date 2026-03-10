export type InputSchema = {
	type: 'object';
	properties?: Record<
		string,
		{
			type?: string;
			description?: string;
			enum?: Array<unknown>;
			default?: unknown;
			items?: { type?: string };
		}
	>;
	required?: Array<string>;
};

export type Tool = {
	name: string;
	description?: string;
	inputSchema: InputSchema;
};
