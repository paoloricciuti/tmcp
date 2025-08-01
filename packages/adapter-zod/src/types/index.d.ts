declare module '@tmcp/adapter-zod' {
	import type { JsonSchemaAdapter } from 'tmcp/adapter';
	import * as z from 'zod';
	/**
	 * Zod adapter for converting Zod schemas to JSON Schema format
	 * 
	 */
	export class ZodJsonSchemaAdapter extends JsonSchemaAdapter<z.ZodType<any, any, z.core.$ZodTypeInternals<any, any>>> {
		constructor();
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map