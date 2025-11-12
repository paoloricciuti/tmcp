/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import SqidsType from "sqids";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { CallToolResult as CallToolResultType, ReadResourceResult as ReadResourceResultType, GetPromptResult as GetPromptResultType, ServerInfo as ServerInfoType, ClientCapabilities as ClientCapabilitiesType, JSONRPCRequest as JSONRPCRequestType, JSONRPCResponse, CreateMessageRequestParams as CreateMessageRequestParamsType, CreateMessageResult as CreateMessageResultType, Resource as ResourceType, LoggingLevel as LoggingLevelType, ToolAnnotations, ClientInfo as ClientInfoType, ElicitResult as ElicitResultType, Icons as IconsType, JSONRPCMessage, InitializeResult as InitializeResultType, ListToolsResult as ListToolsResultType, ListPromptsResult as ListPromptsResultType, ListResourceTemplatesResult as ListResourceTemplatesResultType, ListResourcesResult as ListResourcesResultType, CompleteResult as CompleteResultType } from "./validation/index.js";
 * @import { Tool, Completion, Prompt, StoredResource, ServerOptions, SubscriptionsKeys, ChangedArgs, McpEvents } from "./internal/internal.js";
 */
import { JSONRPCClient, JSONRPCServer } from 'json-rpc-2.0';
import { AsyncLocalStorage } from 'node:async_hooks';
import { UriTemplateMatcher } from 'uri-template-matcher';
import * as v from 'valibot';
import {
	CallToolResultSchema,
	CompleteResultSchema,
	CreateMessageRequestParamsSchema,
	CreateMessageResultSchema,
	GetPromptResultSchema,
	InitializeRequestParamsSchema,
	JSONRPCNotificationSchema,
	JSONRPCRequestSchema,
	JSONRPCResponseSchema,
	McpError,
	ReadResourceResultSchema,
	ElicitResultSchema,
	JSONRPCErrorSchema,
} from './validation/index.js';
import {
	get_supported_versions,
	negotiate_protocol_version,
} from './validation/version.js';
import { should_version_negotiation_fail } from './validation/version.js';
import { event } from './internal/utils.js';

/**
 * Information about a validated access token, provided to request handlers.
 * @typedef {Object} AuthInfo
 * @property {string} token - The access token.
 * @property {string} clientId - The client ID associated with this token.
 * @property {string[]} scopes - Scopes associated with this token.
 * @property {number} [expiresAt] - When the token expires (in seconds since epoch).
 * @property {URL} [resource] - The RFC 8707 resource server identifier for which this token is valid.
 *   If set, this MUST match the MCP server's resource identifier (minus hash fragment).
 * @property {Record<string, unknown>} [extra] - Additional data associated with the token.
 *   This field should be used for any additional data that needs to be attached to the auth info.
 */

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 * @typedef {Object} Context
 * @property {string} [sessionId]
 * @property {{ clientCapabilities?: ClientCapabilitiesType, clientInfo?: ClientInfoType, logLevel?: LoggingLevel }} [sessionInfo]
 * @property {AuthInfo} [auth]
 * @property {TCustom} [custom]
 */

/**
 * @typedef {IconsType} Icons
 */

/**
 * @typedef {Record<SubscriptionsKeys, string[]>} Subscriptions
 */

/**
 * @template {Record<string, unknown> | undefined} TStructuredContent
 * @typedef {CallToolResultType<TStructuredContent>} CallToolResult
 */

/**
 * @typedef {ReadResourceResultType} ReadResourceResult
 */

/**
 * @typedef {GetPromptResultType} GetPromptResult
 */

/**
 * @typedef {ClientCapabilitiesType} ClientCapabilities
 */

/**
 * @typedef {ServerInfoType} ServerInfo
 */

/**
 * @typedef {CreateMessageRequestParamsType} CreateMessageRequestParams
 */

/**
 * @typedef {CreateMessageResultType} CreateMessageResult
 */

/**
 * @typedef {ResourceType} Resource
 */

/**
 * @typedef  {LoggingLevelType} LoggingLevel
 */

/**
 * @typedef  {ClientInfoType} ClientInfo
 */

/**
 * @typedef  {ElicitResultType} ElicitResult
 */

/**
 * @typedef {InitializeResultType} InitializeResult
 */

/**
 * @typedef {ListToolsResultType} ListToolsResult
 */

/**
 * @typedef {ListPromptsResultType} ListPromptsResult
 */

/**
 * @typedef {ListResourceTemplatesResultType} ListResourceTemplatesResult
 */

/**
 * @typedef {ListResourcesResultType} ListResourcesResult
 */
/**
 * @typedef {CompleteResultType} CompleteResult
 */

/**
 * @type {SqidsType | undefined}
 */
let Sqids;

async function get_sqids() {
	if (!Sqids) {
		Sqids = new (await import('sqids')).default();
	}
	return Sqids;
}

/**
 * Encode a cursor for pagination
 * @param {number} offset
 */
async function encode_cursor(offset) {
	return (await get_sqids()).encode([offset]);
}

/**
 * Decode a cursor from pagination
 * @param {string} cursor
 */
async function decode_cursor(cursor) {
	const [decoded] = (await get_sqids()).decode(cursor);
	return decoded;
}

/**
 * @param {()=>boolean | Promise<boolean>} enabled
 */
async function safe_enabled(enabled) {
	try {
		return await enabled();
	} catch {
		return false;
	}
}

/**
 * @template {StandardSchemaV1 | undefined} [StandardSchema=undefined]
 * @template {Record<string, unknown> | undefined} [CustomContext=undefined]
 */
export class McpServer {
	#server = new JSONRPCServer();
	/**
	 * @type {JSONRPCClient<"broadcast" | "standalone"> | undefined}
	 */
	#client;
	#options;
	/**
	 * @type {Map<string, Tool<any, any>>}
	 */
	#tools = new Map();
	/**
	 * @type {Map<string, Prompt<any>>}
	 */
	#prompts = new Map();
	/**
	 * @type {Map<string, StoredResource>}
	 */
	#resources = new Map();
	#templates = new UriTemplateMatcher();
	/**
	 * @type {Array<{uri: string, name?: string}>}
	 */
	roots = [];
	/**
	 * @type {{ [ref: string]: Map<string, Partial<Record<string, Completion>>> }}
	 */
	#completions = {
		'ref/prompt': new Map(),
		'ref/resource': new Map(),
	};

	#event_target = new EventTarget();

	/**
	 * @type {AsyncLocalStorage<Context<CustomContext> & { progress_token?: string }>}
	 */
	#ctx_storage = new AsyncLocalStorage();

	/**
	 * @param {ServerInfo} server_info
	 * @param {ServerOptions<StandardSchema>} options
	 */
	constructor(server_info, options) {
		this.#options = options;
		this.#server.addMethod('initialize', (initialize_request) => {
			try {
				// Validate basic request format
				const validated_initialize = v.parse(
					InitializeRequestParamsSchema,
					initialize_request,
				);

				// Validate protocol version format
				if (
					should_version_negotiation_fail(
						validated_initialize.protocolVersion,
					)
				) {
					// Return JSON-RPC error for invalid protocol version format
					const error = new McpError(
						-32602,
						'Invalid protocol version format',
					);
					throw error;
				}

				// Negotiate protocol version
				const negotiated_version = negotiate_protocol_version(
					validated_initialize.protocolVersion,
				);

				// Dispatch initialization event
				this.#event_target.dispatchEvent(
					event('initialize', validated_initialize),
				);

				// Return server response with negotiated version and capabilities
				return {
					protocolVersion: negotiated_version,
					...options,
					serverInfo: server_info,
				};
			} catch (error) {
				// Enhanced error handling for initialization failures
				if (error instanceof McpError) {
					// Already has JSON-RPC error code, re-throw
					throw error;
				}

				if (
					/** @type {Error} */ (error).message?.includes(
						'Protocol version',
					)
				) {
					const rpc_error = new McpError(
						-32602,
						`Protocol version validation failed: ${/** @type {Error} */ (error).message}. Server supports: ${get_supported_versions().join(', ')}`,
					);
					throw rpc_error;
				}

				// General initialization error
				const rpc_error = new McpError(
					-32603,
					`Initialization failed: ${/** @type {Error} */ (error).message}`,
				);
				throw rpc_error;
			}
		});
		this.#server.addMethod('ping', () => {
			return {};
		});
		this.#server.addMethod('notifications/initialized', () => {
			return null;
		});
		this.#init_tools();
		this.#init_prompts();
		this.#init_resources();
		this.#init_roots();
		this.#init_completion();
		this.#init_logging();
	}

	/**
	 * Utility method to specify the type of the custom context for this server instance without the need to specify the standard schema type.
	 * @example
	 * const server = new McpServer({ ... }, { ... }).withContext<{ name: string }>();
	 * @template {Record<string, unknown>} TCustom
	 * @returns {McpServer<StandardSchema, TCustom>}
	 */
	withContext() {
		return /** @type {McpServer<StandardSchema, TCustom>} */ (
			/** @type {unknown} */ (this)
		);
	}

	get #progress_token() {
		return this.#ctx_storage.getStore()?.progress_token;
	}

	/**
	 * The context of the current request, include the session ID, any auth information, and custom data.
	 * @type {Context<CustomContext>}
	 */
	get ctx() {
		// eslint-disable-next-line no-unused-vars
		const { progress_token, ...rest } = this.#ctx_storage.getStore() ?? {};
		return rest;
	}

	get #client_capabilities() {
		return this.#ctx_storage.getStore()?.sessionInfo?.clientCapabilities;
	}

	/**
	 * Get the client information (name, version, etc.) of the client that initiated the current request...useful if you want to do something different based on the client.
	 * @deprecated Use `server.ctx.sessionInfo.clientInfo` instead.
	 */
	currentClientInfo() {
		return this.#ctx_storage.getStore()?.sessionInfo?.clientInfo;
	}

	/**
	 * Get the client capabilities of the client that initiated the current request, you can use this to verify the client support something before invoking the respective method.
	 * @deprecated Use `server.ctx.sessionInfo.clientCapabilities` instead.
	 */
	currentClientCapabilities() {
		return this.#client_capabilities;
	}

	#lazyily_create_client() {
		if (!this.#client) {
			this.#client = new JSONRPCClient((payload, kind) => {
				if (kind === 'broadcast') {
					this.#event_target.dispatchEvent(
						event('broadcast', { request: payload }),
					);
					return;
				}
				this.#event_target.dispatchEvent(
					event('send', { request: payload }),
				);
			});
		}
	}

	/**
	 * @template {keyof McpEvents} TEvent
	 * @param {TEvent} event
	 * @param {McpEvents[TEvent]} callback
	 * @param {AddEventListenerOptions} [options]
	 */
	on(event, callback, options) {
		if (event === 'send' || event === 'broadcast') {
			this.#lazyily_create_client();
		}

		/**
		 * @param {Event} e
		 */
		const listener = (e) => {
			callback(/** @type {CustomEvent} */ (e).detail);
		};

		this.#event_target.addEventListener(event, listener, options);

		return () => {
			this.#event_target.removeEventListener(event, listener, options);
		};
	}

	/**
	 * @param {string} method
	 * @param {JSONRPCParams} [params]
	 * @param {"broadcast" | "standalone"} [kind]
	 */
	#notify(method, params, kind = 'standalone') {
		this.#client?.notify(method, params, kind);
	}

	/**
	 *
	 */
	#init_tools() {
		if (!this.#options.capabilities?.tools) return;
		this.#server.addMethod('tools/list', async ({ cursor } = {}) => {
			const all_tools = (
				await Promise.all(
					[...this.#tools].map(async ([name, tool]) => {
						if (
							tool.enabled != null &&
							(await safe_enabled(tool.enabled)) === false
						)
							return null;
						return {
							name,
							title: tool.title || tool.description,
							description: tool.description,
							icons: tool.icons,
							_meta: tool._meta,
							inputSchema:
								tool.schema && this.#options.adapter
									? await this.#options.adapter.toJsonSchema(
											tool.schema,
										)
									: { type: 'object', properties: {} },
							...(tool.outputSchema && this.#options.adapter
								? {
										outputSchema:
											await this.#options.adapter.toJsonSchema(
												tool.outputSchema,
											),
									}
								: {}),
							...(tool.annotations
								? {
										annotations: tool.annotations,
									}
								: {}),
						};
					}),
				)
			).filter((tool) => tool !== null);

			const pagination_options = this.#options.pagination?.tools;
			if (!pagination_options || pagination_options.size == null) {
				return { tools: all_tools };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const tools = all_tools.slice(start_index, end_index);
			const has_next = end_index < all_tools.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				tools,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod(
			'tools/call',
			async ({ name, arguments: args }) => {
				const tool = this.#tools.get(name);
				if (!tool) {
					return /** @type {CallToolResult<any>} */ ({
						isError: true,
						content: [
							{
								type: 'text',
								text: `Tool ${name} not found`,
							},
						],
					});
				}

				// Validate input arguments if schema is provided
				let validated_args = args;
				if (tool.schema) {
					let validation_result =
						tool.schema['~standard'].validate(args);
					if (validation_result instanceof Promise)
						validation_result = await validation_result;
					if (validation_result.issues) {
						return /** @type {CallToolResult<any>} */ ({
							isError: true,
							content: [
								{
									type: 'text',
									text: `Invalid arguments for tool ${name}: ${JSON.stringify(validation_result.issues)}`,
								},
							],
						});
					}
					validated_args = validation_result.value;
				}

				// Execute the tool
				const tool_result = tool.schema
					? await tool.execute(validated_args)
					: await tool.execute();

				// Parse the basic result structure
				const parsed_result = v.parse(
					CallToolResultSchema,
					tool_result,
				);

				// If tool has outputSchema, validate and populate structuredContent
				if (
					tool.outputSchema &&
					parsed_result.structuredContent !== undefined
				) {
					let output_validation = tool.outputSchema[
						'~standard'
					].validate(parsed_result.structuredContent);
					if (output_validation instanceof Promise)
						output_validation = await output_validation;
					if (output_validation.issues) {
						return /** @type {CallToolResult<any>} */ ({
							isError: true,
							content: [
								{
									type: 'text',
									text: `Tool ${name} returned invalid structured content: ${JSON.stringify(output_validation.issues)}`,
								},
							],
						});
					}
					// Update with validated structured content
					parsed_result.structuredContent = output_validation.value;
				}

				return parsed_result;
			},
		);
	}
	/**
	 *
	 */
	#init_prompts() {
		if (!this.#options.capabilities?.prompts) return;
		this.#server.addMethod('prompts/list', async ({ cursor } = {}) => {
			const all_prompts = (
				await Promise.all(
					[...this.#prompts].map(async ([name, prompt]) => {
						if (
							prompt.enabled != null &&
							(await safe_enabled(prompt.enabled)) === false
						)
							return null;
						const arguments_schema =
							prompt.schema && this.#options.adapter
								? await this.#options.adapter.toJsonSchema(
										prompt.schema,
									)
								: {
										type: 'object',
										properties:
											/** @type {Record<string, {description: string}>} */ ({}),
										required: [],
									};
						const keys = Object.keys(
							arguments_schema.properties ?? {},
						);
						const required = arguments_schema.required ?? [];
						return {
							name,
							title: prompt.title || prompt.description,
							icons: prompt.icons,
							description: prompt.description,
							arguments: keys.map((key) => {
								const property =
									arguments_schema.properties?.[key];
								const description =
									property && property !== true
										? property.description
										: key;
								return {
									name: key,
									required: required.includes(key),
									description,
								};
							}),
						};
					}),
				)
			).filter((prompt) => prompt !== null);

			const pagination_options = this.#options.pagination?.prompts;
			if (!pagination_options || pagination_options.size == null) {
				return { prompts: all_prompts };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const prompts = all_prompts.slice(start_index, end_index);
			const has_next = end_index < all_prompts.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				prompts,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod(
			'prompts/get',
			async ({ name, arguments: args }) => {
				const prompt = this.#prompts.get(name);
				if (!prompt) {
					throw new McpError(-32601, `Prompt ${name} not found`);
				}
				if (!prompt.schema) {
					return v.parse(
						GetPromptResultSchema,
						await prompt.execute(),
					);
				}
				let validated_args = prompt.schema['~standard'].validate(args);
				if (validated_args instanceof Promise)
					validated_args = await validated_args;
				if (validated_args.issues) {
					throw new McpError(
						-32602,
						`Invalid arguments for prompt ${name}: ${JSON.stringify(validated_args.issues)}`,
					);
				}
				return v.parse(
					GetPromptResultSchema,
					await prompt.execute(validated_args.value),
				);
			},
		);
	}
	/**
	 *
	 */
	#init_resources() {
		if (!this.#options.capabilities?.resources) return;

		if (this.#options.capabilities?.resources?.subscribe) {
			this.#server.addMethod('resources/subscribe', async ({ uri }) => {
				this.#event_target.dispatchEvent(
					event('subscription', { uri, action: 'add' }),
				);
				return {};
			});
			this.#server.addMethod('resources/unsubscribe', async ({ uri }) => {
				this.#event_target.dispatchEvent(
					event('subscription', { uri, action: 'remove' }),
				);
				return {};
			});
		}

		this.#server.addMethod('resources/list', async ({ cursor } = {}) => {
			const all_resources = [];

			// Add static resources
			for (const [
				uri,
				{ description, name, title, icons, ...resource },
			] of this.#resources) {
				if (!resource.template) {
					if (
						resource.enabled != null &&
						(await safe_enabled(resource.enabled)) === false
					)
						continue;
					all_resources.push({
						name,
						title: title || description,
						description,
						uri,
						icons,
					});
				} else if (resource.list_resources) {
					if (
						resource.enabled != null &&
						(await safe_enabled(resource.enabled)) === false
					)
						continue;
					const template_resources = await resource.list_resources();
					all_resources.push(...template_resources);
				}
			}

			const pagination_options = this.#options.pagination?.resources;
			if (!pagination_options || pagination_options.size == null) {
				return { resources: all_resources };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const resources = all_resources.slice(start_index, end_index);
			const has_next = end_index < all_resources.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				resources,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod('resources/templates/list', async () => {
			return {
				resourceTemplates: (
					await Promise.all(
						[...this.#resources].map(
							async ([
								uri,
								{
									description,
									name,
									title,
									template,
									icons,
									enabled,
								},
							]) => {
								if (!template) return null;
								if (
									enabled != null &&
									(await safe_enabled(enabled)) === false
								)
									return null;
								return {
									name,
									icons,
									title: title || description,
									description,
									uriTemplate: uri,
								};
							},
						),
					)
				).filter((resource) => resource != null),
			};
		});
		this.#server.addMethod('resources/read', async ({ uri }) => {
			let resource = this.#resources.get(uri);
			let params;
			if (!resource) {
				const match = this.#templates.match(uri);
				if (match) {
					resource = this.#resources.get(match.template);
					params = match.params;
				}
				if (!resource) {
					throw new McpError(-32601, `Resource ${uri} not found`);
				}
			}
			if (resource.template) {
				if (!params)
					throw new McpError(
						-32602,
						'Missing parameters for template resource',
					);
				return v.parse(
					ReadResourceResultSchema,
					await resource.execute(uri, params),
				);
			}
			return v.parse(
				ReadResourceResultSchema,
				await resource.execute(uri),
			);
		});
	}
	/**
	 *
	 */
	#init_roots() {
		this.#server.addMethod('notifications/roots/list_changed', () => {
			this.#refresh_roots();
			return null;
		});
	}

	/**
	 * Request roots list from client
	 */
	async #refresh_roots() {
		if (!this.#client_capabilities?.roots) return;

		this.#lazyily_create_client();
		try {
			const response = await this.#client?.request(
				'roots/list',
				undefined,
				'standalone',
			);
			this.roots = response?.roots || [];
		} catch {
			// Client doesn't support roots or request failed
			this.roots = [];
		}
	}

	#init_completion() {
		this.#server.addMethod(
			'completion/complete',
			async ({ argument, ref, context }) => {
				const completions = this.#completions[ref.type];
				if (!completions) return null;
				const complete = completions.get(ref.uri ?? ref.name);
				if (!complete) return null;
				const actual_complete = complete[argument.name];
				if (!actual_complete) return null;
				return v.parse(
					CompleteResultSchema,
					await actual_complete(argument.value, context),
				);
			},
		);
	}

	#init_logging() {
		if (!this.#options.capabilities?.logging) return;

		this.#server.addMethod('logging/setLevel', ({ level }) => {
			this.#event_target.dispatchEvent(
				event('loglevelchange', { level }),
			);
			return {};
		});
	}

	#notify_tools_list_changed() {
		if (this.#options.capabilities?.tools?.listChanged) {
			this.#notify('notifications/tools/list_changed', {}, 'broadcast');
		}
	}

	#notify_prompts_list_changed() {
		if (this.#options.capabilities?.prompts?.listChanged) {
			this.#notify('notifications/prompts/list_changed', {}, 'broadcast');
		}
	}

	#notify_resources_list_changed() {
		if (this.#options.capabilities?.resources?.listChanged) {
			this.#notify(
				'notifications/resources/list_changed',
				{},
				'broadcast',
			);
		}
	}

	/**
	 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
	 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
	 *
	 * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @template {StandardSchema | undefined} [TOutputSchema=undefined]
	 * @param {{ name: string; _meta?: Record<string, any>; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; outputSchema?: StandardSchemaV1.InferOutput<TOutputSchema extends undefined ? never : TOutputSchema> extends Record<string, unknown> ? TOutputSchema : never; annotations?: ToolAnnotations } & Icons} options
	 * @param {TSchema extends undefined ? (()=>Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} execute
	 */
	tool(
		{
			name,
			description,
			title,
			schema,
			outputSchema,
			annotations,
			enabled,
			icons,
			_meta,
		},
		execute,
	) {
		this.#notify_tools_list_changed();
		this.#tools.set(name, {
			description,
			title,
			enabled,
			schema,
			outputSchema,
			execute,
			annotations,
			icons,
			_meta,
		});
	}
	/**
	 * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
	 * Use the description and title to help the user to understand what the prompt does and when to use it.
	 *
	 * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
	 * for each input that will be used to provide completions for the user.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @param {{ name: string; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>>> } & Icons} options
	 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
	 */
	prompt(
		{ name, description, title, schema, complete, enabled, icons },
		execute,
	) {
		if (complete) {
			this.#completions['ref/prompt'].set(name, complete);
		}
		this.#notify_prompts_list_changed();
		this.#prompts.set(name, {
			description,
			title,
			schema,
			execute,
			enabled,
			icons,
		});
	}
	/**
	 * @type {(resource: StoredResource & {complete?: Partial<Record<string,Completion>>, uri: string})=> void}
	 */
	#resource({ uri, complete, ...resource }) {
		if (complete) {
			this.#completions['ref/resource'].set(uri, complete);
		}
		if (resource.template) {
			this.#templates.add(uri);
		}
		this.#notify_resources_list_changed();
		this.#resources.set(uri, resource);
	}

	/**
	 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Use the description and title to help the user to understand what the resource is.
	 * @param {{ name: string; description: string; title?: string; uri: string, enabled?: ()=>boolean | Promise<boolean>; } & Icons} options
	 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	resource({ name, description, title, uri, enabled, icons }, execute) {
		this.#resource({
			name,
			description,
			title,
			uri,
			execute,
			enabled,
			icons,
			template: false,
		});
	}
	/**
	 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
	 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
	 * be invoked to provide completions for the template variables to the user.
	 * Use the description and title to help the user to understand what the resource is.
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @param {{ name: string; description: string; title?: string; enabled?: ()=>boolean | Promise<boolean>; uri: TUri; complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>; list?: () => Promise<Array<Resource>> | Array<Resource> } & Icons} options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	template(
		{
			name,
			description,
			title,
			uri,
			complete,
			list: list_resources,
			enabled,
			icons,
		},
		execute,
	) {
		this.#resource({
			name,
			enabled,
			description,
			title,
			uri,
			execute,
			complete,
			icons,
			list_resources,
			template: true,
		});
	}
	/**
	 * The main function that receive a JSONRpc message and either dispatch a `send` event or process the request.
	 *
	 * @param {JSONRPCMessage} message
	 * @param {Context<CustomContext>} [ctx]
	 * @returns {ReturnType<JSONRPCServer['receive']> | ReturnType<JSONRPCClient['receive'] | undefined>}
	 */
	receive(message, ctx) {
		// Validate the message first
		const validated_message = v.safeParse(
			v.union([JSONRPCRequestSchema, JSONRPCNotificationSchema]),
			message,
		);

		// Check if it's a request or response
		if (validated_message.success) {
			const progress_token = /** @type {string | undefined} */ (
				validated_message.output.params?._meta?.progressToken
			);
			return this.#ctx_storage.run(
				{ ...(ctx ?? {}), progress_token },
				async () =>
					await this.#server.receive(validated_message.output),
			);
		}
		// It's a response - handle with client
		const validated_response = v.parse(
			v.union([JSONRPCResponseSchema, JSONRPCErrorSchema]),
			message,
		);
		this.#lazyily_create_client();
		return this.#ctx_storage.run(ctx ?? {}, async () =>
			this.#client?.receive(validated_response),
		);
	}

	/**
	 * Lower level api to send a request to the client, mostly useful to call client methods that not yet supported by the server or
	 * if you want to send requests with json schema that is not expressible with your validation library.
	 * @param {{ method: string, params?: JSONRPCParams }} request
	 * @returns {Promise<unknown>}
	 */
	async request({ method, params }) {
		this.#lazyily_create_client();
		return this.#client?.request(method, params, 'standalone');
	}

	/**
	 * Send a notification for subscriptions
	 * @template {keyof ChangedArgs} TWhat
	 * @param {[what: TWhat, ...ChangedArgs[TWhat]]} args
	 */
	changed(...args) {
		const [what, id] = args;
		if (what === 'prompts') {
			this.#notify_prompts_list_changed();
		} else if (what === 'tools') {
			this.#notify_tools_list_changed();
		} else if (what === 'resources') {
			this.#notify_resources_list_changed();
		} else {
			const resource = this.#resources.get(id);
			if (!resource) return;
			this.#notify(
				`notifications/resources/updated`,
				{
					uri: id,
					title: resource.name,
				},
				'broadcast',
			);
		}
	}

	/**
	 * Refresh roots list from client
	 */
	async refreshRoots() {
		await this.#refresh_roots();
	}

	/**
	 * Emit an elicitation request to the client. Elicitations are used to ask the user for input in a structured way, the client will show a UI to the user to fill the input.
	 * The schema should be a valid Standard Schema V1 schema and should be an Object with the properties you need.
	 * The client will return the validated input as a JSON object that matches the schema.
	 *
	 * If the client doesn't support elicitation, it will throw an error.
	 *
	 * @template {StandardSchema extends undefined ? never : StandardSchema} TSchema
	 * @param {string} message
	 * @param {TSchema} schema
	 * @returns {Promise<ElicitResult & { content?: StandardSchemaV1.InferOutput<TSchema> }>}
	 */
	async elicitation(message, schema) {
		if (!this.#client_capabilities?.elicitation)
			throw new McpError(-32601, "Client doesn't support elicitation");

		this.#lazyily_create_client();
		const result = await this.#client?.request(
			'elicitation/create',
			{
				message,
				requestedSchema:
					await this.#options.adapter?.toJsonSchema(schema),
			},
			'standalone',
		);
		const elicit_result = v.parse(ElicitResultSchema, result);
		let validated_result = schema['~standard'].validate(
			elicit_result.content,
		);
		if (validated_result instanceof Promise)
			validated_result = await validated_result;
		if (validated_result.issues) {
			throw new McpError(
				-32603,
				`Invalid elicitation result: ${JSON.stringify(validated_result.issues)}`,
			);
		}
		return { ...elicit_result, content: validated_result.value };
	}

	/**
	 * Request language model sampling from the client
	 * @param {CreateMessageRequestParams} request
	 * @returns {Promise<CreateMessageResult>}
	 */
	async message(request) {
		if (!this.#client_capabilities?.sampling)
			throw new McpError(-32601, "Client doesn't support sampling");

		this.#lazyily_create_client();

		// Validate the request
		const validated_request = v.parse(
			CreateMessageRequestParamsSchema,
			request,
		);

		// Make the request to the client
		const response = await this.#client?.request(
			'sampling/createMessage',
			validated_request,
			'standalone',
		);

		// Validate and return the response
		return v.parse(CreateMessageResultSchema, response);
	}

	/**
	 * Send a progress notification to the client. This is useful for long-running operations where you want to inform the user about the progress.
	 *
	 * @param {number} progress The current progress value, it should be between 0 and total and should always increase
	 * @param {number} [total] The total value, defaults to 1
	 * @param {string} [message] An optional message to accompany the progress update
	 */
	progress(progress, total = 1, message = undefined) {
		if (this.#progress_token != null) {
			this.#notify('notifications/progress', {
				progress,
				total,
				message,
				progressToken: this.#progress_token,
			});
		}
	}

	/**
	 * Log a message to the client if logging is enabled and the level is appropriate
	 *
	 * @param {LoggingLevel} level
	 * @param {unknown} data
	 * @param {string} [logger]
	 */
	log(level, data, logger) {
		if (!this.#options.capabilities?.logging) {
			throw new McpError(
				-32601,
				"The server doesn't support logging, please enable it in capabilities",
			);
		}

		const current_session_level =
			this.#ctx_storage.getStore()?.sessionInfo?.logLevel ??
			this.#options.logging?.default ??
			'info';

		if (
			current_session_level &&
			this.#should_log(level, current_session_level)
		) {
			this.#notify('notifications/message', {
				level,
				data,
				logger,
			});
		}
	}

	/**
	 * Check if a log message should be sent based on severity levels
	 * @param {LoggingLevel} message_level
	 * @param {LoggingLevel} session_level
	 * @returns {boolean}
	 */
	#should_log(message_level, session_level) {
		const levels = [
			'debug',
			'info',
			'notice',
			'warning',
			'error',
			'critical',
			'alert',
			'emergency',
		];
		const message_severity = levels.indexOf(message_level);
		const session_severity = levels.indexOf(session_level);

		// Send if message severity is equal to or higher than session level
		return message_severity >= session_severity;
	}
}
