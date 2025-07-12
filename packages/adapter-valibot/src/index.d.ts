/**
 * Valibot adapter for converting Valibot schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<GenericSchema>}
 */
export class ValibotJsonSchemaAdapter extends JsonSchemaAdapter<GenericSchema> {
    constructor();
}
import type { GenericSchema } from "valibot";
import { JsonSchemaAdapter } from 'tmcp/adapter';
