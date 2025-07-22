declare module '@tmcp/adapter-valibot' {
	import type { GenericSchema } from 'valibot';
	import type { JsonSchemaAdapter } from 'tmcp/adapter';
	/**
	 * Valibot adapter for converting Valibot schemas to JSON Schema format
	 * 
	 */
	export class ValibotJsonSchemaAdapter extends JsonSchemaAdapter<GenericSchema> {
		constructor();
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map