declare module '@tmcp/adapter-zod-v3' {
	import type { ZodSchema } from 'zod';
	import type { JsonSchemaAdapter } from 'tmcp/adapter';
	/**
	 * Zod adapter for converting Zod schemas to JSON Schema format
	 * 
	 */
	export default class ZodV3JsonSchemaAdapter_1 extends JsonSchemaAdapter<ZodSchema<any, import("zod").ZodTypeDef, any>> {
		constructor();
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map