/**
 * @import { ZodSchema } from "zod";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodV3JsonSchemaAdapter extends JsonSchemaAdapter {
	/**
	 * Converts a Zod schema to JSON Schema format
	 * @param {ZodSchema} schema - The Zod schema to convert
	 * @returns {Promise<object>} The JSON Schema representation
	 */
	async toJsonSchema(schema) {
		return zodToJsonSchema(schema);
	}
}

/**
 * Default export for convenience
 */
export default ZodV3JsonSchemaAdapter;
