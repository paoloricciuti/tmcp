/**
 * @typedef {ClientCapabilitiesType} ClientCapabilities
 */
/**
 * @template {StandardSchemaV1} StandardSchema
 */
export class McpServer<StandardSchema extends StandardSchemaV1> {
    /**
     * @param {ServerInfo} server_info
     * @param {ServerOptions<StandardSchema>} options
     */
    constructor(server_info: ServerInfo, options: ServerOptions<StandardSchema>);
    /**
     * @type {Array<{uri: string, name?: string}>}
     */
    roots: Array<{
        uri: string;
        name?: string;
    }>;
    currentClientCapabilities(): {
        roots?: {
            listChanged?: boolean;
        } & {
            [key: string]: unknown;
        };
        sampling?: {} & {
            [key: string]: unknown;
        };
        elicitation?: {} & {
            [key: string]: unknown;
        };
        experimental?: {} & {
            [key: string]: unknown;
        };
    } & {
        [key: string]: unknown;
    };
    /**
     * @template {keyof McpEvents} TEvent
     * @param {TEvent} event
     * @param {McpEvents[TEvent]} callback
     * @param {AddEventListenerOptions} [options]
     */
    on<TEvent extends keyof McpEvents>(event: TEvent, callback: McpEvents[TEvent], options?: AddEventListenerOptions): void;
    /**
     * @template {StandardSchema | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; title?: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never }} options
     * @param {TSchema extends undefined ? (()=>Promise<CallToolResult> | CallToolResult) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult> | CallToolResult)} execute
     */
    tool<TSchema extends StandardSchema | undefined = undefined>({ name, description, title, schema }: {
        name: string;
        description: string;
        title?: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
    }, execute: TSchema extends undefined ? (() => Promise<CallToolResult> | CallToolResult) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult> | CallToolResult)): void;
    /**
     * @template {StandardSchema | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; title?: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>>> }} options
     * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
     */
    prompt<TSchema extends StandardSchema | undefined = undefined>({ name, description, title, schema, complete }: {
        name: string;
        description: string;
        title?: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
        complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>, Completion>>>;
    }, execute: TSchema extends undefined ? (() => Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult): void;
    /**
     * @param {{ name: string; description: string; title?: string; uri: string }} options
     * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
     */
    resource({ name, description, title, uri }: {
        name: string;
        description: string;
        title?: string;
        uri: string;
    }, execute: (uri: string) => Promise<ReadResourceResult> | ReadResourceResult): void;
    /**
     * @template {string} TUri
     * @template {ExtractURITemplateVariables<TUri>} TVariables
     * @param {{ name: string; description: string; title?: string; uri: TUri; complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>; list?: () => Promise<Array<Resource>> | Array<Resource> }} options
     * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
     */
    template<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>({ name, description, title, uri, complete, list: list_resources }: {
        name: string;
        description: string;
        title?: string;
        uri: TUri;
        complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>;
        list?: () => Promise<Array<Resource>> | Array<Resource>;
    }, execute: (uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult): void;
    /**
     * @param {JSONRPCResponse | JSONRPCRequest} message
     * @param {string} [session_id]
     * @returns {ReturnType<JSONRPCServer['receive']> | ReturnType<JSONRPCClient['receive'] | undefined>}
     */
    receive(message: JSONRPCResponse | JSONRPCRequest, session_id?: string): ReturnType<JSONRPCServer["receive"]> | ReturnType<JSONRPCClient["receive"] | undefined>;
    /**
     * Send a notification for subscriptions
     * @param {SubscriptionsKeys} what
     * @param {string} id
     */
    changed(what: SubscriptionsKeys, id: string): void;
    /**
     * Refresh roots list from client
     */
    refreshRoots(): Promise<void>;
    /**
     * @template {StandardSchema} TSchema
     * @param {TSchema} schema
     * @returns {Promise<StandardSchemaV1.InferOutput<TSchema>>}
     */
    elicitation<TSchema extends StandardSchema>(schema: TSchema): Promise<StandardSchemaV1.InferOutput<TSchema>>;
    /**
     * Request language model sampling from the client
     * @param {CreateMessageRequest} request
     * @returns {Promise<CreateMessageResult>}
     */
    message(request: CreateMessageRequest): Promise<CreateMessageResult>;
    #private;
}
export type ClientCapabilities = ClientCapabilitiesType;
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { McpEvents } from "./internal/internal.js";
import type { CallToolResult } from "./validation/index.js";
import type { Completion } from "./internal/internal.js";
import type { GetPromptResult } from "./validation/index.js";
import type { ReadResourceResult } from "./validation/index.js";
import type { ExtractURITemplateVariables } from "./internal/uri-template.js";
import type { Resource } from "./validation/index.js";
import type { JSONRPCResponse } from "./validation/index.js";
import type { JSONRPCRequest } from "json-rpc-2.0";
import { JSONRPCServer } from 'json-rpc-2.0';
import { JSONRPCClient } from 'json-rpc-2.0';
import type { SubscriptionsKeys } from "./internal/internal.js";
import type { CreateMessageRequest } from "./validation/index.js";
import type { CreateMessageResult } from "./validation/index.js";
import type { ServerInfo } from "./internal/internal.js";
import type { ServerOptions } from "./internal/internal.js";
import type { ClientCapabilities as ClientCapabilitiesType } from "./validation/index.js";
