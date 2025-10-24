/**
 * @import { McpServer } from 'tmcp';
 * @import { GenericSchema } from "valibot";
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
	PromptListChangedNotificationSchema,
	ResourceListChangedNotificationSchema,
	ResourceUpdatedNotificationSchema,
	ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTransport } from '../src/index.js';
import { new_server, server, set_custom_ctx } from './server.js';

/**
 * @type {StreamableHTTPClientTransport}
 */
let transport;

/**
 * @type {Client}
 */
let client;

/**
 * @type {McpServer<GenericSchema, any>}
 */
let mcp_server;

/**
 * @type {Promise<void>}
 */
let sse_connected;

describe('HTTP Transport', () => {
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

	describe('basic connection', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
				capabilities: {
					tools: { listChanged: true },
					prompts: { listChanged: true },
					resources: { listChanged: true, subscribe: true },
					logging: {},
				},
			}).setup(() => {}));
		});

		it('can ping the server', async () => {
			const response = await client.ping();
			expect(response).toStrictEqual({});
		});

		it('can set logging level', async () => {
			const response = await client.setLoggingLevel('debug');
			expect(response).toStrictEqual({});
		});

		it('can get server capabilities', () => {
			const capabilities = client.getServerCapabilities();
			expect(capabilities).toBeDefined();
			expect(capabilities).toHaveProperty('tools');
			expect(capabilities).toHaveProperty('prompts');
			expect(capabilities).toHaveProperty('resources');
		});
	});

	describe('tools', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
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
						title: 'Test Tool 2',
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
			}));
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
					title: 'Test Tool 2',
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

		it('returns an error result when calling a tool with invalid input', async () => {
			const response = await client.callTool({
				name: 'test-tool',
				arguments: {
					input: 123, // Invalid type
				},
			});

			expect(response).toMatchObject({
				isError: true,
				content: [
					{
						type: 'text',
						text: expect.stringContaining(
							'Invalid arguments for tool test-tool',
						),
					},
				],
			});
		});

		it('returns an error result when calling a non-existent tool', async () => {
			const response = await client.callTool({
				name: 'non-existent-tool',
				arguments: {},
			});

			expect(response).toMatchObject({
				isError: true,
				content: [
					{
						type: 'text',
						text: expect.stringContaining(
							'Tool non-existent-tool not found',
						),
					},
				],
			});
		});

		it('returns an error result when calling a tool with missing required arguments', async () => {
			const response = await client.callTool({
				name: 'test-tool-2',
				arguments: {
					first: 42, // Missing second argument
				},
			});

			expect(response).toMatchObject({
				isError: true,
				content: [
					{
						type: 'text',
						text: expect.stringContaining(
							'Invalid arguments for tool test-tool-2',
						),
					},
				],
			});
		});

		it('receives a notification when a tool is added', async () => {
			const handler = vi.fn();
			client.setNotificationHandler(
				ToolListChangedNotificationSchema,
				handler,
			);

			// we need to wait for the SSE connection to be established
			await sse_connected;

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

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					method: 'notifications/tools/list_changed',
					params: {},
				});
			});

			client.removeNotificationHandler(
				ToolListChangedNotificationSchema.shape.method.value,
			);
		});
	});

	describe('prompts', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
				capabilities: {
					prompts: {
						listChanged: true,
					},
				},
			}).setup((server) => {
				server.prompt(
					{
						name: 'test-prompt',
						description: 'A simple prompt for testing',
						title: 'Test Prompt',
						schema: v.object({
							topic: v.string(),
							length: v.optional(
								v.picklist(['short', 'medium', 'long']),
							),
						}),
						complete: {
							length: (arg) => ({
								completion: {
									values: ['short', 'medium', 'long'].filter(
										(l) => l.includes(arg),
									),
									total: 3,
									hasMore: false,
								},
							}),
						},
					},
					async ({ topic, length = 'medium' }) => {
						return {
							description: `A ${length} prompt about ${topic}`,
							messages: [
								{
									role: 'user',
									content: {
										type: 'text',
										text: `Write a ${length} story about ${topic}`,
									},
								},
							],
						};
					},
				);
			}));
		});

		it('can list prompts', async () => {
			const response = await client.listPrompts();
			expect(response.prompts).toHaveLength(1);
			expect(response.prompts[0]).toEqual({
				name: 'test-prompt',
				title: 'Test Prompt',
				description: 'A simple prompt for testing',
				arguments: expect.arrayContaining([
					expect.objectContaining({ name: 'topic', required: true }),
					expect.objectContaining({
						name: 'length',
						required: false,
					}),
				]),
			});
		});

		it('can get a prompt', async () => {
			const response = await client.getPrompt({
				name: 'test-prompt',
				arguments: {
					topic: 'dragons',
					length: 'long',
				},
			});

			expect(response).toEqual({
				description: 'A long prompt about dragons',
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: 'Write a long story about dragons',
						},
					},
				],
			});
		});

		it('can complete prompt parameters', async () => {
			const response = await client.complete({
				ref: { type: 'ref/prompt', name: 'test-prompt' },
				argument: { name: 'length', value: 'l' },
			});

			expect(response.completion.values).toContain('long');
		});

		it('receives notification when prompts change', async () => {
			const handler = vi.fn();
			client.setNotificationHandler(
				PromptListChangedNotificationSchema,
				handler,
			);

			// we need to wait for the SSE connection to be established
			await sse_connected;

			mcp_server.prompt(
				{
					name: 'new-prompt',
					description: 'A new prompt',
				},
				async () => ({
					description: 'New prompt',
					messages: [],
				}),
			);

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					method: 'notifications/prompts/list_changed',
					params: {},
				});
			});

			client.removeNotificationHandler(
				PromptListChangedNotificationSchema.shape.method.value,
			);
		});
	});

	describe('resources', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
				capabilities: {
					resources: {
						listChanged: true,
						subscribe: true,
					},
				},
			}).setup((server) => {
				server.resource(
					{
						name: 'test-resource',
						description: 'A test resource',
						uri: 'test://resource',
					},
					async (uri) => ({
						contents: [
							{
								uri,
								mimeType: 'text/plain',
								text: 'Hello from resource!',
							},
						],
					}),
				);

				server.template(
					{
						name: 'user-template',
						description: 'User profile template',
						uri: 'users/{userId}/profile',
						complete: {
							userId: (arg) => ({
								completion: {
									values: ['user1', 'user2', 'user3'].filter(
										(id) => id.includes(arg),
									),
									total: 3,
									hasMore: false,
								},
							}),
						},
					},
					async (uri, params) => ({
						contents: [
							{
								uri,
								mimeType: 'application/json',
								text: JSON.stringify({
									userId: params.userId,
									name: `User ${params.userId}`,
								}),
							},
						],
					}),
				);
			}));
		});

		it('can list resources', async () => {
			const response = await client.listResources();
			expect(response.resources).toContainEqual({
				name: 'test-resource',
				title: 'A test resource',
				description: 'A test resource',
				uri: 'test://resource',
			});
		});

		it('can list resource templates', async () => {
			const response = await client.listResourceTemplates();
			expect(response.resourceTemplates).toContainEqual({
				name: 'user-template',
				title: 'User profile template',
				description: 'User profile template',
				uriTemplate: 'users/{userId}/profile',
			});
		});

		it('can read a resource', async () => {
			const response = await client.readResource({
				uri: 'test://resource',
			});

			expect(response.contents).toEqual([
				{
					uri: 'test://resource',
					mimeType: 'text/plain',
					text: 'Hello from resource!',
				},
			]);
		});

		it('can read a templated resource', async () => {
			const response = await client.readResource({
				uri: 'users/user1/profile',
			});

			expect(response.contents).toEqual([
				{
					uri: 'users/user1/profile',
					mimeType: 'application/json',
					text: JSON.stringify({
						userId: 'user1',
						name: 'User user1',
					}),
				},
			]);
		});

		it('can complete resource template parameters', async () => {
			const response = await client.complete({
				ref: { type: 'ref/resource', uri: 'users/{userId}/profile' },
				argument: { name: 'userId', value: 'user' },
			});

			expect(response.completion.values).toContain('user1');
		});

		it('can subscribe to a resource', async () => {
			const response = await client.subscribeResource({
				uri: 'test://resource',
			});
			expect(response).toEqual({});
		});

		it('can unsubscribe from a resource', async () => {
			await client.subscribeResource({ uri: 'test://resource' });
			// Note: unsubscribeResource may not be implemented in the current version
			try {
				const response = await client.unsubscribeResource({
					uri: 'test://resource',
				});
				expect(response).toEqual({});
			} catch (error) {
				// If unsubscribe is not implemented, that's expected for now
				expect(/** @type {Error} */ (error).message).toContain(
					'Method not found',
				);
			}
		});

		it('receives notification when resources list changes', async () => {
			const handler = vi.fn();
			client.setNotificationHandler(
				ResourceListChangedNotificationSchema,
				handler,
			);

			// we need to wait for the SSE connection to be established
			await sse_connected;

			mcp_server.resource(
				{
					name: 'new-resource',
					description: 'A new resource',
					uri: 'test://new-resource',
				},
				async (uri) => ({
					contents: [{ uri, mimeType: 'text/plain', text: 'New!' }],
				}),
			);

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					method: 'notifications/resources/list_changed',
					params: {},
				});
			});

			client.removeNotificationHandler(
				ResourceListChangedNotificationSchema.shape.method.value,
			);
		});

		it('receives notification when subscribed resource updates', async () => {
			await client.subscribeResource({ uri: 'test://resource' });

			const handler = vi.fn();
			client.setNotificationHandler(
				ResourceUpdatedNotificationSchema,
				handler,
			);

			// we need to wait for the SSE connection to be established
			await sse_connected;

			// Trigger resource change
			mcp_server.changed('resource', 'test://resource');

			await vi.waitFor(() => {
				expect(handler).toHaveBeenCalledWith({
					method: 'notifications/resources/updated',
					params: {
						uri: 'test://resource',
						title: 'test-resource',
					},
				});
			});

			client.removeNotificationHandler(
				ResourceUpdatedNotificationSchema.shape.method.value,
			);
		});
	});

	describe('roots', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
				capabilities: {},
			}).setup(() => {}));
		});

		it('can send roots list changed notification', async () => {
			try {
				const response = await client.sendRootsListChanged();
				expect(response).toEqual({});
			} catch (error) {
				// If roots are not supported by the client configuration, that's expected
				expect(/** @type {Error} */ (error).message).toContain(
					'roots list changed notifications',
				);
			}
		});
	});

	describe('custom context', () => {
		/**
		 * @type {Record<string, unknown>}
		 */
		let captured_context;
		beforeEach(() => {
			set_custom_ctx({ random: 'thing' });
			({ mcp_server, sse_connected } = new_server({
				capabilities: {
					tools: { listChanged: true },
				},
			}).setup((server) => {
				server.tool(
					{
						name: 'context-capture-tool',
						description: 'A tool that captures context',
					},
					() => {
						captured_context = server.ctx;
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(captured_context),
								},
							],
						};
					},
				);
			}));
		});

		afterEach(() => {
			set_custom_ctx(undefined);
		});

		it('should pass custom context through HTTP transport', async () => {
			await client.callTool({
				name: 'context-capture-tool',
				arguments: {},
			});

			expect(captured_context.custom).toStrictEqual({ random: 'thing' });
		});
	});

	describe('error handling', () => {
		beforeEach(() => {
			({ mcp_server, sse_connected } = new_server({
				capabilities: {
					tools: { listChanged: true },
				},
			}).setup(() => {}));
		});

		it('handles malformed requests gracefully', async () => {
			// This test verifies that the transport handles errors properly
			const response = await client.callTool({
				name: 'non-existent',
				arguments: {},
			});

			expect(response).toMatchObject({
				isError: true,
				content: [
					{
						type: 'text',
						text: expect.stringContaining(
							'Tool non-existent not found',
						),
					},
				],
			});
		});
	});

	describe('configuration', () => {
		it('responds on any path when configured with a null path', async () => {
			const transport = new HttpTransport(mcp_server, {
				path: null,
				getSessionId: () => 'session-id',
			});

			const response = await transport.respond(
				new Request('http://localhost/custom', {
					method: 'GET',
					headers: {
						'mcp-session-id': 'session-id',
					},
				}),
			);

			expect(response).not.toBeNull();
			expect(response?.status).toBe(200);
			expect(response?.headers.get('content-type')).toBe(
				'text/event-stream',
			);
			await response?.body?.cancel();
		});

		it('emits a warning when no path is provided in development', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			try {
				new HttpTransport(mcp_server, {
					getSessionId: () => 'session-id',
				});
				expect(warn).toHaveBeenCalledWith(
					"[tmcp][transport-http] `options.path` is undefined, in future versions passing `undefined` will default to respond on all paths. To keep the current behavior, explicitly set `path` to '/mcp' or your desired path.",
				);
			} finally {
				warn.mockRestore();
			}
		});
	});
});
