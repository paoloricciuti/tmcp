export class JsonSchemaAdapter<TSchema extends StandardSchemaV1> {
    toJsonSchema(schema: TSchema): Promise<JSONSchema7>;
}
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JSONSchema7 } from "json-schema";
//# sourceMappingURL=adapter.d.ts.map