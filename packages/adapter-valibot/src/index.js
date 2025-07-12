/**
 * @import { GenericSchema } from "valibot";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';
import { toJsonSchema } from '@valibot/to-json-schema';

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
		return toJsonSchema(schema);
	}
}
