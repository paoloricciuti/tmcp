/**
 * @import { SchemaClass } from "effect/Schema";
 * @import { JSONSchema7 } from "json-schema";
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';
import { JSONSchema } from 'effect';

/**
 * Effect Schema adapter for converting Effect schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<StandardSchemaV1<any, any> & SchemaClass<any, any, never>>}
 */
export class EffectJsonSchemaAdapter extends JsonSchemaAdapter {
	/**
	 * Converts an Effect schema to JSON Schema format
	 * @param {StandardSchemaV1<any, any> & SchemaClass<any, any, never>} schema - The Effect schema to convert
	 * @returns {Promise<JSONSchema7>} The JSON Schema representation
	 */
	async toJsonSchema(schema) {
		// Effect Schema has built-in JSON Schema export via JSONSchema.make
		return /** @type {JSONSchema7} */ (JSONSchema.make(schema));
	}
}
