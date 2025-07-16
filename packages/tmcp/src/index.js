/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import SqidsType from "sqids";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { CallToolResult, ReadResourceResult, GetPromptResult, ClientCapabilities as ClientCapabilitiesType, JSONRPCRequest as JSONRPCRequestType, JSONRPCResponse, CreateMessageRequestParams, CreateMessageResult, Resource } from "./validation/index.js";
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
	 * @type {Map<string, Tool<any>>}
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
	 * @type {AsyncLocalStorage<string | undefined>}
	 */
	#session_storage = new AsyncLocalStorage();

	/**
	 * @type {Map<string|undefined, ClientCapabilities>}
	 */
	#client_capabilities_map = new Map();

	/**
	 * @type {Map<string|undefined, string>}
	 */
	#negotiated_protocol_versions = new Map();

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
	}

	get #session_id() {
		return this.#session_storage.getStore();
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

		this.#event_target.addEventListener(
			event,
			(e) => {
				callback(/** @type {CustomEvent} */ (e).detail);
			},
			options,
		);
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
					throw new Error(`Tool ${name} not found`);
				}
				if (!tool.schema) {
					return v.parse(CallToolResultSchema, await tool.execute());
				}
				let validated_args = tool.schema['~standard'].validate(args);
				if (validated_args instanceof Promise)
					validated_args = await validated_args;
				if (validated_args.issues) {
					throw new Error(
						`Invalid arguments for tool ${name}: ${JSON.stringify(validated_args.issues)}`,
					);
				}
				return v.parse(
					CallToolResultSchema,
					await tool.execute(validated_args.value),
				);
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
					throw new Error(`Tool ${name} not found`);
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
					throw new Error(
						`Invalid arguments for tool ${name}: ${JSON.stringify(validated_args.issues)}`,
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
					throw new Error(`Resource ${uri} not found`);
				}
			}
			if (resource.template) {
				if (!params)
					throw new Error('Missing parameters for template resource');
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
			({ argument, ref, context }) => {
				const completions = this.#completions[ref.type];
				if (!completions) return null;
				const complete = completions.get(ref.uri ?? ref.name);
				if (!complete) return null;
				const actual_complete = complete[argument.name];
				if (!actual_complete) return null;
				return v.parse(
					CompleteResultSchema,
					actual_complete(argument.value, context),
				);
			},
		);
	}
	/**
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @param {{ name: string; description: string; title?: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never }} options
	 * @param {TSchema extends undefined ? (()=>Promise<CallToolResult> | CallToolResult) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult> | CallToolResult)} execute
	 */
	tool({ name, description, title, schema }, execute) {
		if (this.#options.capabilities?.tools?.listChanged) {
			this.#notify('notifications/tools/list_changed', {});
		}
		this.#tools.set(name, {
			description,
			title,
			schema,
			execute,
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
	 * @param {string} [session_id]
	 * @returns {ReturnType<JSONRPCServer['receive']> | ReturnType<JSONRPCClient['receive'] | undefined>}
	 */
	receive(message, session_id) {
		// Validate the message first
		const validated_message = v.safeParse(JSONRPCRequestSchema, message);

		// Check if it's a request or response
		if (validated_message.success) {
			return this.#session_storage.run(
				session_id,
				async () =>
					await this.#server.receive(validated_message.output),
			);
		}
		// It's a response - handle with client
		const validated_response = v.parse(JSONRPCResponseSchema, message);
		this.#lazyily_create_client();
		return this.#session_storage.run(session_id, async () =>
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
			throw new Error("Client doesn't support elicitation");

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
			throw new Error(
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
			throw new Error("Client doesn't support sampling");

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
}
