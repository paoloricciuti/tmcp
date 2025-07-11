/* eslint-disable no-unused-vars */

/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { JSONSchema7 } from "json-schema";
 */

/**
 * @template {StandardSchemaV1} TSchema
 */
export class JsonSchemaAdapter {
	/**
	 * @param {TSchema} schema
	 * @returns {Promise<JSONSchema7>}
	 */
	toJsonSchema(schema) {
		throw new Error('toJsonSchema method not implemented');
	}
}
