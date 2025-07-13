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
     * @template {keyof McpEvents} TEvent
     * @param {TEvent} event
     * @param {McpEvents[TEvent]} callback
     * @param {AddEventListenerOptions} [options]
     */
    on<TEvent extends keyof McpEvents>(event: TEvent, callback: McpEvents[TEvent], options?: AddEventListenerOptions): void;
    /**
     * @template {StandardSchema | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never }} options
     * @param {TSchema extends undefined ? (()=>Promise<unknown> | unknown) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown)} execute
     */
    tool<TSchema extends StandardSchema | undefined = undefined>({ name, description, schema }: {
        name: string;
        description: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
    }, execute: TSchema extends undefined ? (() => Promise<unknown> | unknown) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown)): void;
    /**
     * @template {StandardSchema | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>> }} options
     * @param {TSchema extends undefined ? (()=>Promise<unknown> | unknown) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown} execute
     */
    prompt<TSchema extends StandardSchema | undefined = undefined>({ name, description, schema, complete }: {
        name: string;
        description: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
        complete?: TSchema extends undefined ? never : Partial<Record<keyof StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>, Completion>>;
    }, execute: TSchema extends undefined ? (() => Promise<unknown> | unknown) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown): void;
    /**
     * @param {{ name: string; description: string; uri: string }} options
     * @param {(uri: string) => Promise<unknown> | unknown} execute
     */
    resource({ name, description, uri }: {
        name: string;
        description: string;
        uri: string;
    }, execute: (uri: string) => Promise<unknown> | unknown): void;
    /**
     * @template {string} TUri
     * @template {ExtractURITemplateVariables<TUri>} TVariables
     * @param {{ name: string; description: string; uri: TUri; complete?: TVariables extends never ? never : Partial<Record<TVariables, Completion>> }} options
     * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<unknown> | unknown} execute
     */
    template<TUri extends string, TVariables extends ExtractURITemplateVariables<TUri>>({ name, description, uri, complete }: {
        name: string;
        description: string;
        uri: TUri;
        complete?: TVariables extends never ? never : Partial<Record<TVariables, Completion>>;
    }, execute: (uri: string, params: Record<TVariables, string | string[]>) => Promise<unknown> | unknown): void;
    /**
     * @param {JSONRPCRequest} request
     * @returns {ReturnType<JSONRPCServer['receive']>}
     */
    receive(request: JSONRPCRequest): ReturnType<JSONRPCServer["receive"]>;
    /**
     * Send a notification for subscriptions
     * @param {SubscriptionsKeys} what
     * @param {string} id
     */
    changed(what: SubscriptionsKeys, id: string): void;
    #private;
}
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { McpEvents } from "./internal/internal.js";
import type { Completion } from "./internal/internal.js";
import type { ExtractURITemplateVariables } from "./internal/uri-template.js";
import type { JSONRPCRequest } from "json-rpc-2.0";
import { JSONRPCServer } from 'json-rpc-2.0';
import type { SubscriptionsKeys } from "./internal/internal.js";
import type { ServerInfo } from "./internal/internal.js";
import type { ServerOptions } from "./internal/internal.js";
