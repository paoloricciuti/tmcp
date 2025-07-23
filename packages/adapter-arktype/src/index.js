/**
 * @import { Type } from "arktype";
 * @import { JSONSchema7 } from "json-schema";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';

/**
 * ArkType adapter for converting ArkType schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<Type>}
 */
export class ArktypeJsonSchemaAdapter extends JsonSchemaAdapter {
	/**
	 * Converts an ArkType schema to JSON Schema format
	 * @param {Type} schema - The ArkType schema to convert
	 * @returns {Promise<JSONSchema7>} The JSON Schema representation
	 */
	async toJsonSchema(schema) {
		// ArkType has built-in JSON Schema export via the toJsonSchema method
		return /** @type {JSONSchema7} */ (schema.toJsonSchema());
	}
}
