/**
 * @import { GenericSchema } from "valibot";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';
import { toJsonSchema } from '@valibot/to-json-schema';

/**
 * Atrocious hack to satisfy the current version of the protocol that for some reason
 * requires `type: string` on enum fields despite JSON Schema spec not requiring it.
 *
 * TODO: Remove this once the protocol is fixed to align with JSON Schema spec.
 * @param {ReturnType<typeof toJsonSchema>} json_schema
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
 * Valibot adapter for converting Valibot schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<GenericSchema>}
 */
export class ValibotJsonSchemaAdapter extends JsonSchemaAdapter {
	/**
	 * Converts a Valibot schema to JSON Schema format
	 * @param {GenericSchema} schema - The Valibot schema to convert
	 * @returns {Promise<ReturnType<typeof toJsonSchema>>} - The converted JSON Schema
	 */
	async toJsonSchema(schema) {
		return add_type_to_enums(toJsonSchema(schema));
	}
}
