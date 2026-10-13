/**
 * Effect Schema adapter for converting Effect schemas to JSON Schema format
 */
export class EffectJsonSchemaAdapter extends JsonSchemaAdapter<StandardSchemaV1<any, any> & SchemaClass<any, any, never>> {
    constructor();
}
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaClass } from "effect/Schema";
import { JsonSchemaAdapter } from 'tmcp/adapter';
//# sourceMappingURL=index.d.ts.map