/**
 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
 * Use the description and title to help the user to understand what the resource is. The mimeType can be used to indicate the type of content.
 */
export function defineResource(options: ResourceOptions, execute: (uri: string) => Promise<ReadResourceResult> | ReadResourceResult): CreatedResource;
/**
 * A resource created with `defineResource`.
 */
export type CreatedResource = ResourceOptions & {
    [created_resource]: typeof created_resource;
};
import type { ResourceOptions } from "./internal/internal.js";
import type { ReadResourceResult } from "./validation/index.js";
//# sourceMappingURL=resource.d.ts.map