/**
 * @import { McpServer } from "tmcp";
 * @import { Options } from "yargs";
 * @import { InputSchema, Tool } from "./internal.js";
 */
import process from 'node:process';
import { AsyncLocalStorage } from 'node:async_hooks';
import Yargs from 'yargs/yargs';

/**
 * Maps a JSON Schema type string to a yargs option type.
 * @param {string | undefined} json_schema_type
 * @returns {Options["type"]}
 */
function json_schema_type_to_yargs(json_schema_type) {
	switch (json_schema_type) {
		case 'string':
			return 'string';
		case 'number':
		case 'integer':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'array':
			return 'array';
		default:
			return 'string';
	}
}

/**
 * Converts a JSON Schema inputSchema into a yargs options object.
 * @param {InputSchema} input_schema
 * @returns {Record<string, Options>}
 */
function json_schema_to_yargs_options(input_schema) {
	/** @type {Record<string, Options>} */
	const options = {};

	const properties = input_schema.properties ?? {};
	const required = new Set(input_schema.required ?? []);

	for (const [name, schema] of Object.entries(properties)) {
		/** @type {Options} */
		const option = {};

		option.type = json_schema_type_to_yargs(schema.type);
		option.demandOption = required.has(name);

		if (schema.description) {
			option.describe = schema.description;
		}

		if (schema.enum) {
			option.choices =
				/** @type {Array<string | number | true | undefined>} */ (
					schema.enum
				);
		}

		if (schema.default !== undefined) {
			option.default = schema.default;
		}

		options[name] = option;
	}

	return options;
}

/**
 * Coerces parsed yargs arguments back to their JSON Schema types.
 * Yargs parses everything from argv as strings by default for some types,
 * so we need to coerce values based on the schema.
 * @param {Record<string, unknown>} args
 * @param {InputSchema} input_schema
 * @returns {Record<string, unknown>}
 */
function coerce_args(args, input_schema) {
	/** @type {Record<string, unknown>} */
	const result = {};
	const properties = input_schema.properties ?? {};

	for (const [key, schema] of Object.entries(properties)) {
		const value = args[key];

		if (value === undefined) continue;

		if (schema?.type === 'integer' && typeof value === 'string') {
			result[key] = parseInt(value, 10);
		} else if (schema?.type === 'number' && typeof value === 'string') {
			result[key] = parseFloat(value);
		} else if (schema?.type === 'object' && typeof value === 'string') {
			try {
				result[key] = JSON.parse(value);
			} catch {
				result[key] = value;
			}
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class CliTransport {
	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {AsyncLocalStorage<string | undefined>}
	 */
	#session_id_storage = new AsyncLocalStorage();

	/**
	 * @type {number}
	 */
	#request_id = 0;

	/**
	 * @type {string}
	 */
	#session_id = crypto.randomUUID();

	/**
	 * @param {McpServer<any, TCustom>} server
	 */
	constructor(server) {
		this.#server = server;
	}

	/**
	 * Sends a JSON-RPC request to the server and returns the result.
	 * @param {string} method
	 * @param {Record<string, unknown>} [params]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<any>}
	 */
	async #request(method, params, ctx) {
		const request_id = this.#request_id++;

		const response = await this.#session_id_storage.run(
			this.#session_id,
			() =>
				this.#server.receive(
					{
						jsonrpc: '2.0',
						id: request_id,
						method,
						...(params ? { params } : {}),
					},
					{
						sessionId: this.#session_id,
						custom: ctx,
					},
				),
		);

		if (response?.error) {
			throw new Error(response.error.message ?? 'Unknown JSON-RPC error');
		}

		return response?.result;
	}

	/**
	 * Initialize the MCP session with the server.
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{ serverInfo?: { name?: string } }>}
	 */
	async #initialize(ctx) {
		return this.#request(
			'initialize',
			{
				protocolVersion: '2025-03-26',
				capabilities: {},
				clientInfo: {
					name: 'tmcp-cli',
					version: '0.0.1',
				},
			},
			ctx,
		);
	}

	/**
	 * Fetches the list of tools from the server.
	 * @param {TCustom} [ctx]
	 * @returns {Promise<Array<Tool>>}
	 */
	async #list_tools(ctx) {
		const result = await this.#request('tools/list', undefined, ctx);
		return result?.tools ?? [];
	}

	/**
	 * Calls a tool by name with arguments.
	 * @param {string} name
	 * @param {Record<string, unknown>} [args]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<any>}
	 */
	async #call_tool(name, args, ctx) {
		return this.#request(
			'tools/call',
			{
				name,
				arguments: args ?? {},
			},
			ctx,
		);
	}

	/**
	 * Starts the CLI. Initializes the MCP session, lists tools,
	 * builds yargs commands from the tool definitions, and parses argv.
	 * @param {TCustom} [ctx]
	 * @param {Array<string>} [argv]
	 */
	async run(ctx, argv) {
		const init_result = await this.#initialize(ctx);

		const tools = await this.#list_tools(ctx);

		const script_name = init_result?.serverInfo?.name ?? 'tmcp';

		const cli = Yargs(argv ?? process.argv.slice(2))
			.scriptName(script_name)
			.strict()
			.demandCommand(
				1,
				'You need to specify a tool command to run. Use --help to see available tools.',
			)
			.help();

		for (const tool of tools) {
			const options = json_schema_to_yargs_options(tool.inputSchema);

			cli.command(
				tool.name,
				tool.description ?? '',
				(yargs) => yargs.options(options),
				async (args) => {
					try {
						const coerced = coerce_args(
							/** @type {Record<string, unknown>} */ (args),
							tool.inputSchema,
						);

						const result = await this.#call_tool(
							tool.name,
							coerced,
							ctx,
						);

						process.stdout.write(
							JSON.stringify(result, null, 2) + '\n',
						);
					} catch (err) {
						process.stderr.write(
							`Error: ${err instanceof Error ? err.message : String(err)}\n`,
						);
						process.exitCode = 1;
					}
				},
			);
		}

		await cli.parseAsync();
	}
}
