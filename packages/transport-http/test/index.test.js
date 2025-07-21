import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { new_server, server } from './server.js';
import { it, describe, expect, beforeEach, afterEach, vi } from 'vitest';
import * as v from 'valibot';
import { McpServer } from 'tmcp';

/**
 * @type {StreamableHTTPClientTransport}
 */
let transport;

/**
 * @type {Client}
 */
let client;

/**
 * @type {McpServer<any>}
 */
let mcp_server;

beforeEach(async () => {
	/**
	 * @type {()=>void};
	 */
	let resolve;

	/**
	 * @type {Promise<void>}
	 */
	let promise = new Promise((r) => {
		resolve = r;
	});
	server.listen(3000, 'localhost', async () => {
		transport = new StreamableHTTPClientTransport(
			new URL('http://localhost:3000/mcp'),
		);
		client = new Client({
			name: 'example-client',
			version: '1.0.0',
		});
		await client.connect(transport);
		resolve();
	});

	await promise;
});

afterEach(() => {
	server.close();
	client.close();
	transport.close();
});

describe('HTTP Transport', () => {
	describe('tools', () => {
		mcp_server = new_server({
			capabilities: {
				tools: {
					listChanged: true,
				},
			},
		}).setup((server) => {
			server.tool(
				{
					description: 'A simple tool for testing',
					name: 'test-tool',
					schema: v.object({
						input: v.string(),
					}),
					title: 'Test Tool',
				},
				({ input }) => {
					return {
						content: [
							{
								type: 'text',
								text: `You called the test tool with input: ${input}`,
							},
						],
					};
				},
			);

			server.tool(
				{
					description: 'Another simple tool for testing',
					name: 'test-tool-2',
					schema: v.object({
						first: v.number(),
						second: v.number(),
					}),
					title: 'Test Tool',
				},
				({ first, second }) => {
					return {
						content: [
							{
								type: 'text',
								text: `You called the test tool with first: ${first} and second: ${second}`,
							},
						],
					};
				},
			);
		});

		it('can request the list of tools', async () => {
			const response = await client.listTools();

			expect(response.tools).toStrictEqual([
				{
					description: 'A simple tool for testing',
					inputSchema: {
						$schema: 'http://json-schema.org/draft-07/schema#',
						properties: {
							input: {
								type: 'string',
							},
						},
						required: ['input'],
						type: 'object',
					},
					name: 'test-tool',
					title: 'Test Tool',
				},
				{
					description: 'Another simple tool for testing',
					inputSchema: {
						$schema: 'http://json-schema.org/draft-07/schema#',
						properties: {
							first: {
								type: 'number',
							},
							second: {
								type: 'number',
							},
						},
						required: ['first', 'second'],
						type: 'object',
					},
					name: 'test-tool-2',
					title: 'Test Tool',
				},
			]);
		});

		it('can call a tool with valid input', async () => {
			const response = await client.callTool({
				name: 'test-tool',
				arguments: {
					input: 'Hello, world!',
				},
			});

			expect(response).toStrictEqual({
				content: [
					{
						type: 'text',
						text: 'You called the test tool with input: Hello, world!',
					},
				],
			});
		});

		it('can call a tool with valid input and multiple arguments', async () => {
			const response = await client.callTool({
				name: 'test-tool-2',
				arguments: {
					first: 42,
					second: 7,
				},
			});

			expect(response).toStrictEqual({
				content: [
					{
						type: 'text',
						text: 'You called the test tool with first: 42 and second: 7',
					},
				],
			});
		});

		it('throws an error when calling a tool with invalid input', async () => {
			await expect(
				client.callTool({
					name: 'test-tool',
					arguments: {
						input: 123, // Invalid type
					},
				}),
			).rejects.toThrow(
				'MCP error 0: MCP error -32602: Invalid arguments for tool test-tool: [{"kind":"schema","type":"string","input":123,"expected":"string","received":"123","message":"Invalid type: Expected string but received 123","path":[{"type":"object","origin":"value","input":{"input":123},"key":"input","value":123}]}]',
			);
		});

		it('throws an error when calling a non-existent tool', async () => {
			await expect(
				client.callTool({
					name: 'non-existent-tool',
					arguments: {},
				}),
			).rejects.toThrow(
				'MCP error 0: MCP error -32601: Tool non-existent-tool not found',
			);
		});

		it('throws an error when calling a tool with missing required arguments', async () => {
			await expect(
				client.callTool({
					name: 'test-tool-2',
					arguments: {
						first: 42, // Missing second argument
					},
				}),
			).rejects.toThrow(
				'MCP error 0: MCP error -32602: Invalid arguments for tool test-tool-2: [{"kind":"schema","type":"object","expected":"\\"second\\"","received":"undefined","message":"Invalid key: Expected \\"second\\" but received undefined","path":[{"type":"object","origin":"key","input":{"first":42},"key":"second"}]}]',
			);
		});

		it('receive a notification when a tool is added', async () => {
			const handler = vi.fn();
			client.setNotificationHandler(
				ToolListChangedNotificationSchema,
				handler,
			);

			await new Promise((resolve) => setTimeout(resolve, 1000));

			mcp_server.tool(
				{
					description: 'A new tool for testing',
					name: 'new-test-tool',
					schema: v.object({
						param: v.string(),
					}),
					title: 'New Test Tool',
				},
				({ param }) => {
					return {
						content: [
							{
								type: 'text',
								text: `You called the new test tool with param: ${param}`,
							},
						],
					};
				},
			);

			const response = await client.listTools();

			expect(response.tools).toContainEqual({
				description: 'A new tool for testing',
				inputSchema: {
					$schema: 'http://json-schema.org/draft-07/schema#',
					properties: {
						param: {
							type: 'string',
						},
					},
					required: ['param'],
					type: 'object',
				},
				name: 'new-test-tool',
				title: 'New Test Tool',
			});

			expect(handler).toHaveBeenCalledWith({
				method: 'notifications/tools/list_changed',
				params: {},
			});

			client.removeNotificationHandler(
				ToolListChangedNotificationSchema.shape.method.value,
			);
		});
	});
});
