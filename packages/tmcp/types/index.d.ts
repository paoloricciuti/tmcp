/**
 * Check whether an error means that tmcp is waiting for client input.
 *
 * When there is no open connection to the client, `elicitation()` and
 * `message()` ask the client to retry the original request with the answer.
 * They stop the current handler by throwing a private error. A broad `catch`
 * in the handler must rethrow that error, or tmcp cannot ask for the retry.
 * Use this helper to distinguish it from errors your handler should process:
 *
 * ```js
 * try {
 *   const answer = await server.elicitation(msg, schema);
 * } catch (error) {
 *   if (isInputRequired(error)) throw error;
 *   // handle the real error
 * }
 * ```
 */
export function isInputRequired(error: unknown): boolean;
/**
 * Return the per-request protocol versions supported by tmcp.
 */
export function getPerRequestProtocolVersions(): string[];
export class McpServer<StandardSchema extends StandardSchemaV1 | undefined = undefined, CustomContext extends Record<string, unknown> | undefined = undefined> {
    constructor(server_info: ServerInfo, options: ServerOptions<StandardSchema>);
    roots: Array<{
        uri: string;
        name?: string;
    }>;
    /**
     * Utility method to specify the type of the custom context for this server instance without the need to specify the standard schema type.
     * @example
     * const server = new McpServer({ ... }, { ... }).withContext<{ name: string }>();
     */
    withContext<TCustom extends Record<string, unknown>>(): McpServer<StandardSchema, TCustom>;
    /**
     * The context of the current request, include the session ID, any auth information, and custom data.
     */
    get ctx(): Context<CustomContext>;
    /**
     * Get the client information (name, version, etc.) of the client that initiated the current request...useful if you want to do something different based on the client.
     * @deprecated Use `server.ctx.sessionInfo.clientInfo` instead.
     */
    currentClientInfo(): {
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
        }[] | undefined;
        version: string;
        websiteUrl?: string | undefined;
        name: string;
        title?: string | undefined;
    } | undefined;
    /**
     * Get the client capabilities of the client that initiated the current request, you can use this to verify the client support something before invoking the respective method.
     * @deprecated Use `server.ctx.sessionInfo.clientCapabilities` instead.
     */
    currentClientCapabilities(): ({
        experimental?: ({} & {
            [key: string]: unknown;
        }) | undefined;
        sampling?: ({} & {
            [key: string]: unknown;
        }) | undefined;
        elicitation?: ({
            form?: ({} & {
                [key: string]: unknown;
            }) | undefined;
            url?: ({} & {
                [key: string]: unknown;
            }) | undefined;
        } & {
            [key: string]: unknown;
        }) | undefined;
        extensions?: {
            [x: string]: {} & {
                [key: string]: unknown;
            };
        } | undefined;
        roots?: ({
            listChanged?: boolean | undefined;
        } & {
            [key: string]: unknown;
        }) | undefined;
    } & {
        [key: string]: unknown;
    }) | undefined;
    on<TEvent extends keyof McpEvents>(event: TEvent, callback: McpEvents[TEvent], options?: AddEventListenerOptions): () => void;
    /**
     * Use the `defineTool` utility to create a reusable tool and pass it to this method to add it to the server.
     */
    tools<T extends Array<CreatedTool<any, any>>, U extends T extends Array<CreatedTool<infer TSchema, infer TOutputSchema>> ? AllSame<TSchema, StandardSchema | undefined> extends true ? AllSame<TOutputSchema, StandardSchema | undefined> extends true ? T : never : never : never>(tools: T & NoInfer<U>): void;
    /**
     * Use the `definePrompt` utility to create a reusable tool and pass it to this method to add it to the server.
     */
    prompts<T extends Array<CreatedPrompt<any>>, U extends T extends Array<CreatedPrompt<infer TSchema>> ? AllSame<TSchema, StandardSchema | undefined> extends true ? T : never : never>(prompts: T & NoInfer<U>): void;
    /**
     * Use the `defineResource` utility to create a reusable resource and pass it to this method to add it to the server.
     */
    resources(resources: CreatedResource[]): void;
    /**
     * Use the `defineTemplate` utility to create a reusable template and pass it to this method to add it to the server.
     */
    templates(templates: CreatedTemplate<any>[]): void;
    /**
     * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
     * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
     *
     * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
     */
    tool<TSchema extends StandardSchema | undefined = undefined, TOutputSchema extends StandardSchema | undefined = undefined>(tool_or_options: CreatedTool<TSchema, TOutputSchema>): void;
    /**
     * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
     * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
     *
     * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
     */
    tool<TSchema extends StandardSchema | undefined = undefined, TOutputSchema extends StandardSchema | undefined = undefined>(tool_or_options: ToolOptions<TSchema, TOutputSchema>, execute: TSchema extends undefined ? (() => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)): void;
    /**
     * Run transport-specific validation against a registered tool's JSON
     * Schema without enabling, validating, or executing the tool.
     */
    validateToolCall(name: string, args: Record<string, unknown>, validator: (input_schema: Record<string, unknown>, args: Record<string, unknown>) => void | Promise<void>): Promise<boolean>;
    /**
     * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
     * Use the description and title to help the user to understand what the prompt does and when to use it.
     *
     * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
     * for each input that will be used to provide completions for the user.
     */
    prompt<TSchema extends StandardSchema | undefined = undefined>(prompt_or_options: CreatedPrompt<TSchema>): void;
    /**
     * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
     * Use the description and title to help the user to understand what the prompt does and when to use it.
     *
     * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
     * for each input that will be used to provide completions for the user.
     */
    prompt<TSchema extends StandardSchema | undefined = undefined>(prompt_or_options: PromptOptions<TSchema>, execute: TSchema extends undefined ? (() => Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult): void;
    /**
     * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
     * Use the description and title to help the user to understand what the resource is.
     */
    resource(resource_or_options: CreatedResource): void;
    /**
     * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
     * Use the description and title to help the user to understand what the resource is.
     */
    resource(resource_or_options: ResourceOptions, execute: (uri: string) => Promise<ReadResourceResult> | ReadResourceResult): void;
    /**
     * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
     * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
     * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
     * be invoked to provide completions for the template variables to the user.
     * Use the description and title to help the user to understand what the resource is.
     */
    template<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>(template_or_options: CreatedTemplate<TUri>): void;
    /**
     * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
     * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
     * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
     * be invoked to provide completions for the template variables to the user.
     * Use the description and title to help the user to understand what the resource is.
     */
    template<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>(template_or_options: TemplateOptions<TUri>, execute: (uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult): void;
    /**
     * Check whether a JSON-RPC method is registered without invoking it.
     */
    hasMethod(method: string): boolean;
    /**
     * The main function that receive a JSONRpc message and either dispatch a `send` event or process the request.
     */
    receive(message: JSONRPCMessage, ctx?: ReceiveContext<CustomContext>): any;
    /**
     * Lower level api to send a request to the client, mostly useful to call client methods that not yet supported by the server or
     * if you want to send requests with json schema that is not expressible with your validation library.
     */
    request({ method, params }: {
        method: string;
        params?: JSONRPCParams;
    }): Promise<unknown>;
    /**
     * Send a notification for subscriptions
     */
    changed<TWhat extends keyof ChangedArgs>(what: TWhat, ...args: ChangedArgs[TWhat]): void;
    /**
     * Refresh the roots list when the server has an open client session.
     *
     * This throws when handling a standalone request because roots are no
     * longer supported by protocol version `2026-07-28`.
     */
    refreshRoots(): Promise<void>;
    /**
     * Save data that the handler will need when the client retries this
     * request. tmcp turns it into text, sends it to the client, and restores it
     * as `server.ctx.requestState` on the retry.
     * Passing `undefined` clears previously set state.
     *
     * This does nothing when the server has an open client session or when the
     * request finishes without asking for input.
     *
     * SECURITY: the default JSON converter lets the client read and change this
     * data. Do not put secrets in it or use it for authorization. Configure a
     * protected `requestStateCodec` if the server must detect changes.
     */
    setRequestState(state: unknown): void;
    /**
     * Ask the user to complete an interaction at a URL. The client will open
     * the URL out of band and return the user's action without form content.
     *
     * @param [options] `key` names this question so tmcp can match its answer on a retry.
     */
    elicitation(message: string, url: string, options?: {
        key?: string;
    } | undefined): Promise<Omit<ElicitResult, "content">>;
    /**
     * Emit an elicitation request to the client. Elicitations are used to ask the user for input in a structured way, the client will show a UI to the user to fill the input.
     * The schema should be a valid Standard Schema V1 schema and should be an Object with the properties you need.
     * The client will return the validated input as a JSON object that matches the schema.
     *
     * If the client doesn't support elicitation, it will throw an error.
     *
     * When there is no open client session, tmcp returns the question to the
     * client and asks it to retry the original request with the answer. The
     * handler then starts again from the beginning, so its definition must set
     * `replayable: true`. Always await this call. If a surrounding `catch`
     * handles errors, use `isInputRequired()` and rethrow tmcp's private error.
     *
     * @param [options] `key` names this question so tmcp can match its answer on a retry. By default tmcp uses `"1"`, `"2"`, and so on. Set a name when the handler may ask different questions on different runs. When mixing named and numbered questions, use non-numeric names.
     */
    elicitation<TSchema extends StandardSchema extends undefined ? never : StandardSchema>(message: string, schema: TSchema, options?: {
        key?: string;
    } | undefined): Promise<ElicitResult & {
        content?: StandardSchemaV1.InferOutput<TSchema>;
    }>;
    /**
     * Request language model sampling from the client.
     *
     * When there is no open client session, tmcp returns the sampling request
     * to the client and asks it to retry the original request with the answer.
     * The handler then starts again from the beginning, so its definition must
     * set `replayable: true`. Always await this call. If a surrounding `catch`
     * handles errors, use `isInputRequired()` and rethrow tmcp's private error.
     * @param [options] `key` names this request so tmcp can match its answer on a retry. By default tmcp uses `"1"`, `"2"`, and so on. Set a name when the handler may make different requests on different runs. When mixing named and numbered requests, use non-numeric names.
     */
    message(request: CreateMessageRequestParams, options?: {
        key?: string;
    }): Promise<CreateMessageResult>;
    /**
     * Send a progress notification to the client. This is useful for long-running operations where you want to inform the user about the progress.
     *
     * @param progress The current progress value, it should be between 0 and total and should always increase
     * @param [total] The total value, defaults to 1
     * @param [message] An optional message to accompany the progress update
     */
    progress(progress: number, total?: number, message?: string): void;
    /**
     * Log a message to the client if logging is enabled and the level is appropriate
     */
    log(level: LoggingLevel, data: unknown, logger?: string): void;
    #private;
}
/**
 * Information about a validated access token, provided to request handlers.
 */
export type AuthInfo = {
    /**
     * - The access token.
     */
    token: string;
    /**
     * - The client ID associated with this token.
     */
    clientId: string;
    /**
     * - Scopes associated with this token.
     */
    scopes: string[];
    /**
     * - When the token expires (in seconds since epoch).
     */
    expiresAt?: number | undefined;
    /**
     * - The RFC 8707 resource server identifier for which this token is valid.
     * If set, this MUST match the MCP server's resource identifier (minus hash fragment).
     */
    resource?: URL | undefined;
    /**
     * - Additional data associated with the token.
     * This field should be used for any additional data that needs to be attached to the auth info.
     */
    extra?: Record<string, unknown> | undefined;
};
export type Context<TCustom extends Record<string, unknown> | undefined = undefined> = {
    sessionId?: string | undefined;
    sessionInfo?: {
        clientCapabilities?: ClientCapabilitiesType;
        clientInfo?: ClientInfoType;
        logLevel?: LoggingLevel;
    } | undefined;
    /**
     * The exact per-request protocol version when the current request carries per-request protocol metadata; `undefined` for session-negotiated requests.
     */
    protocolVersion?: string | undefined;
    /**
     * Data saved by the handler before asking the client for input, then returned by the client on the retry. It is `undefined` when no data was saved or when the request uses an open session. The default JSON converter lets the client read and change this value. Do not store secrets in it or use it to make authorization decisions. Configure `requestStateCodec` if the server must detect changes.
     */
    requestState?: unknown;
    /**
     * Aborted when the transport observes that the current request was cancelled.
     */
    signal?: AbortSignal | undefined;
    auth?: AuthInfo | undefined;
    custom?: TCustom | undefined;
};
/**
 * Context accepted by `receive()`. Subscription routing fields are
 * transport-only and are deliberately omitted from `server.ctx`.
 */
export type ReceiveContext<TCustom extends Record<string, unknown> | undefined = undefined> = Context<TCustom> & {
    subscriptionOrigin?: SubscriptionOriginType;
    subscriptionManager?: SubscriptionManagerType;
};
export type McpEvents = McpEventsType;
/**
 * The arguments of `McpServer.changed` for each kind of change.
 */
export type ChangedArgs = {
    resource: [id: string];
    tools: [];
    prompts: [];
    resources: [];
};
export type SubscriptionFilter = SubscriptionFilterType;
export type SubscriptionOrigin = SubscriptionOriginType;
export type Subscription = SubscriptionType;
export type SubscriptionCallbacks = SubscriptionCallbacksType;
export type SubscriptionManager = SubscriptionManagerType;
export type SubscriptionsListenRequest = SubscriptionsListenRequestType;
export type SubscriptionsListenResult = SubscriptionsListenResultType;
export type SubscriptionsAcknowledgedNotification = SubscriptionsAcknowledgedNotificationType;
export type Icons = IconsType;
export type Subscriptions = Record<SubscriptionsKeys, string[]>;
export type CallToolResult<TStructuredContent> = CallToolResultType<TStructuredContent>;
export type ReadResourceResult = ReadResourceResultType;
export type GetPromptResult = GetPromptResultType;
export type ClientCapabilities = ClientCapabilitiesType;
export type ServerInfo = ServerInfoType;
export type CreateMessageRequestParams = CreateMessageRequestParamsType;
export type CreateMessageResult = CreateMessageResultType;
export type Resource = ResourceType;
export type LoggingLevel = LoggingLevelType;
export type ClientInfo = ClientInfoType;
export type ElicitResult = ElicitResultType;
export type InitializeResult = InitializeResultType;
export type ListToolsResult = ListToolsResultType;
export type ListPromptsResult = ListPromptsResultType;
export type ListResourceTemplatesResult = ListResourceTemplatesResultType;
export type ListResourcesResult = ListResourcesResultType;
export type CompleteResult = CompleteResultType;
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { CreatedTool } from "./tool.js";
import type { AllSame } from "./internal/internal.js";
import type { CreatedPrompt } from "./prompt.js";
import type { CreatedResource } from "./resource.js";
import type { CreatedTemplate } from "./template.js";
import type { ToolOptions } from "./internal/internal.js";
import type { PromptOptions } from "./internal/internal.js";
import type { ResourceOptions } from "./internal/internal.js";
import type { ExtractURITemplateVariables } from "./internal/uri-template.js";
import type { TemplateOptions } from "./internal/internal.js";
import type { JSONRPCMessage } from "./validation/index.js";
import type { JSONRPCParams } from "json-rpc-2.0";
import type { ServerOptions } from "./internal/internal.js";
import type { ClientCapabilities as ClientCapabilitiesType } from "./validation/index.js";
import type { ClientInfo as ClientInfoType } from "./validation/index.js";
import type { SubscriptionOrigin as SubscriptionOriginType } from "./internal/internal.js";
import type { SubscriptionManager as SubscriptionManagerType } from "./internal/internal.js";
import type { McpEvents as McpEventsType } from "./internal/internal.js";
import type { SubscriptionFilter as SubscriptionFilterType } from "./validation/index.js";
import type { Subscription as SubscriptionType } from "./internal/internal.js";
import type { SubscriptionCallbacks as SubscriptionCallbacksType } from "./internal/internal.js";
import type { SubscriptionsListenRequest as SubscriptionsListenRequestType } from "./validation/index.js";
import type { SubscriptionsListenResult as SubscriptionsListenResultType } from "./validation/index.js";
import type { SubscriptionsAcknowledgedNotification as SubscriptionsAcknowledgedNotificationType } from "./validation/index.js";
import type { Icons as IconsType } from "./validation/index.js";
import type { SubscriptionsKeys } from "./internal/internal.js";
import type { CallToolResult as CallToolResultType } from "./validation/index.js";
import type { ReadResourceResult as ReadResourceResultType } from "./validation/index.js";
import type { GetPromptResult as GetPromptResultType } from "./validation/index.js";
import type { ServerInfo as ServerInfoType } from "./validation/index.js";
import type { CreateMessageRequestParams as CreateMessageRequestParamsType } from "./validation/index.js";
import type { CreateMessageResult as CreateMessageResultType } from "./validation/index.js";
import type { Resource as ResourceType } from "./validation/index.js";
import type { LoggingLevel as LoggingLevelType } from "./validation/index.js";
import type { ElicitResult as ElicitResultType } from "./validation/index.js";
import type { InitializeResult as InitializeResultType } from "./validation/index.js";
import type { ListToolsResult as ListToolsResultType } from "./validation/index.js";
import type { ListPromptsResult as ListPromptsResultType } from "./validation/index.js";
import type { ListResourceTemplatesResult as ListResourceTemplatesResultType } from "./validation/index.js";
import type { ListResourcesResult as ListResourcesResultType } from "./validation/index.js";
import type { CompleteResult as CompleteResultType } from "./validation/index.js";
export { McpError, HEADER_MISMATCH, MISSING_REQUIRED_CLIENT_CAPABILITY, UNSUPPORTED_PROTOCOL_VERSION } from "./validation/index.js";
//# sourceMappingURL=index.d.ts.map