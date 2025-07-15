/**
 * ArkType adapter for converting ArkType schemas to JSON Schema format
 * @augments {JsonSchemaAdapter<Type>}
 */
export class ArktypeJsonSchemaAdapter extends JsonSchemaAdapter<import("arktype").BaseType<unknown, {}>> {
    constructor();
}
export default ArktypeJsonSchemaAdapter;
import { JsonSchemaAdapter } from 'tmcp/adapter';
