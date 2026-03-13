/**
 * @import { McpServer } from "tmcp";
 * @import { InputSchema, Tool } from "./internal.js";
 */
import process from 'node:process';
import { AsyncLocalStorage } from 'node:async_hooks';
import sade from 'sade';

/**
 * @typedef {number | string | boolean | null} SadeValue
 */

/**
 * Builds sade option flags from a JSON Schema property name and schema.
 * @param {string} name
 * @param {{ type?: string; description?: string; enum?: Array<unknown>; default?: unknown }} schema
 * @param {boolean} required
 * @returns {{ flags: string; description: string; default_value: SadeValue | undefined }}
 */
function build_option(name, schema, required) {
	const flags = `--${name}`;

	let description = schema.description ?? '';

	if (schema.enum) {
		const choices = schema.enum.join(', ');
		description += description
			? ` (choices: ${choices})`
			: `choices: ${choices}`;
	}

	if (required) {
		description += description ? ' (required)' : 'required';
	}

	return {
		flags,
		description,
		default_value: /** @type {SadeValue | undefined} */ (schema.default),
	};
}

/**
 * Coerces parsed arguments back to their JSON Schema types.
 * sade parses everything from argv as strings by default,
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
		} else if (schema?.type === 'boolean' && typeof value === 'string') {
			result[key] = value === 'true';
		} else if (schema?.type === 'object' && typeof value === 'string') {
			try {
				result[key] = JSON.parse(value);
			} catch {
				result[key] = value;
			}
		} else if (schema?.type === 'array' && typeof value === 'string') {
			try {
				result[key] = JSON.parse(value);
			} catch {
				result[key] = value.split(',');
			}
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Validates that all required options are present.
 * @param {Record<string, unknown>} opts
 * @param {InputSchema} input_schema
 * @returns {string | undefined} error message if validation fails
 */
function validate_required(opts, input_schema) {
	const required = input_schema.required ?? [];
	const missing = required.filter((name) => opts[name] === undefined);

	if (missing.length > 0) {
		return `Missing required option(s): ${missing.map((n) => `--${n}`).join(', ')}`;
	}
}

/**
 * Validates enum constraints on options.
 * @param {Record<string, unknown>} opts
 * @param {InputSchema} input_schema
 * @returns {string | undefined} error message if validation fails
 */
function validate_enums(opts, input_schema) {
	const properties = input_schema.properties ?? {};

	for (const [name, schema] of Object.entries(properties)) {
		if (schema.enum && opts[name] !== undefined) {
			if (!schema.enum.includes(opts[name])) {
				return `Invalid value for --${name}: "${opts[name]}". Must be one of: ${schema.enum.join(', ')}`;
			}
		}
	}
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
	 * builds sade commands from the tool definitions, and parses argv.
	 * @param {TCustom} [ctx]
	 * @param {Array<string>} [argv]
	 */
	async run(ctx, argv) {
		const init_result = await this.#initialize(ctx);

		const tools = await this.#list_tools(ctx);

		const script_name = init_result?.serverInfo?.name ?? 'tmcp';

		const prog = sade(script_name);

		/** @type {Map<string, Tool>} */
		const tool_map = new Map();

		for (const tool of tools) {
			const properties = tool.inputSchema.properties ?? {};
			const required = new Set(tool.inputSchema.required ?? []);

			tool_map.set(tool.name, tool);

			const cmd = prog.command(tool.name, tool.description ?? '');

			for (const [name, schema] of Object.entries(properties)) {
				const opt = build_option(name, schema, required.has(name));
				cmd.option(opt.flags, opt.description, opt.default_value);
			}

			// Use a no-op action so sade registers the command.
			// We'll use lazy parsing to handle async execution ourselves.
			cmd.action(() => {});
		}

		// sade expects full process.argv (it slices internally),
		// but our public API accepts pre-sliced argv for convenience.
		// Prepend dummy entries when custom argv is provided.
		const args = argv ? ['node', script_name, ...argv] : process.argv;

		const parsed = prog.parse(args, { lazy: true });

		// sade returns void when it handles --help/--version or errors
		if (!parsed) return;

		const { name, args: handler_args } = parsed;
		const tool = tool_map.get(name);

		if (!tool) return;

		// sade passes positional args followed by opts object.
		// Our commands have no positional args, so the last (and only) arg is opts.
		const opts = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (handler_args[handler_args.length - 1] ?? {})
		);

		try {
			const required_error = validate_required(opts, tool.inputSchema);
			if (required_error) {
				process.stderr.write(`Error: ${required_error}\n`);
				process.exitCode = 1;
				return;
			}

			const enum_error = validate_enums(opts, tool.inputSchema);
			if (enum_error) {
				process.stderr.write(`Error: ${enum_error}\n`);
				process.exitCode = 1;
				return;
			}

			const coerced = coerce_args(opts, tool.inputSchema);

			const result = await this.#call_tool(tool.name, coerced, ctx);

			process.stdout.write(JSON.stringify(result, null, 2) + '\n');
		} catch (err) {
			process.stderr.write(
				`Error: ${err instanceof Error ? err.message : String(err)}\n`,
			);
			process.exitCode = 1;
		}
	}
}
