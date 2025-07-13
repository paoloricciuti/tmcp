/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { JSONSchema7 } from "json-schema";
 */
/**
 * @template {StandardSchemaV1} TSchema
 */
export class JsonSchemaAdapter<TSchema extends StandardSchemaV1> {
	/**
	 * @param {TSchema} schema
	 * @returns {Promise<JSONSchema7>}
	 */
	toJsonSchema(schema: TSchema): Promise<JSONSchema7>;
}
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { JSONSchema7 } from 'json-schema';
