/**
 * @import { McpServer } from "tmcp";
 * @import { ListToolsResult, Tool } from "./internal.js";
 */
import process from 'node:process';
import { AsyncLocalStorage } from 'node:async_hooks';
import sade from 'sade';

/**
 * @typedef {'full' | 'structured' | 'content' | 'text'} OutputMode
 */

/**
 * @typedef {{ output?: OutputMode; fields?: string }} ToolOptions
 */

const CLIENT_INFO = {
	name: 'tmcp-cli',
	version: '0.0.1',
};

const RESERVED_COMMANDS = new Set(['call', 'schema', 'tools']);
const UNSAFE_ALIAS_NAME = /[<>[\]]/;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function is_record(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
function parse_input_json(value, source) {
	let parsed;

	try {
		parsed = JSON.parse(String(value));
	} catch {
		throw new Error(`Invalid JSON in ${source}`);
	}

	if (!is_record(parsed)) {
		throw new Error(`Input from ${source} must be a JSON object`);
	}

	return parsed;
}

/**
 * @param {Array<unknown>} args
 * @returns {{ positionals: Array<unknown>; options: Record<string, unknown> }}
 */
function extract_command_args(args) {
	const last_arg = args.at(-1);

	if (is_record(last_arg)) {
		return {
			positionals: args.slice(0, -1),
			options: last_arg,
		};
	}

	return {
		positionals: args,
		options: {},
	};
}

/**
 * @param {Record<string, unknown>} options
 * @returns {ToolOptions}
 */
function normalize_tool_options(options) {
	return {
		output:
			typeof options.output === 'string'
				? /** @type {OutputMode} */ (options.output)
				: 'full',
		fields: typeof options.fields === 'string' ? options.fields : undefined,
	};
}

/**
 * @param {string | undefined} input
 * @returns {Promise<Record<string, unknown>>}
 */
async function resolve_tool_input(input) {
	if (typeof input === 'string') {
		return parse_input_json(input, 'positional input');
	}

	return {};
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function format_json(value) {
	return `${JSON.stringify(value === undefined ? null : value, null, 2)}\n`;
}

/**
 * @param {string | undefined} fields
 * @returns {Array<string>}
 */
function parse_fields(fields) {
	if (!fields) return [];

	const paths = fields
		.split(',')
		.map((field) => field.trim())
		.filter(Boolean);

	if (paths.length === 0) {
		throw new Error('`--fields` must include at least one dot path');
	}

	return paths;
}

/**
 * @param {string} path
 * @returns {Array<string>}
 */
function split_path(path) {
	return path.split('.').filter(Boolean);
}

/**
 * @param {unknown} value
 * @param {Array<string>} path
 * @returns {unknown}
 */
function get_path_value(value, path) {
	let current = value;

	for (const segment of path) {
		if (Array.isArray(current)) {
			const index = Number(segment);
			if (
				!Number.isInteger(index) ||
				index < 0 ||
				index >= current.length
			) {
				throw new Error(`Unknown field path: ${path.join('.')}`);
			}
			current = current[index];
			continue;
		}

		if (!is_record(current) || !(segment in current)) {
			throw new Error(`Unknown field path: ${path.join('.')}`);
		}

		current = current[segment];
	}

	return current;
}

/**
 * @param {Record<string, unknown> | Array<unknown>} target
 * @param {Array<string>} path
 * @param {unknown} value
 */
function set_path_value(target, path, value) {
	let current = target;

	for (let index = 0; index < path.length; index += 1) {
		const segment = path[index];
		const is_last = index === path.length - 1;
		const next_segment = path[index + 1];
		const next_value =
			next_segment !== undefined && Number.isInteger(Number(next_segment))
				? []
				: {};

		if (Array.isArray(current)) {
			const array_index = Number(segment);
			if (!Number.isInteger(array_index) || array_index < 0) {
				throw new Error(
					`Invalid array index in field path: ${path.join('.')}`,
				);
			}

			if (is_last) {
				current[array_index] = value;
				return;
			}

			current[array_index] ??= next_value;
			current = /** @type {Record<string, unknown> | Array<unknown>} */ (
				current[array_index]
			);
			continue;
		}

		if (is_last) {
			current[segment] = value;
			return;
		}

		current[segment] ??= next_value;
		current = /** @type {Record<string, unknown> | Array<unknown>} */ (
			current[segment]
		);
	}
}

/**
 * @param {unknown} value
 * @param {Array<string>} paths
 * @returns {unknown}
 */
function filter_fields(value, paths) {
	if (paths.length === 0) return value;

	if (!is_record(value) && !Array.isArray(value)) {
		throw new Error(
			'`--fields` can only be used with object or array output',
		);
	}

	const result = Array.isArray(value) ? [] : {};

	for (const path of paths) {
		const segments = split_path(path);
		if (segments.length === 0) {
			throw new Error('`--fields` only supports dot-separated paths');
		}
		set_path_value(result, segments, get_path_value(value, segments));
	}

	return result;
}

/**
 * @param {Record<string, unknown>} result
 * @param {OutputMode} output
 * @returns {unknown}
 */
function select_output(result, output) {
	if (output === 'full') return result;
	if (output === 'structured') {
		return result.structuredContent ?? null;
	}
	if (output === 'content') {
		return result.content ?? [];
	}
	if (output === 'text') {
		const content = result.content;

		if (!Array.isArray(content)) {
			throw new Error(
				'`--output text` requires a tool result with content',
			);
		}

		const lines = content.map((item) => {
			if (
				!is_record(item) ||
				item.type !== 'text' ||
				typeof item.text !== 'string'
			) {
				throw new Error(
					'`--output text` only supports text content blocks',
				);
			}

			return item.text;
		});

		return `${lines.join('\n')}\n`;
	}

	throw new Error(
		`Invalid output mode: ${output}. Expected one of full, structured, content, text`,
	);
}

/**
 * @param {Record<string, unknown>} result
 * @param {ToolOptions} options
 * @returns {string}
 */
function format_tool_result(result, options) {
	const selected = select_output(result, options.output ?? 'full');

	if (typeof selected === 'string') {
		if (options.fields) {
			throw new Error('`--fields` cannot be used with `--output text`');
		}
		return selected;
	}

	return format_json(filter_fields(selected, parse_fields(options.fields)));
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
	 * @param {string} method
	 * @param {Record<string, unknown>} [params]
	 * @param {TCustom} [ctx]
	 */
	async #notify(method, params, ctx) {
		await this.#session_id_storage.run(this.#session_id, () =>
			this.#server.receive(
				{
					jsonrpc: '2.0',
					method,
					...(params ? { params } : {}),
				},
				{
					sessionId: this.#session_id,
					custom: ctx,
				},
			),
		);
	}

	/**
	 * @param {TCustom} [ctx]
	 * @returns {Promise<{ serverInfo?: { name?: string } }>}
	 */
	async #initialize(ctx) {
		const result = await this.#request(
			'initialize',
			{
				protocolVersion: '2025-03-26',
				capabilities: {},
				clientInfo: CLIENT_INFO,
			},
			ctx,
		);

		await this.#notify('notifications/initialized', undefined, ctx);

		return result;
	}

	/**
	 * @param {TCustom} [ctx]
	 * @returns {Promise<Array<Tool>>}
	 */
	async #list_tools(ctx) {
		/** @type {Array<Tool>} */
		const tools = [];
		let cursor = undefined;

		do {
			const result = /** @type {ListToolsResult | undefined} */ (
				await this.#request(
					'tools/list',
					cursor ? { cursor } : undefined,
					ctx,
				)
			);

			tools.push(...(result?.tools ?? []));
			cursor = result?.nextCursor;
		} while (cursor);

		return tools;
	}

	/**
	 * @param {string} name
	 * @param {Record<string, unknown>} [args]
	 * @param {TCustom} [ctx]
	 * @returns {Promise<Record<string, unknown>>}
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
	 * @param {Map<string, Tool>} tool_map
	 * @param {string} name
	 * @returns {Tool}
	 */
	#get_tool(tool_map, name) {
		const tool = tool_map.get(name);
		if (!tool) {
			throw new Error(`Unknown tool: ${name}`);
		}
		return tool;
	}

	/**
	 * @param {Map<string, Tool>} tool_map
	 * @param {string} name
	 * @param {string | undefined} input
	 * @param {ToolOptions} options
	 * @param {TCustom} [ctx]
	 */
	async #run_tool(tool_map, name, input, options, ctx) {
		const tool = this.#get_tool(tool_map, name);
		const args = await resolve_tool_input(input);
		const result = await this.#call_tool(tool.name, args, ctx);

		process.stdout.write(format_tool_result(result, options));
	}

	/**
	 * @param {TCustom} [ctx]
	 * @param {Array<string>} [argv]
	 */
	async run(ctx, argv) {
		try {
			const init_result = await this.#initialize(ctx);
			const tools = await this.#list_tools(ctx);
			const script_name = init_result?.serverInfo?.name ?? 'tmcp';
			const prog = sade(script_name);

			/** @type {Map<string, Tool>} */
			const tool_map = new Map();

			for (const tool of tools) {
				tool_map.set(tool.name, tool);
			}

			prog.command('tools', 'List available tools').action(() => {});
			prog.command('schema <tool>', 'Print a tool schema').action(
				() => {},
			);

			prog.command('call <tool> [input]', 'Call a tool with JSON input')
				.option(
					'--output',
					'Select full, structured, content, or text output',
					'full',
				)
				.option(
					'--fields',
					'Select comma-separated dot paths from the chosen output',
				)
				.action(() => {});

			for (const tool of tools) {
				if (RESERVED_COMMANDS.has(tool.name)) {
					continue;
				}

				if (UNSAFE_ALIAS_NAME.test(tool.name)) {
					process.stderr.write(
						`Warning: skipping bare alias for tool "${tool.name}" because its name contains CLI syntax characters. Use \`call ${tool.name}\` instead.\n`,
					);
					continue;
				}

				prog.command(`${tool.name} [input]`, tool.description ?? '')
					.option(
						'--output',
						'Select full, structured, content, or text output',
						'full',
					)
					.option(
						'--fields',
						'Select comma-separated dot paths from the chosen output',
					)
					.action(() => {});
			}

			const args = argv ? ['node', script_name, ...argv] : process.argv;
			const parsed = prog.parse(args, { lazy: true });

			if (!parsed) return;

			const { name, args: handler_args } = parsed;
			const { positionals, options } = extract_command_args(handler_args);

			if (name === 'tools') {
				process.stdout.write(format_json(tools));
				return;
			}

			if (name === 'schema') {
				const tool_name = /** @type {string | undefined} */ (
					positionals[0]
				);
				if (!tool_name) {
					throw new Error('Missing tool name for `schema`');
				}

				process.stdout.write(
					format_json(this.#get_tool(tool_map, tool_name)),
				);
				return;
			}

			if (name === 'call') {
				const tool_name = /** @type {string | undefined} */ (
					positionals[0]
				);
				const input = /** @type {string | undefined} */ (
					positionals[1]
				);

				if (!tool_name) {
					throw new Error('Missing tool name for `call`');
				}

				await this.#run_tool(
					tool_map,
					tool_name,
					input,
					normalize_tool_options(options),
					ctx,
				);
				return;
			}

			if (tool_map.has(name)) {
				const input = /** @type {string | undefined} */ (
					positionals[0]
				);
				await this.#run_tool(
					tool_map,
					name,
					input,
					normalize_tool_options(options),
					ctx,
				);
			}
		} catch (err) {
			process.stderr.write(
				`Error: ${err instanceof Error ? err.message : String(err)}\n`,
			);
			process.exitCode = 1;
		}
	}
}
