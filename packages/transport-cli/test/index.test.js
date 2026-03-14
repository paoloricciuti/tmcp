import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import * as v from 'valibot';
import { CliTransport } from '../src/index.js';

const adapter = new ValibotJsonSchemaAdapter();

const server_config = {
	name: 'test-cli-server',
	version: '1.0.0',
	description: 'A test CLI server',
};

/**
 * @param {Partial<ConstructorParameters<typeof McpServer>[0]>} [config]
 * @param {Partial<ConstructorParameters<typeof McpServer>[1]>} [options]
 */
function create_server(config = {}, options = {}) {
	return new McpServer(
		{
			...server_config,
			...config,
		},
		{
			adapter,
			capabilities: { tools: {} },
			...options,
		},
	);
}

describe('CliTransport', () => {
	/** @type {string[]} */
	let stdout_chunks;

	/** @type {string[]} */
	let stderr_chunks;

	/** @type {string | number | null | undefined} */
	let original_exit_code;

	beforeEach(() => {
		stdout_chunks = [];
		stderr_chunks = [];
		original_exit_code = process.exitCode;
		process.exitCode = undefined;

		vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			stdout_chunks.push(String(chunk));
			return true;
		});

		vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
			stderr_chunks.push(String(chunk));
			return true;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		process.exitCode = original_exit_code;
	});

	function stdout_text() {
		return stdout_chunks.join('');
	}

	function stderr_text() {
		return stderr_chunks.join('');
	}

	function stdout_json() {
		return JSON.parse(stdout_text());
	}

	describe('tools command', () => {
		it('lists tools across paginated responses and sends initialized first', async () => {
			const server = create_server(undefined, {
				pagination: {
					tools: {
						size: 1,
					},
				},
			});

			server.tool({ name: 'first', description: 'first tool' }, () => ({
				content: [{ type: 'text', text: 'one' }],
			}));
			server.tool({ name: 'second', description: 'second tool' }, () => ({
				content: [{ type: 'text', text: 'two' }],
			}));
			server.tool({ name: 'third', description: 'third tool' }, () => ({
				content: [{ type: 'text', text: 'three' }],
			}));

			const receive_spy = vi.spyOn(server, 'receive');
			const cli = new CliTransport(server);

			await cli.run(undefined, ['tools']);

			const listed_tools = /** @type {Array<{ name: string }>} */ (
				stdout_json()
			);
			expect(listed_tools.map((tool) => tool.name)).toEqual([
				'first',
				'second',
				'third',
			]);

			const methods = receive_spy.mock.calls.map(
				([request]) =>
					/** @type {{ method?: string }} */ (request).method,
			);
			expect(methods[0]).toBe('initialize');
			expect(methods[1]).toBe('notifications/initialized');
			expect(methods.slice(2)).toEqual([
				'tools/list',
				'tools/list',
				'tools/list',
			]);
		});
	});

	describe('schema command', () => {
		it('prints tool metadata, input schema, and output schema', async () => {
			const server = create_server();

			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
					outputSchema: v.object({
						message: v.string(),
					}),
				},
				(input) => ({
					content: [{ type: 'text', text: `Hello, ${input.name}!` }],
					structuredContent: { message: `Hello, ${input.name}!` },
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['schema', 'greet']);

			const schema = stdout_json();
			expect(schema.name).toBe('greet');
			expect(schema.inputSchema.type).toBe('object');
			expect(schema.outputSchema.type).toBe('object');
			expect(schema.outputSchema.properties.message.type).toBe('string');
		});

		it('errors on unknown tools', async () => {
			const server = create_server();
			const cli = new CliTransport(server);

			await cli.run(undefined, ['schema', 'missing']);

			expect(stderr_text()).toContain('Unknown tool: missing');
			expect(process.exitCode).toBe(1);
		});
	});

	describe('tool invocation', () => {
		it('prints initialization failures through stderr instead of throwing', async () => {
			const server = create_server();
			const receive_spy = vi.spyOn(server, 'receive');

			receive_spy.mockResolvedValueOnce(
				/** @type {any} */ ({
					jsonrpc: '2.0',
					id: 0,
					error: {
						code: -32600,
						message: 'Initialization failed',
					},
				}),
			);

			const cli = new CliTransport(server);
			await expect(
				cli.run(undefined, ['tools']),
			).resolves.toBeUndefined();

			expect(stderr_text()).toContain('Error: Initialization failed');
			expect(process.exitCode).toBe(1);
		});

		it('calls tools through the static call command', async () => {
			const server = create_server();

			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
				},
				(input) => ({
					content: [{ type: 'text', text: `Hello, ${input.name}!` }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['call', 'greet', '{"name":"Alice"}']);

			expect(stdout_json().content).toEqual([
				{ type: 'text', text: 'Hello, Alice!' },
			]);
		});

		it('calls tools through the bare tool alias', async () => {
			const server = create_server();

			server.tool(
				{
					name: 'sum',
					description: 'Add two numbers',
					schema: v.object({
						a: v.number(),
						b: v.number(),
					}),
				},
				(input) =>
					/** @type {any} */ ({
						content: [
							{ type: 'text', text: `${input.a + input.b}` },
						],
						structuredContent: { total: input.a + input.b },
					}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['sum', '{"a":3,"b":4}']);

			expect(stdout_json().structuredContent).toEqual({ total: 7 });
		});

		it('skips unsafe aliases without breaking other commands', async () => {
			const server = create_server();

			server.tool(
				{ name: 'safe_tool', description: 'Safe tool' },
				() => ({
					content: [{ type: 'text', text: 'safe' }],
				}),
			);

			server.tool(
				{ name: 'get<resource>', description: 'Unsafe alias tool' },
				() => ({
					content: [{ type: 'text', text: 'unsafe' }],
				}),
			);

			const safe_cli = new CliTransport(server);
			await safe_cli.run(undefined, ['safe_tool']);
			expect(stdout_json().content[0].text).toBe('safe');
			expect(stderr_text()).toContain(
				'Warning: skipping bare alias for tool "get<resource>"',
			);

			stdout_chunks = [];
			stderr_chunks = [];

			const unsafe_cli = new CliTransport(server);
			await unsafe_cli.run(undefined, ['call', 'get<resource>']);
			expect(stdout_json().content[0].text).toBe('unsafe');
			expect(stderr_text()).toContain(
				'Use `call get<resource>` instead.',
			);
		});

		it('warns for reserved command names and still allows calling the tool explicitly', async () => {
			const server = create_server();

			server.tool(
				{ name: 'tools', description: 'Reserved-name tool' },
				() => ({
					content: [{ type: 'text', text: 'reserved' }],
				}),
			);

			const list_cli = new CliTransport(server);
			await list_cli.run(undefined, ['tools']);

			expect(stderr_text()).toContain(
				'Warning: skipping bare alias for tool "tools" because its name conflicts with a built-in command.',
			);
			const listed_tools = /** @type {Array<{ name: string }>} */ (
				stdout_json()
			);
			expect(listed_tools.some((tool) => tool.name === 'tools')).toBe(
				true,
			);

			stdout_chunks = [];
			stderr_chunks = [];

			const call_cli = new CliTransport(server);
			await call_cli.run(undefined, ['call', 'tools']);

			expect(stdout_json().content[0].text).toBe('reserved');
			expect(stderr_text()).toContain('Use `call tools` instead.');
		});

		it('passes custom context to the server', async () => {
			/** @type {{ userId: string } | undefined} */
			let captured_ctx;

			const server = /** @type {McpServer<any, { userId: string }>} */ (
				/** @type {unknown} */ (create_server())
			);

			server.tool(
				{
					name: 'ctx_tool',
					description: 'Tool that reads context',
				},
				() => {
					captured_ctx = server.ctx.custom;
					return {
						content: [
							{
								type: 'text',
								text: server.ctx.custom?.userId ?? '',
							},
						],
					};
				},
			);

			const cli = /** @type {CliTransport<{ userId: string }>} */ (
				new CliTransport(server)
			);

			await cli.run({ userId: 'test-user' }, ['ctx_tool']);

			expect(captured_ctx).toEqual({ userId: 'test-user' });
		});

		it('errors on invalid positional JSON', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
				},
				() => ({
					content: [{ type: 'text', text: 'ok' }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['greet', '{bad json']);

			expect(stderr_text()).toContain('Invalid JSON in positional input');
			expect(process.exitCode).toBe(1);
		});

		it('errors when the input JSON is not an object', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
				},
				() => ({
					content: [{ type: 'text', text: 'ok' }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['greet', '[]']);

			expect(stderr_text()).toContain(
				'Input from positional input must be a JSON object',
			);
			expect(process.exitCode).toBe(1);
		});

		it('writes tool execution errors to stderr', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'failing_tool',
					description: 'A tool that throws',
				},
				() => {
					throw new Error('Something went wrong');
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['failing_tool']);

			expect(stderr_text()).toContain('Error:');
			expect(process.exitCode).toBe(1);
		});

		it('writes tool-level isError responses to stderr', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
				},
				() => ({
					content: [{ type: 'text', text: 'ok' }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['greet', '{}']);

			expect(stderr_text()).toContain('Invalid arguments');
			expect(process.exitCode).toBe(1);
			expect(stdout_text()).toBe('');
		});
	});

	describe('output controls', () => {
		it('supports structured output', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'get_user',
					description: 'Get a user',
					schema: v.object({
						id: v.string(),
					}),
				},
				(input) =>
					/** @type {any} */ ({
						content: [{ type: 'text', text: `User ${input.id}` }],
						structuredContent: {
							user: {
								id: input.id,
								name: 'Alice',
							},
						},
					}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'get_user',
				'{"id":"1"}',
				'--output',
				'structured',
			]);

			expect(stdout_json()).toEqual({
				user: { id: '1', name: 'Alice' },
			});
		});

		it('supports text output', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'get_lines',
					description: 'Get text lines',
				},
				() => ({
					content: [
						{ type: 'text', text: 'alpha' },
						{ type: 'text', text: 'beta' },
					],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['get_lines', '--output', 'text']);

			expect(stdout_text()).toBe('alpha\nbeta\n');
		});

		it('supports field filtering on the selected output', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'get_user',
					description: 'Get a user',
					schema: v.object({
						id: v.string(),
					}),
				},
				(input) =>
					/** @type {any} */ ({
						content: [{ type: 'text', text: `User ${input.id}` }],
						structuredContent: {
							user: {
								id: input.id,
								name: 'Alice',
								email: 'alice@example.com',
							},
						},
					}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'get_user',
				'{"id":"1"}',
				'--output',
				'structured',
				'--fields',
				'user.name',
			]);

			expect(stdout_json()).toEqual({
				user: { name: 'Alice' },
			});
		});

		it('does not mutate the original result for overlapping field paths', async () => {
			const server = create_server();
			const structured_content = {
				user: {
					name: 'Alice',
					email: 'alice@example.com',
				},
			};

			server.tool(
				{
					name: 'get_user',
					description: 'Get a user',
				},
				() =>
					/** @type {any} */ ({
						structuredContent: structured_content,
					}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'get_user',
				'--output',
				'structured',
				'--fields',
				'user,user.name',
			]);

			expect(stdout_json()).toEqual({
				user: {
					name: 'Alice',
					email: 'alice@example.com',
				},
			});
			expect(structured_content).toEqual({
				user: {
					name: 'Alice',
					email: 'alice@example.com',
				},
			});
		});

		it('errors when text output contains non-text blocks', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'mixed_content',
					description: 'Return mixed content',
				},
				() => ({
					content: [
						{ type: 'text', text: 'alpha' },
						{ type: 'image', data: 'YWJj', mimeType: 'image/png' },
					],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['mixed_content', '--output', 'text']);

			expect(stderr_text()).toContain(
				'`--output text` only supports text content blocks',
			);
			expect(process.exitCode).toBe(1);
		});

		it('errors when fields are requested for text output', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'get_lines',
					description: 'Get text lines',
				},
				() => ({
					content: [{ type: 'text', text: 'alpha' }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'get_lines',
				'--output',
				'text',
				'--fields',
				'content.0.text',
			]);

			expect(stderr_text()).toContain(
				'`--fields` cannot be used with `--output text`',
			);
			expect(process.exitCode).toBe(1);
		});

		it('errors on unknown field paths', async () => {
			const server = create_server();
			server.tool(
				{
					name: 'get_user',
					description: 'Get a user',
				},
				() =>
					/** @type {any} */ ({
						structuredContent: {
							user: { name: 'Alice' },
						},
					}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'get_user',
				'--output',
				'structured',
				'--fields',
				'user.email',
			]);

			expect(stderr_text()).toContain('Unknown field path: user.email');
			expect(process.exitCode).toBe(1);
		});
	});

	describe('help output', () => {
		it('uses the server name in help output', async () => {
			const server = create_server({ name: 'my-custom-cli' });
			server.tool({ name: 'noop', description: 'Does nothing' }, () => ({
				content: [{ type: 'text', text: 'ok' }],
			}));

			const cli = new CliTransport(server);
			const exit_spy = vi
				.spyOn(process, 'exit')
				// @ts-expect-error test helper
				.mockImplementation(() => {});
			const log_spy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			try {
				await cli.run(undefined, ['--help']);
			} catch {
				// sade may throw after trying to exit.
			}

			expect(
				stdout_text() +
					stderr_text() +
					log_spy.mock.calls.flat().join(' '),
			).toContain('my-custom-cli');

			exit_spy.mockRestore();
			log_spy.mockRestore();
		});
	});
});
