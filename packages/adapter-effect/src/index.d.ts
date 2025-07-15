/**
 * Effect Schema adapter for converting Effect schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<StandardSchemaV1<any, any> & SchemaClass<any, any, never>>}
 */
export class EffectJsonSchemaAdapter extends JsonSchemaAdapter<StandardSchemaV1<any, any> & SchemaClass<any, any, never>> {
    constructor();
}
export default EffectJsonSchemaAdapter;
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaClass } from "effect/Schema";
import { JsonSchemaAdapter } from 'tmcp/adapter';
