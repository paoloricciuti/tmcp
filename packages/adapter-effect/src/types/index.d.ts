declare module '@tmcp/adapter-effect' {
	import type { StandardSchemaV1 } from '@standard-schema/spec';
	import type { SchemaClass } from 'effect/Schema';
	import type { JsonSchemaAdapter } from 'tmcp/adapter';
	/**
	 * Effect Schema adapter for converting Effect schemas to JSON Schema format
	 * 
	 */
	export class EffectJsonSchemaAdapter extends JsonSchemaAdapter<StandardSchemaV1<any, any> & SchemaClass<any, any, never>> {
		constructor();
	}

	export {};
}

//# sourceMappingURL=index.d.ts.map