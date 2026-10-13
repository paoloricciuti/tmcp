/**
 * Validate the standard headers mirrored from a per-request JSON-RPC
 * request or notification.
 */
export function validate_request_headers(headers: Headers, message: Record<string, any>): void;
/**
 * Validate recognized `Mcp-Param-*` headers against annotated tool
 * parameters.
 */
export function validate_tool_parameter_headers(headers: Headers, input_schema: Record<string, unknown>, args: Record<string, unknown>): void;
export type ParameterHeader = {
    name: string;
    path: string[];
    type: "string" | "boolean" | "integer";
};
//# sourceMappingURL=request-headers.d.ts.map