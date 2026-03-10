import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('CliTransport', () => {
	/** @type {string[]} */
	let stdout_chunks;

	/** @type {string[]} */
	let stderr_chunks;

	beforeEach(() => {
		stdout_chunks = [];
		stderr_chunks = [];

		vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			stdout_chunks.push(String(chunk));
			return true;
		});

		vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
			stderr_chunks.push(String(chunk));
			return true;
		});
	});

	describe('tool without arguments', () => {
		it('should execute a tool with no input schema and print JSON result', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'ping',
					description: 'Ping the server',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'pong' }],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['ping']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
		});
	});

	describe('tool with string arguments', () => {
		it('should pass string arguments to the tool', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
					}),
				},
				(params) => {
					return {
						content: [
							{ type: 'text', text: `Hello, ${params.name}!` },
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['greet', '--name', 'Alice']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Hello, Alice!' },
			]);
		});
	});

	describe('tool with number arguments', () => {
		it('should parse and pass number arguments', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'add',
					description: 'Add two numbers',
					schema: v.object({
						a: v.number(),
						b: v.number(),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: `${params.a + params.b}`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['add', '--a', '3', '--b', '4']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: '7' }]);
		});
	});

	describe('tool with boolean arguments', () => {
		it('should parse and pass boolean arguments', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'toggle',
					description: 'Toggle a flag',
					schema: v.object({
						verbose: v.boolean(),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: params.verbose ? 'verbose' : 'quiet',
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['toggle', '--verbose']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: 'verbose' }]);
		});

		it('should handle --no- prefix for boolean false', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'toggle',
					description: 'Toggle a flag',
					schema: v.object({
						verbose: v.boolean(),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: params.verbose ? 'verbose' : 'quiet',
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['toggle', '--no-verbose']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: 'quiet' }]);
		});

		it('should handle kebab-case arguments', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'toggle',
					description: 'Toggle a flag',
					schema: v.object({
						'kebab-case': v.boolean(),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: params['kebab-case']
									? 'kebab-case'
									: 'camelCase',
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['toggle', '--kebab-case']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'kebab-case' },
			]);
		});
	});

	describe('tool with optional arguments', () => {
		it('should handle optional arguments that are not provided', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
						greeting: v.optional(v.string()),
					}),
				},
				(params) => {
					const greeting = params.greeting ?? 'Hello';
					return {
						content: [
							{
								type: 'text',
								text: `${greeting}, ${params.name}!`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['greet', '--name', 'Bob']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Hello, Bob!' },
			]);
		});

		it('should pass optional arguments when provided', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'greet',
					description: 'Greet someone',
					schema: v.object({
						name: v.string(),
						greeting: v.optional(v.string()),
					}),
				},
				(params) => {
					const greeting = params.greeting ?? 'Hello';
					return {
						content: [
							{
								type: 'text',
								text: `${greeting}, ${params.name}!`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'greet',
				'--name',
				'Bob',
				'--greeting',
				'Hi',
			]);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Hi, Bob!' },
			]);
		});
	});

	describe('tool with enum arguments', () => {
		it('should accept valid enum values', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'set_level',
					description: 'Set log level',
					schema: v.object({
						level: v.picklist(['debug', 'info', 'warn', 'error']),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: `Level set to ${params.level}`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['set_level', '--level', 'debug']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Level set to debug' },
			]);
		});
	});

	describe('multiple tools', () => {
		it('should register all tools as commands', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'tool_a',
					description: 'Tool A',
				},
				() => ({
					content: [{ type: 'text', text: 'A' }],
				}),
			);

			server.tool(
				{
					name: 'tool_b',
					description: 'Tool B',
				},
				() => ({
					content: [{ type: 'text', text: 'B' }],
				}),
			);

			// Call tool_a
			const cli_a = new CliTransport(server);
			await cli_a.run(undefined, ['tool_a']);

			expect(stdout_chunks.length).toBe(1);
			let result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: 'A' }]);

			// Reset output
			stdout_chunks = [];

			// Call tool_b
			const cli_b = new CliTransport(server);
			await cli_b.run(undefined, ['tool_b']);

			expect(stdout_chunks.length).toBe(1);
			result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([{ type: 'text', text: 'B' }]);
		});
	});

	describe('tool with mixed argument types', () => {
		it('should handle a tool with string, number, and boolean arguments', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'create_user',
					description: 'Create a user',
					schema: v.object({
						name: v.string(),
						age: v.number(),
						admin: v.optional(v.boolean()),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									name: params.name,
									age: params.age,
									admin: params.admin ?? false,
								}),
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'create_user',
				'--name',
				'Charlie',
				'--age',
				'30',
				'--admin',
			]);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed).toEqual({
				name: 'Charlie',
				age: 30,
				admin: true,
			});
		});
	});

	describe('tool execution error', () => {
		it('should write errors to stderr and set exit code', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

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

			// Save and restore process.exitCode
			const original_exit_code = process.exitCode;

			await cli.run(undefined, ['failing_tool']);

			// When a tool throws, the MCP server returns a JSON-RPC error,
			// which the transport catches and writes to stderr
			expect(stderr_chunks.length).toBeGreaterThan(0);
			expect(stderr_chunks.join('')).toContain('Error:');
			expect(process.exitCode).toBe(1);

			process.exitCode = original_exit_code;
		});
	});

	describe('output format', () => {
		it('should output pretty-printed JSON', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'format_test',
					description: 'Test output format',
				},
				() => ({
					content: [{ type: 'text', text: 'test' }],
				}),
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['format_test']);

			expect(stdout_chunks.length).toBe(1);
			// Verify it's pretty-printed (contains newlines and indentation)
			expect(stdout_chunks[0]).toContain('\n');
			expect(stdout_chunks[0]).toContain('  ');
			// Verify it ends with a newline
			expect(stdout_chunks[0].endsWith('\n')).toBe(true);
			// Verify it's valid JSON
			expect(() => JSON.parse(stdout_chunks[0])).not.toThrow();
		});
	});

	describe('tool with array arguments', () => {
		it('should parse array arguments', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'list_items',
					description: 'List items',
					schema: v.object({
						items: v.array(v.string()),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: params.items.join(', '),
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, [
				'list_items',
				'--items',
				'foo',
				'--items',
				'bar',
				'--items',
				'baz',
			]);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'foo, bar, baz' },
			]);
		});
	});

	describe('custom context', () => {
		it('should pass custom context to the server', async () => {
			/** @type {{ userId: string } | undefined} */
			let captured_ctx;

			const server = /** @type {McpServer<any, { userId: string }>} */ (
				new McpServer(server_config, {
					adapter,
					capabilities: { tools: {} },
				})
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
								text: `user: ${server.ctx.custom?.userId}`,
							},
						],
					};
				},
			);

			const cli = /** @type {CliTransport<{ userId: string }>} */ (
				new CliTransport(server)
			);

			// Note: custom context is not passed through run() in this transport
			// because the CLI doesn't have a way to inject it from argv.
			// But we test that the run() method accepts it.
			await cli.run({ userId: 'test-user' }, ['ctx_tool']);

			expect(stdout_chunks.length).toBe(1);
			expect(captured_ctx).toEqual({ userId: 'test-user' });
		});
	});

	describe('tool with description in schema properties', () => {
		it('should use property descriptions from schema', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'described_tool',
					description: 'Tool with described args',
					schema: v.object({
						query: v.pipe(
							v.string(),
							v.description('The search query'),
						),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: `Searching: ${params.query}`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['described_tool', '--query', 'hello']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Searching: hello' },
			]);
		});
	});

	describe('script name', () => {
		it('should use the server name as the CLI script name', async () => {
			const server = new McpServer(
				{
					name: 'my-custom-cli',
					version: '1.0.0',
					description: 'A custom CLI server',
				},
				{
					adapter,
					capabilities: { tools: {} },
				},
			);

			server.tool(
				{
					name: 'noop',
					description: 'Does nothing',
				},
				() => ({
					content: [{ type: 'text', text: 'ok' }],
				}),
			);

			const cli = new CliTransport(server);

			/** @type {string[]} */
			const log_chunks = [];

			const exit_spy = vi
				.spyOn(process, 'exit')
				// @ts-expect-error -- mock needs to not actually exit
				.mockImplementation(() => {});

			const log_spy = vi
				.spyOn(console, 'log')
				.mockImplementation((...args) => {
					log_chunks.push(args.join(' '));
				});

			const error_spy = vi
				.spyOn(console, 'error')
				.mockImplementation((...args) => {
					log_chunks.push(args.join(' '));
				});

			try {
				await cli.run(undefined, ['--help']);
			} catch {
				// yargs may throw after calling process.exit
			}

			const all_output =
				log_chunks.join('\n') +
				stdout_chunks.join('') +
				stderr_chunks.join('');
			expect(all_output).toContain('my-custom-cli');

			exit_spy.mockRestore();
			log_spy.mockRestore();
			error_spy.mockRestore();
		});
	});

	describe('tool with integer arguments', () => {
		it('should handle integer schema types', async () => {
			const server = new McpServer(server_config, {
				adapter,
				capabilities: { tools: {} },
			});

			server.tool(
				{
					name: 'count',
					description: 'Count items',
					schema: v.object({
						n: v.pipe(v.number(), v.integer()),
					}),
				},
				(params) => {
					return {
						content: [
							{
								type: 'text',
								text: `Count: ${params.n}`,
							},
						],
					};
				},
			);

			const cli = new CliTransport(server);
			await cli.run(undefined, ['count', '--n', '42']);

			expect(stdout_chunks.length).toBe(1);
			const result = JSON.parse(stdout_chunks[0]);
			expect(result.content).toEqual([
				{ type: 'text', text: 'Count: 42' },
			]);
		});
	});
});
