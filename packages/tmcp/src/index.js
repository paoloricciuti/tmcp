/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import SqidsType from "sqids";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { CallToolResult, ReadResourceResult, GetPromptResult, ClientCapabilities as ClientCapabilitiesType, JSONRPCRequest as JSONRPCRequestType, JSONRPCResponse, CreateMessageRequestParams, CreateMessageResult, Resource, LoggingLevel, ToolAnnotations } from "./validation/index.js";
 * @import { Tool, Completion, Prompt, StoredResource, ServerOptions, ServerInfo, SubscriptionsKeys, McpEvents } from "./internal/internal.js";
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
} from './validation/index.js';
import {
	get_supported_versions,
	negotiate_protocol_version,
} from './validation/version.js';
import { should_version_negotiation_fail } from './validation/version.js';

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
 * @typedef {Object} Context
 * @property {string} [sessionId]
 * @property {AuthInfo} [auth]
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
 * @typedef {ClientCapabilitiesType} ClientCapabilities
 */

/**
 * @template {StandardSchemaV1} StandardSchema
 */
export class McpServer {
	#server = new JSONRPCServer();
	/**
	 * @type {JSONRPCClient<Record<string, any> | undefined> | undefined}
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
	 * @type {Record<SubscriptionsKeys, Map<string, Set<string | undefined>>>}
	 */
	#subscriptions = {
		/**
		 * @type {Map<string, Set<string>>}
		 */
		resource: new Map(),
	};

	/**
	 * @type {AsyncLocalStorage<Context>}
	 */
	#ctx_storage = new AsyncLocalStorage();

	/**
	 * @type {Map<string|undefined, ClientCapabilities>}
	 */
	#client_capabilities_map = new Map();

	/**
	 * @type {Map<string|undefined, string>}
	 */
	#negotiated_protocol_versions = new Map();

	/**
	 * @type {Map<string|undefined, LoggingLevel>}
	 */
	#session_log_levels = new Map();

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

				const session_id = this.#session_id;

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

				// Store negotiated protocol version
				this.#negotiated_protocol_versions.set(
					session_id,
					negotiated_version,
				);

				// Store client capabilities
				this.#client_capabilities_map.set(
					session_id,
					validated_initialize.capabilities,
				);

				// Dispatch initialization event
				this.#event_target.dispatchEvent(
					new CustomEvent('initialize', {
						detail: validated_initialize,
					}),
				);

				// Trigger initial roots request if client supports it
				if (validated_initialize.capabilities?.roots) {
					this.#refresh_roots();
				}

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

	get #session_id() {
		return this.#ctx_storage.getStore()?.sessionId;
	}

	get ctx() {
		return this.#ctx_storage.getStore() ?? {};
	}

	get #client_capabilities() {
		return this.#client_capabilities_map.get(this.#session_id);
	}

	currentClientCapabilities() {
		return this.#client_capabilities;
	}

	#lazyily_create_client() {
		if (!this.#client) {
			this.#client = new JSONRPCClient((payload, context = {}) => {
				this.#event_target.dispatchEvent(
					new CustomEvent('send', {
						detail: { request: payload, context },
					}),
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
		if (event === 'send') {
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
	 * @param {Record<string, any>} [extra]
	 */
	#notify(method, params, extra) {
		this.#client?.notify(method, params, extra);
	}

	/**
	 *
	 */
	#init_tools() {
		if (!this.#options.capabilities?.tools) return;
		this.#server.addMethod('tools/list', async () => {
			const available_tools = await Promise.all(
				[...this.#tools].map(async ([name, tool]) => {
					return {
						name,
						title: tool.title || tool.description,
						description: tool.description,

						inputSchema: tool.schema
							? await this.#options.adapter.toJsonSchema(
									tool.schema,
								)
							: { type: 'object', properties: {} },
						...(tool.outputSchema
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
			);
			return {
				tools: available_tools,
			};
		});
		this.#server.addMethod(
			'tools/call',
			async ({ name, arguments: args }) => {
				const tool = this.#tools.get(name);
				if (!tool) {
					throw new McpError(-32601, `Tool ${name} not found`);
				}

				// Validate input arguments if schema is provided
				let validated_args = args;
				if (tool.schema) {
					let validation_result =
						tool.schema['~standard'].validate(args);
					if (validation_result instanceof Promise)
						validation_result = await validation_result;
					if (validation_result.issues) {
						throw new McpError(
							-32602,
							`Invalid arguments for tool ${name}: ${JSON.stringify(validation_result.issues)}`,
						);
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
						throw new McpError(
							-32603,
							`Tool ${name} returned invalid structured content: ${JSON.stringify(output_validation.issues)}`,
						);
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
			const all_prompts = await Promise.all(
				[...this.#prompts].map(async ([name, prompt]) => {
					const arguments_schema = prompt.schema
						? await this.#options.adapter.toJsonSchema(
								prompt.schema,
							)
						: {
								type: 'object',
								properties:
									/** @type {Record<string, {description: string}>} */ ({}),
								required: [],
							};
					const keys = Object.keys(arguments_schema.properties ?? {});
					const required = arguments_schema.required ?? [];
					return {
						name,
						title: prompt.title || prompt.description,
						description: prompt.description,
						arguments: keys.map((key) => {
							const property = arguments_schema.properties?.[key];
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
			);

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
				let subscriptions = this.#subscriptions.resource.get(uri);
				if (!subscriptions) {
					subscriptions = new Set();
					this.#subscriptions.resource.set(uri, subscriptions);
				}
				subscriptions.add(this.#session_id);
				return {};
			});
		}

		this.#server.addMethod('resources/list', async ({ cursor } = {}) => {
			const all_resources = [];

			// Add static resources
			for (const [uri, { description, name, title, ...resource }] of this
				.#resources) {
				if (!resource.template) {
					all_resources.push({
						name,
						title: title || description,
						description,
						uri,
					});
				} else if (resource.list_resources) {
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
				resourceTemplates: [...this.#resources].reduce(
					(arr, [uri, { description, name, title, template }]) => {
						if (template) {
							arr.push({
								name,
								title: title || description,
								description,
								uriTemplate: uri,
							});
						}
						return arr;
					},
					/** @type {Array<{name: string, title: string, description: string, uriTemplate: string}>} */ ([]),
				),
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
				{
					sessions: [this.#session_id],
				},
			);
			this.roots = response?.roots || [];
		} catch {
			// Client doesn't support roots or request failed
			this.roots = [];
		}
	}
	/**
	 *
	 */
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
	/**
	 *
	 */
	#init_logging() {
		if (!this.#options.capabilities?.logging) return;

		this.#server.addMethod('logging/setLevel', ({ level }) => {
			this.#session_log_levels.set(this.#session_id, level);
			return {};
		});
	}
	/**
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @template {StandardSchema | undefined} [TOutputSchema=undefined]
	 * @param {{ name: string; description: string; title?: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; outputSchema?: StandardSchemaV1.InferOutput<TOutputSchema extends undefined ? never : TOutputSchema> extends Record<string, unknown> ? TOutputSchema : never; annotations?: ToolAnnotations }} options
	 * @param {TSchema extends undefined ? (()=>Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} execute
	 */
	tool(
		{ name, description, title, schema, outputSchema, annotations },
		execute,
	) {
		if (this.#options.capabilities?.tools?.listChanged) {
			this.#notify('notifications/tools/list_changed', {});
		}
		this.#tools.set(name, {
			description,
			title,
			schema,
			outputSchema,
			execute,
			annotations,
		});
	}
	/**
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @param {{ name: string; description: string; title?: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>>> }} options
	 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
	 */
	prompt({ name, description, title, schema, complete }, execute) {
		if (complete) {
			this.#completions['ref/prompt'].set(name, complete);
		}
		if (this.#options.capabilities?.prompts?.listChanged) {
			this.#notify('notifications/prompts/list_changed', {});
		}
		this.#prompts.set(name, {
			description,
			title,
			schema,
			execute,
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
		if (this.#options.capabilities?.resources?.listChanged) {
			this.#notify('notifications/resources/list_changed', {});
		}
		this.#resources.set(uri, resource);
	}
	/**
	 * @param {{ name: string; description: string; title?: string; uri: string }} options
	 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	resource({ name, description, title, uri }, execute) {
		this.#resource({
			name,
			description,
			title,
			uri,
			execute,
			template: false,
		});
	}
	/**
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @param {{ name: string; description: string; title?: string; uri: TUri; complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>>; list?: () => Promise<Array<Resource>> | Array<Resource> }} options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	template(
		{ name, description, title, uri, complete, list: list_resources },
		execute,
	) {
		this.#resource({
			name,
			description,
			title,
			uri,
			execute,
			complete,
			list_resources,
			template: true,
		});
	}
	/**
	 * @param {JSONRPCResponse | JSONRPCRequest} message
	 * @param {Context} [ctx]
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
			// we want to set a default log level for each session
			// so that if the user calls `log` it can send a notification
			// to each client that didn't explicitly set a log level too
			if (
				!!this.#options.capabilities?.logging &&
				!this.#session_log_levels.has(ctx?.sessionId)
			) {
				this.#session_log_levels.set(
					ctx?.sessionId,
					this.#options.logging?.default ?? 'info',
				);
			}
			return this.#ctx_storage.run(
				ctx ?? {},
				async () =>
					await this.#server.receive(validated_message.output),
			);
		}
		// It's a response - handle with client
		const validated_response = v.parse(JSONRPCResponseSchema, message);
		this.#lazyily_create_client();
		return this.#ctx_storage.run(ctx ?? {}, async () =>
			this.#client?.receive(validated_response),
		);
	}

	/**
	 * Send a notification for subscriptions
	 * @param {SubscriptionsKeys} what
	 * @param {string} id
	 */
	changed(what, id) {
		if (this.#subscriptions[what].has(id)) {
			const resource = this.#resources.get(id);
			if (!resource) return;
			const sessions = this.#subscriptions[what].get(id);
			this.#notify(
				`notifications/resources/updated`,
				{
					uri: id,
					title: resource.name,
				},
				{
					sessions: sessions ? [...sessions] : undefined,
				},
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
	 * @template {StandardSchema} TSchema
	 * @param {TSchema} schema
	 * @returns {Promise<StandardSchemaV1.InferOutput<TSchema>>}
	 */
	async elicitation(schema) {
		if (!this.#client_capabilities?.elicitation)
			throw new McpError(-32601, "Client doesn't support elicitation");

		this.#lazyily_create_client();
		let validated_result = schema['~standard'].validate(
			await this.#client?.request(
				'elicitation/create',
				{
					params: await this.#options.adapter.toJsonSchema(schema),
				},
				{
					sessions: [this.#session_id],
				},
			),
		);
		if (validated_result instanceof Promise)
			validated_result = await validated_result;
		if (validated_result.issues) {
			throw new McpError(
				-32603,
				`Invalid elicitation result: ${JSON.stringify(validated_result.issues)}`,
			);
		}
		return validated_result.value;
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
			{
				sessions: [this.#session_id],
			},
		);

		// Validate and return the response
		return v.parse(CreateMessageResultSchema, response);
	}

	/**
	 * Log a message to the client if logging is enabled and the level is appropriate
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

		const sessions = [];

		for (let [session_id, session_log_level] of this.#session_log_levels) {
			// Check if the current log level should be sent based on severity
			if (this.#should_log(level, session_log_level)) {
				sessions.push(session_id);
			}
		}

		if (sessions.length === 0) return;

		// Send the log notification to the client
		this.#notify(
			'notifications/message',
			{
				level,
				data,
				logger,
			},
			{
				sessions,
			},
		);
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
