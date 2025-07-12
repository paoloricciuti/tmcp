/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodV3JsonSchemaAdapter extends JsonSchemaAdapter<ZodSchema<any, import("zod").ZodTypeDef, any>> {
    constructor();
    /**
     * Converts a Zod schema to JSON Schema format
     * @param {ZodSchema} schema - The Zod schema to convert
     * @returns {Promise<object>} The JSON Schema representation
     */
    toJsonSchema(schema: ZodSchema): Promise<object>;
}
export default ZodV3JsonSchemaAdapter;
import type { ZodSchema } from "zod";
import { JsonSchemaAdapter } from 'tmcp/adapter';
