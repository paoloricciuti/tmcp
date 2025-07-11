/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { Tool, Completion, Prompt, Resource, ServerOptions } from "./internal.js";
 */
import { JSONRPCServer, JSONRPCClient } from 'json-rpc-2.0';
import { UriTemplateMatcher } from 'uri-template-matcher';
import { toJsonSchema } from 'xsschema';

/**
 *
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
	 * @type {{ [ref: string]: Map<string, Completion> }}
	 */
	#completions = {
		'ref/prompt': new Map(),
		'ref/resource': new Map(),
	};
	/**
	 * @param {object} server_info
	 * @param {ServerOptions} options
	 */
	constructor(server_info, options) {
		this.#options = options;
		if (options.send) {
			this.#client = new JSONRPCClient((payload) => {
				options.send?.(payload);
			});
		}
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
						inputSchema: await toJsonSchema(tool.schema),
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
				let validated_args = tool.schema['~standard'].validate(args);
				if (validated_args instanceof Promise)
					validated_args = await validated_args;
				if (validated_args.issues) {
					throw new Error(
						`Invalid arguments for tool ${name}: ${JSON.stringify(validated_args.issues)}`,
					);
				}
				return tool.execute(validated_args.value);
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
				[...this.#prompts].map(async ([name, tool]) => {
					const arguments_schema = await toJsonSchema(tool.schema);
					const keys = Object.keys(arguments_schema.properties ?? {});
					const required = arguments_schema.required ?? [];
					return {
						name,
						title: tool.description,
						description: tool.description,
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
				let validated_args = prompt.schema['~standard'].validate(args);
				if (validated_args instanceof Promise)
					validated_args = await validated_args;
				if (validated_args.issues) {
					throw new Error(
						`Invalid arguments for tool ${name}: ${JSON.stringify(validated_args.issues)}`,
					);
				}
				return prompt.execute(validated_args.value);
			},
		);
	}
	/**
	 *
	 */
	#init_resources() {
		if (!this.#options.capabilities?.resources) return;
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
			return resource.execute(uri, params);
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
				return {
					completion: {
						values: complete(argument, context),
						hasMore: false,
					},
				};
			},
		);
	}
	/**
	 * @template {StandardSchemaV1} TSchema
	 * @param {string} name
	 * @param {string} description
	 * @param {TSchema} schema
	 * @param {(input: StandardSchemaV1.InferInput<TSchema>) => Promise<unknown> | unknown} execute
	 */
	tool(name, description, schema, execute) {
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
	 * @template {StandardSchemaV1} TSchema
	 * @param {string} name
	 * @param {string} description
	 * @param {TSchema} schema
	 * @param {(input: StandardSchemaV1.InferInput<TSchema>) => Promise<unknown> | unknown} execute
	 * @param {Completion} [complete]
	 */
	prompt(name, description, schema, execute, complete) {
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
	 * @param {string} name
	 * @param {string} description
	 * @param {string} uri
	 * @param {(uri: string, params?: unknown) => Promise<unknown> | unknown} execute
	 * @param {Completion} [complete]
	 * @param {boolean} [template=false]
	 */
	#resource(name, description, uri, execute, complete, template = false) {
		if (complete) {
			this.#completions['ref/resource'].set(uri, complete);
		}
		if (template) {
			this.#templates.add(uri);
		}
		if (this.#options.capabilities?.resources?.listChanged) {
			this.#notify('notifications/resources/list_changed', {});
		}
		this.#resources.set(uri, {
			description,
			name,
			execute,
			template,
		});
	}
	/**
	 * @param {string} name
	 * @param {string} description
	 * @param {string} uri
	 * @param {(uri: string, params?: unknown) => Promise<unknown> | unknown} execute
	 */
	resource(name, description, uri, execute) {
		this.#resource(name, description, uri, execute, undefined, false);
	}
	/**
	 * @param {string} name
	 * @param {string} description
	 * @param {string} uri
	 * @param {(uri: string, params?: unknown) => Promise<unknown> | unknown} execute
	 * @param {Completion} [complete]
	 */
	template(name, description, uri, execute, complete) {
		this.#resource(name, description, uri, execute, complete, true);
	}
	/**
	 * @param {JSONRPCRequest} request
	 * @returns {ReturnType<JSONRPCServer['receive']>}
	 */
	receive(request) {
		return this.#server.receive(request);
	}
}
