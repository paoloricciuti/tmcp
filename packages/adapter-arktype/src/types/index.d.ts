declare module '@tmcp/adapter-arktype' {
	import type { JsonSchemaAdapter } from 'tmcp/adapter';
	/**
	 * ArkType adapter for converting ArkType schemas to JSON Schema format
	 * 
	 */
	export class ArktypeJsonSchemaAdapter extends JsonSchemaAdapter<import("arktype").BaseType<unknown, {}>> {
		constructor();
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map