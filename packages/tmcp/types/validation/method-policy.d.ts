/**
 * Check whether the current request style can call this method.
 * @param stateless Whether the client included its version and capabilities in this request
 */
export function is_method_allowed(method: string, stateless: boolean): boolean;
/**
 * Check whether a method may be called with per-request protocol metadata.
 */
export function is_per_request_method_allowed(method: string): boolean;
/**
 * Methods whose responses tell the client how long they may be reused and
 * whether they may be shared.
 */
export const CACHEABLE_METHODS: Set<string>;
/**
 * Methods that may ask the client for more input and continue when the client
 * retries. Only these methods accept `inputResponses` and `requestState` or
 * return `InputRequiredResult`. Other methods reject those fields so client
 * mistakes are visible.
 */
export const MRTR_METHODS: Set<string>;
export type MethodPolicy = {
    session: boolean;
    stateless: boolean;
};
//# sourceMappingURL=method-policy.d.ts.map