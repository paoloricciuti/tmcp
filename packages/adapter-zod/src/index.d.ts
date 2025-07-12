/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodJsonSchemaAdapter extends JsonSchemaAdapter<z.ZodType<any, any, z.core.$ZodTypeInternals<any, any>>> {
    constructor();
    /**
     * Converts a Zod schema to JSON Schema format
     * @param {ZodSchema} schema - The Zod schema to convert
     * @returns {Promise<object>} The JSON Schema representation
     */
    toJsonSchema(schema: z.ZodType): Promise<object>;
}
import * as z from 'zod';
import { JsonSchemaAdapter } from 'tmcp/adapter';
