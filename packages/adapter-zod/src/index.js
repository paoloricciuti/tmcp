/**
 * @import { ZodSchema } from "zod";
 */

import { JsonSchemaAdapter } from 'tmcp/adapter';
import * as z from 'zod';

/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodJsonSchemaAdapter extends JsonSchemaAdapter {
	/**
	 * Converts a Zod schema to JSON Schema format
	 * @param {ZodSchema} schema - The Zod schema to convert
	 * @returns {Promise<object>} The JSON Schema representation
	 */
	async toJsonSchema(schema) {
		return z.toJSONSchema(schema);
	}
}
