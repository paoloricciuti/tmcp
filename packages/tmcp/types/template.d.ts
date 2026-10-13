/**
 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
 * be invoked to provide completions for the template variables to the user.
 * Use the description and title to help the user to understand what the resource is. The mimeType can be used to indicate the type of content.
 */
export function defineTemplate<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>(options: TemplateOptions<TUri>, execute: (uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult): CreatedTemplate<TUri>;
/**
 * A resource template created with `defineTemplate`.
 */
export type CreatedTemplate<TUri extends string = string> = TemplateOptions<TUri> & {
    [created_template]: typeof created_template;
};
import type { ExtractURITemplateVariables } from "./internal/uri-template.js";
import type { TemplateOptions } from "./internal/internal.js";
import type { ReadResourceResult } from "./validation/index.js";
//# sourceMappingURL=template.d.ts.map