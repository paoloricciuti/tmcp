/**
 *
 */
export class McpServer {
    /**
     * @param {ServerInfo} server_info
     * @param {ServerOptions} options
     */
    constructor(server_info: ServerInfo, options: ServerOptions);
    /**
     * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never }} options
     * @param {TSchema extends undefined ? (()=>Promise<unknown> | unknown) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown)} execute
     */
    tool<TSchema extends StandardSchemaV1 | undefined = undefined>({ name, description, schema }: {
        name: string;
        description: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
    }, execute: TSchema extends undefined ? (() => Promise<unknown> | unknown) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown)): void;
    /**
     * @template {StandardSchemaV1 | undefined} [TSchema=undefined]
     * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: Completion }} options
     * @param {TSchema extends undefined ? (()=>Promise<unknown> | unknown) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown} execute
     */
    prompt<TSchema extends StandardSchemaV1 | undefined = undefined>({ name, description, schema, complete }: {
        name: string;
        description: string;
        schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never;
        complete?: Completion;
    }, execute: TSchema extends undefined ? (() => Promise<unknown> | unknown) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<unknown> | unknown): void;
    /**
     * @param {{ name: string; description: string; uri: string }} options
     * @param {(uri: string, params?: unknown) => Promise<unknown> | unknown} execute
     */
    resource({ name, description, uri }: {
        name: string;
        description: string;
        uri: string;
    }, execute: (uri: string, params?: unknown) => Promise<unknown> | unknown): void;
    /**
     * @param {{ name: string; description: string; uri: string; complete?: Completion }} options
     * @param {(uri: string, params?: unknown) => Promise<unknown> | unknown} execute
     */
    template({ name, description, uri, complete }: {
        name: string;
        description: string;
        uri: string;
        complete?: Completion;
    }, execute: (uri: string, params?: unknown) => Promise<unknown> | unknown): void;
    /**
     * @param {JSONRPCRequest} request
     * @returns {ReturnType<JSONRPCServer['receive']>}
     */
    receive(request: JSONRPCRequest): ReturnType<JSONRPCServer["receive"]>;
    #private;
}
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Completion } from "./internal.js";
import type { JSONRPCRequest } from "json-rpc-2.0";
import { JSONRPCServer } from 'json-rpc-2.0';
import type { ServerInfo } from "./internal.js";
import type { ServerOptions } from "./internal.js";
