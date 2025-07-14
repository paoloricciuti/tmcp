/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { CallToolResult, ReadResourceResult, GetPromptResult, CompleteResult } from "./validation/index.js";
 * @import { Tool, Completion, Prompt, Resource, ServerOptions, ServerInfo, SubscriptionsKeys, McpEvents } from "./internal/internal.js";
 */
import { JSONRPCServer, JSONRPCClient } from 'json-rpc-2.0';
import { UriTemplateMatcher } from 'uri-template-matcher';
import {
	CallToolResultSchema,
	ReadResourceResultSchema,
	GetPromptResultSchema,
	CompleteResultSchema,
} from './validation/index.js';
import * as v from 'valibot';

/**
 * @template {StandardSchemaV1} StandardSchema
 */
export class McpServer {
	#server = new JSONRPCServer();
	/**
	 * @type {JSONRPCClient | undefined}
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
	 * @type {Map<string, Resource>}
	 */
	#resources = new Map();
	#templates = new UriTemplateMatcher();
	/**
	 * @type {{ [ref: string]: Map<string, Partial<Record<string, Completion>>> }}
	 */
	#completions = {
		'ref/prompt': new Map(),
		'ref/resource': new Map(),
	};

	#event_target = new EventTarget();

	/**
	 * @type {Record<SubscriptionsKeys, Set<string>>}
	 */
	#subscriptions = {
		/**
		 * @type {Set<string>}
		 */
		resource: new Set(),
	};

	/**
	 * @param {ServerInfo} server_info
	 * @param {ServerOptions<StandardSchema>} options
	 */
	constructor(server_info, options) {
		this.#options = options;
		this.#server.addMethod('initialize', ({ protocolVersion }) => {
			return {
				protocolVersion,
				...options,
				serverInfo: server_info,
			};
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
		this.#init_completion();
	}

	/**
	 * @template {keyof McpEvents} TEvent
	 * @param {TEvent} event
	 * @param {McpEvents[TEvent]} callback
	 * @param {AddEventListenerOptions} [options]
	 */
	on(event, callback, options) {
		if (event === 'send' && !this.#client) {
			this.#client = new JSONRPCClient((payload) => {
				this.#event_target.dispatchEvent(
					new CustomEvent('send', { detail: payload }),
				);
			});
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
	 */
	#notify(method, params) {
		this.#client?.notify(method, params);
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
						title: tool.description,
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
		this.#server.addMethod('prompts/list', async () => {
			const available_prompts = await Promise.all(
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
						title: prompt.description,
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
			return {
				prompts: available_prompts,
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
				this.#subscriptions.resource.add(uri);
				return {};
			});
		}

		this.#server.addMethod('resources/list', async () => {
			return {
				resources: [...this.#resources].reduce(
					(arr, [uri, { description, name, template }]) => {
						if (!template) {
							arr.push({
								name,
								description,
								uri,
							});
						}
						return arr;
					},
					/** @type {Array<{name: string, description: string, uri: string}>} */ ([]),
				),
			};
		});
		this.#server.addMethod('resources/templates/list', async () => {
			return {
				resourceTemplates: [...this.#resources].reduce(
					(arr, [uri, { description, name, template }]) => {
						if (template) {
							arr.push({
								name,
								description,
								uriTemplate: uri,
							});
						}
						return arr;
					},
					/** @type {Array<{name: string, description: string, uriTemplate: string}>} */ ([]),
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
	 * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never }} options
	 * @param {TSchema extends undefined ? (()=>Promise<CallToolResult> | CallToolResult) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult> | CallToolResult)} execute
	 */
	tool({ name, description, schema }, execute) {
		if (this.#options.capabilities?.tools?.listChanged) {
			this.#notify('notifications/tools/list_changed', {});
		}
		this.#tools.set(name, {
			description,
			schema,
			execute,
		});
	}
	/**
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @param {{ name: string; description: string; schema?: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema> extends Record<string, unknown> ? TSchema : never; complete?: NoInfer<TSchema extends undefined ? never : Partial<Record<keyof (StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>), Completion>>> }} options
	 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
	 */
	prompt({ name, description, schema, complete }, execute) {
		if (complete) {
			this.#completions['ref/prompt'].set(name, complete);
		}
		if (this.#options.capabilities?.prompts?.listChanged) {
			this.#notify('notifications/prompts/list_changed', {});
		}
		this.#prompts.set(name, {
			description,
			schema,
			execute,
		});
	}
	/**
	 * @type {(resource: Resource & {complete?: Partial<Record<string,Completion>>, uri: string})=> void}
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
	 * @param {{ name: string; description: string; uri: string }} options
	 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	resource({ name, description, uri }, execute) {
		this.#resource({
			name,
			description,
			uri,
			execute,
			template: false,
		});
	}
	/**
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @param {{ name: string; description: string; uri: TUri; complete?: NoInfer<TVariables extends never ? never : Partial<Record<TVariables, Completion>>> }} options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 */
	template({ name, description, uri, complete }, execute) {
		this.#resource({
			name,
			description,
			uri,
			execute,
			complete,
			template: true,
		});
	}
	/**
	 * @param {JSONRPCRequest} request
	 * @returns {ReturnType<JSONRPCServer['receive']>}
	 */
	receive(request) {
		return this.#server.receive(request);
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
			this.#notify(`notifications/resources/updated`, {
				uri: id,
				title: resource.name,
			});
		}
	}
}
