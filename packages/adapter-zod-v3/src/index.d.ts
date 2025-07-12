/**
 * Zod adapter for converting Zod schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<ZodSchema>}
 */
export class ZodV3JsonSchemaAdapter extends JsonSchemaAdapter<ZodSchema<any, import("zod").ZodTypeDef, any>> {
    constructor();
}
export default ZodV3JsonSchemaAdapter;
import type { ZodSchema } from "zod";
import { JsonSchemaAdapter } from 'tmcp/adapter';
