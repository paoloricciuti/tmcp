/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodJsonSchemaAdapter extends JsonSchemaAdapter<z.ZodType<any, any, z.core.$ZodTypeInternals<any, any>>> {
    constructor();
}
import * as z from 'zod';
import { JsonSchemaAdapter } from 'tmcp/adapter';
