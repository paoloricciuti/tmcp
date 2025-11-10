/**
 * @import { Type } from "arktype";
 * @import { JSONSchema7 } from "json-schema";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';

/**
 * Atrocious hack to satisfy the current version of the protocol that for some reason
 * requires `type: string` on enum fields despite JSON Schema spec not requiring it.
 *
 * TODO: Remove this once the protocol is fixed to align with JSON Schema spec.
 * @param {JSONSchema7} json_schema
 */
function add_type_to_enums(json_schema) {
	for (let key in json_schema) {
		const property = json_schema[/** @type {keyof json_schema} */ (key)];
		if (
			property != null &&
			typeof property === 'object' &&
			!Array.isArray(property)
		) {
			if ('enum' in property && !('type' in property)) {
				property.type = 'string';
			}
			add_type_to_enums(property);
		}
	}
	return json_schema;
}

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
		return add_type_to_enums(
			/** @type {JSONSchema7} */ (schema.toJsonSchema()),
		);
	}
}
