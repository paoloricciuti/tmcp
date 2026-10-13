/**
 * Valibot adapter for converting Valibot schemas to JSON Schema format
 */
export class ValibotJsonSchemaAdapter extends JsonSchemaAdapter<GenericSchema> {
    constructor();
    /**
     * Converts a Valibot schema to JSON Schema format
     * @param schema - The Valibot schema to convert
     * @returns - The converted JSON Schema
     */
    toJsonSchema(schema: GenericSchema): Promise<ReturnType<typeof toJsonSchema>>;
}
import type { GenericSchema } from "valibot";
import { JsonSchemaAdapter } from 'tmcp/adapter';
import { toJsonSchema } from '@valibot/to-json-schema';
//# sourceMappingURL=index.d.ts.map