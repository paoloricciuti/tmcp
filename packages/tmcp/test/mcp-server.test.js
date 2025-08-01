/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonSchemaAdapter } from '../src/adapter.js';
import { McpServer } from '../src/index.js';

/**
 * @template T
 * @typedef {StandardSchemaV1<T>} MockSchema
 */

/**
 * Mock adapter for testing
 * @augments {JsonSchemaAdapter<MockSchema<any>>}
 */
class MockAdapter extends JsonSchemaAdapter {
	/**
	 * Converts a schema to JSON Schema format.
	 * @returns {Promise<object>}
	 */
	async toJsonSchema() {
		return {
			type: 'object',
			properties: {
				test: { type: 'string' },
			},
			required: ['test'],
		};
	}
}

/**
 * Mock schema for testing
 * @type {MockSchema<any>}
 */
const mock_schema = {
	'~standard': {
		validate: vi
			.fn()
			.mockImplementation((input) => Promise.resolve({ value: input })),
		vendor: 'mock',
		version: 1,
	},
};

/**
 * Mock schema for testing
 * @type {MockSchema<any>}
 */
const output_mock_schema = {
	'~standard': {
		validate: vi
			.fn()
			.mockImplementation((input) => Promise.resolve({ value: input })),
		vendor: 'mock',
		version: 1,
	},
};

/**
 * @template const T
 * @param {T} request
 * @returns {T}
 */
function request(request) {
	return request;
}

const adapter = new MockAdapter();

const server_info = {
	name: 'test-server',
	version: '1.0.0',
	description: 'A test MCP server',
};

describe('McpServer', () => {
	/**
	 * @type {McpServer<any>}
	 */
	let server;

	beforeEach(() => {
		server = new McpServer(server_info, {
			adapter,
			capabilities: {
				tools: { listChanged: true },
				prompts: { listChanged: true },
				resources: { subscribe: true, listChanged: true },
				logging: {},
			},
		});
	});

	describe('constructor', () => {
		it('should create a server instance with provided info and options', () => {
			expect(server).toBeInstanceOf(McpServer);
			expect(server.roots).toEqual([]);
		});

		it('should initialize with empty collections', () => {
			expect(server.currentClientCapabilities()).toBeUndefined();
		});
	});

	describe('message handling', () => {
		it('should handle initialize request', async () => {
			const initialize_request = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {
						roots: { listChanged: true },
					},
					clientInfo: {
						name: 'test-client',
						version: '1.0.0',
					},
				},
			});

			const result = await server.receive(initialize_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 1,
				result: expect.objectContaining({
					protocolVersion: '2025-06-18',
					serverInfo: server_info,
					capabilities: expect.objectContaining({
						tools: { listChanged: true },
						prompts: { listChanged: true },
						resources: { subscribe: true, listChanged: true },
						logging: {},
					}),
				}),
			});
		});

		it('should handle ping request', async () => {
			const ping_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'ping',
			});

			const result = await server.receive(ping_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 2,
				result: {},
			});
		});

		it('should handle notifications/initialized', async () => {
			const notification = request({
				jsonrpc: '2.0',
				method: 'notifications/initialized',
			});

			const result = await server.receive(notification, {
				sessionId: 'session-1',
			});
			expect(result).toBe(null);
		});

		it('should reject invalid protocol version', async () => {
			const invalid = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: 'invalid-version',
					capabilities: {},
					clientInfo: {
						name: 'test-client',
						version: '1.0.0',
					},
				},
			});

			const result = await server.receive(invalid, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 1,
				error: expect.objectContaining({
					code: expect.any(Number),
					message: expect.stringContaining(
						'Invalid protocol version format',
					),
				}),
			});
		});
	});

	describe('tools functionality', () => {
		beforeEach(async () => {
			// Initialize the server first
			const init = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});
			await server.receive(init, { sessionId: 'session-1' });
		});

		it('should list tools', async () => {
			const tool = vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'result' }],
			});

			server.tool(
				{
					name: 'list-test-tool',
					description: 'A tool for list testing',
					title: 'List Test Tool',
				},
				tool,
			);

			server.tool(
				{
					name: 'list-test-tool-schemas',
					description: 'A tool for list testing 2',
					title: 'List Test Tool',
					schema: mock_schema,
					outputSchema: output_mock_schema,
				},
				tool,
			);

			const list_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/list',
			});

			const result = await server.receive(list_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 2,
				result: {
					tools: [
						{
							name: 'list-test-tool',
							title: 'List Test Tool',
							description: 'A tool for list testing',
							inputSchema: { type: 'object', properties: {} },
						},
						{
							description: 'A tool for list testing 2',
							inputSchema: {
								properties: {
									test: {
										type: 'string',
									},
								},
								required: ['test'],
								type: 'object',
							},
							outputSchema: {
								type: 'object',
								properties: {
									test: {
										type: 'string',
									},
								},
								required: ['test'],
							},
							name: 'list-test-tool-schemas',
							title: 'List Test Tool',
						},
					],
				},
			});
		});

		it('should call a tool without arguments', async () => {
			const tool = vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'tool executed' }],
			});

			server.tool(
				{
					name: 'call-test-tool',
					description: 'A tool for call testing',
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'tools/call',
				params: {
					name: 'call-test-tool',
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(tool).toHaveBeenCalledWith();
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 3,
				result: {
					content: [{ type: 'text', text: 'tool executed' }],
				},
			});
		});

		it('should call a tool with schema validation', async () => {
			const tool = vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'tool executed with args' }],
			});

			server.tool(
				{
					name: 'schema-test-tool',
					description: 'A tool with schema',
					schema: mock_schema,
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'tools/call',
				params: {
					name: 'schema-test-tool',
					arguments: { test: 'value' },
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(mock_schema['~standard'].validate).toHaveBeenCalledWith({
				test: 'value',
			});
			expect(tool).toHaveBeenCalledWith({ test: 'value' });
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 4,
				result: {
					content: [
						{ type: 'text', text: 'tool executed with args' },
					],
				},
			});
		});

		it('should call a tool with outputSchema validation', async () => {
			const tool = vi.fn().mockResolvedValue({
				content: [
					{
						type: 'text',
						text: '{ "cool": true }',
					},
				],
				structuredContent: {
					cool: true,
				},
			});

			server.tool(
				{
					name: 'schema-test-tool',
					description: 'A tool with schema',
					schema: mock_schema,
					outputSchema: output_mock_schema,
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'tools/call',
				params: {
					name: 'schema-test-tool',
					arguments: { test: 'value' },
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(
				output_mock_schema['~standard'].validate,
			).toHaveBeenCalledWith({
				cool: true,
			});
			expect(tool).toHaveBeenCalledWith({ test: 'value' });
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 4,
				result: {
					content: [{ type: 'text', text: '{ "cool": true }' }],
					structuredContent: {
						cool: true,
					},
				},
			});
		});

		it('should return error for non-existent tool', async () => {
			const call_request = request({
				jsonrpc: '2.0',
				id: 5,
				method: 'tools/call',
				params: {
					name: 'non-existent-tool',
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 5,
				error: expect.objectContaining({
					code: expect.any(Number),
					message: expect.stringContaining(
						'Tool non-existent-tool not found',
					),
				}),
			});
		});
	});

	describe('prompts functionality', () => {
		beforeEach(async () => {
			const init = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});
			await server.receive(init, { sessionId: 'session-1' });
		});

		it('should list prompts', async () => {
			const prompt = vi.fn().mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: { type: 'text', text: 'prompt result' },
					},
				],
			});

			server.prompt(
				{
					name: 'list-test-prompt',
					description: 'A prompt for list testing',
					title: 'List Test Prompt',
				},
				prompt,
			);

			const list = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'prompts/list',
			});

			const result = await server.receive(list, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 2,
				result: {
					prompts: [
						{
							name: 'list-test-prompt',
							title: 'List Test Prompt',
							description: 'A prompt for list testing',
							arguments: [],
						},
					],
				},
			});
		});

		it('should get a prompt', async () => {
			const prompt = vi.fn().mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: { type: 'text', text: 'prompt result' },
					},
				],
			});

			server.prompt(
				{
					name: 'get-test-prompt',
					description: 'A prompt for get testing',
				},
				prompt,
			);

			const get_request = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'prompts/get',
				params: {
					name: 'get-test-prompt',
				},
			});

			const result = await server.receive(get_request, {
				sessionId: 'session-1',
			});

			expect(prompt).toHaveBeenCalledWith();
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 3,
				result: {
					messages: [
						{
							role: 'user',
							content: { type: 'text', text: 'prompt result' },
						},
					],
				},
			});
		});

		it('should return error for non-existent prompt', async () => {
			const get_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'prompts/get',
				params: {
					name: 'non-existent-prompt',
				},
			});

			const result = await server.receive(get_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 4,
				error: expect.objectContaining({
					code: expect.any(Number),
					message: expect.stringContaining(
						'Prompt non-existent-prompt not found',
					),
				}),
			});
		});
	});

	describe('resources functionality', () => {
		beforeEach(async () => {
			const init = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});
			await server.receive(init, { sessionId: 'session-1' });
		});

		it('should list resources', async () => {
			const resource = vi.fn().mockResolvedValue({
				contents: [{ uri: 'test://resource', text: 'content' }],
			});

			server.resource(
				{
					name: 'list-test-resource',
					description: 'A resource for list testing',
					uri: 'test://list-resource',
				},
				resource,
			);

			const list = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'resources/list',
			});

			const result = await server.receive(list, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 2,
				result: {
					resources: [
						{
							name: 'list-test-resource',
							title: 'A resource for list testing',
							description: 'A resource for list testing',
							uri: 'test://list-resource',
						},
					],
				},
			});
		});

		it('should read a resource', async () => {
			const resource = vi.fn().mockResolvedValue({
				contents: [
					{ uri: 'test://read-resource', text: 'resource content' },
				],
			});

			server.resource(
				{
					name: 'read-test-resource',
					description: 'A resource for read testing',
					uri: 'test://read-resource',
				},
				resource,
			);

			const read = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'resources/read',
				params: {
					uri: 'test://read-resource',
				},
			});

			const result = await server.receive(read, {
				sessionId: 'session-1',
			});

			expect(resource).toHaveBeenCalledWith('test://read-resource');
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 3,
				result: {
					contents: [
						{
							uri: 'test://read-resource',
							text: 'resource content',
						},
					],
				},
			});
		});

		it('should subscribe to a resource', async () => {
			const subscribe_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'resources/subscribe',
				params: {
					uri: 'test://subscribe-resource',
				},
			});

			server.resource(
				{
					name: 'subscribe-test-resource',
					description: 'A resource for subscribe testing',
					uri: 'test://subscribe-resource',
				},
				() => {
					return {
						contents: [],
					};
				},
			);

			const result = await server.receive(subscribe_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 4,
				result: {},
			});
		});

		it('should return error for non-existent resource', async () => {
			const read_request = request({
				jsonrpc: '2.0',
				id: 5,
				method: 'resources/read',
				params: {
					uri: 'test://non-existent',
				},
			});

			const result = await server.receive(read_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 5,
				error: expect.objectContaining({
					code: expect.any(Number),
					message: expect.stringContaining(
						'Resource test://non-existent not found',
					),
				}),
			});
		});
	});

	describe('logging functionality', () => {
		beforeEach(async () => {
			const init_request = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});
			await server.receive(init_request, { sessionId: 'session-1' });
		});

		it('should set log level', async () => {
			const set_level_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'logging/setLevel',
				params: {
					level: 'debug',
				},
			});

			const result = await server.receive(set_level_request, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 2,
				result: {},
			});
		});

		it('should log messages when logging is enabled', () => {
			const on = vi.fn();
			server.on('send', on, { once: true });
			expect(() => {
				server.log('info', 'test message', 'test-logger');
			}).not.toThrow();

			expect(on).toHaveBeenCalledWith({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/message',
					params: {
						level: 'info',
						data: 'test message',
						logger: 'test-logger',
					},
				},
			});
		});
	});

	describe('event handling', () => {
		it('should register event listeners', async () => {
			const init_request = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});

			const listener = vi.fn();
			server.on('initialize', listener, { once: true });
			expect(listener).not.toHaveBeenCalled();
			await server.receive(init_request, { sessionId: 'session-1' });
			expect(listener).toHaveBeenCalledWith({
				capabilities: {},
				clientInfo: {
					name: 'test',
					version: '1.0.0',
				},
				protocolVersion: '2025-06-18',
			});
		});

		it('should handle send events', async () => {
			const listener = vi.fn();
			const off = server.on('send', listener);
			expect(listener).not.toHaveBeenCalled();

			const init_request = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {
						roots: {},
						sampling: {},
						elicitation: {},
					},
					clientInfo: { name: 'test', version: '1.0.0' },
				},
			});

			await server.receive(init_request, { sessionId: 'session-1' });

			expect(listener).toHaveBeenNthCalledWith(1, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 1,
					jsonrpc: '2.0',
					method: 'roots/list',
					params: undefined,
				},
			});

			// called when resource list changes
			server.resource(
				{
					name: 'test-resource',
					description: 'A test resource',
					uri: 'test://subscribe-resource',
				},
				() => {
					return {
						contents: [],
					};
				},
			);

			expect(listener).toHaveBeenNthCalledWith(2, {
				context: {},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/resources/list_changed',
					params: {},
				},
			});

			const subscribe_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'resources/subscribe',
				params: {
					uri: 'test://subscribe-resource',
				},
			});

			await server.receive(subscribe_request, { sessionId: 'session-1' });
			server.changed('resource', 'test://subscribe-resource');

			expect(listener).toHaveBeenNthCalledWith(3, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/resources/updated',
					params: {
						title: 'test-resource',
						uri: 'test://subscribe-resource',
					},
				},
			});

			server.tool(
				{
					description: 'A test tool',
					name: 'test-tool',
					title: 'Test Tool',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'tool executed' }],
					};
				},
			);

			expect(listener).toHaveBeenNthCalledWith(4, {
				context: {},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/tools/list_changed',
					params: {},
				},
			});

			server.prompt(
				{
					description: 'A test prompt',
					name: 'test-prompt',
					title: 'Test Prompt',
				},
				() => {
					// this needs a session context to actually send a notification
					server.elicitation(mock_schema);
					server.refreshRoots();
					server.message({
						maxTokens: 1000,
						messages: [],
					});
					return {
						messages: [],
					};
				},
			);

			expect(listener).toHaveBeenNthCalledWith(5, {
				context: {},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/prompts/list_changed',
					params: {},
				},
			});

			const get_request = request({
				jsonrpc: '2.0',
				id: 5,
				method: 'prompts/get',
				params: {
					name: 'test-prompt',
				},
			});

			// trigger the prompt read to test elicitation, refreshRoots and message
			await server.receive(get_request, { sessionId: 'session-1' });

			expect(listener).toHaveBeenNthCalledWith(6, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 2,
					jsonrpc: '2.0',
					method: 'roots/list',
					params: undefined,
				},
			});

			expect(listener).toHaveBeenNthCalledWith(7, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 3,
					jsonrpc: '2.0',
					method: 'sampling/createMessage',
					params: {
						maxTokens: 1000,
						messages: [],
					},
				},
			});

			expect(listener).toHaveBeenNthCalledWith(8, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 4,
					jsonrpc: '2.0',
					method: 'elicitation/create',
					params: {
						params: {
							properties: {
								test: {
									type: 'string',
								},
							},
							required: ['test'],
							type: 'object',
						},
					},
				},
			});

			off();
		});
	});

	describe('subscription changes', () => {
		it('should notify resource changes', () => {
			const resource = vi.fn().mockResolvedValue({
				contents: [{ uri: 'test://change-resource', text: 'content' }],
			});

			server.resource(
				{
					name: 'change-resource',
					description: 'A resource for change testing',
					uri: 'test://change-resource',
				},
				resource,
			);

			expect(() => {
				server.changed('resource', 'test://change-resource');
			}).not.toThrow();
		});
	});

	describe('refresh roots', () => {
		it('should refresh roots', async () => {
			await expect(server.refreshRoots()).resolves.toBeUndefined();
		});
	});

	describe('multi-session functionality', () => {
		describe('session initialization', () => {
			it('should handle multiple session initializations independently', async () => {
				const session1_init = request({
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: { roots: { listChanged: true } },
						clientInfo: { name: 'client-1', version: '1.0.0' },
					},
				});

				const session2_init = request({
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: { tools: { listChanged: true } },
						clientInfo: { name: 'client-2', version: '2.0.0' },
					},
				});

				const [result1, result2] = await Promise.all([
					server.receive(session1_init, { sessionId: 'session-1' }),
					server.receive(session2_init, { sessionId: 'session-2' }),
				]);

				expect(result1).toEqual({
					jsonrpc: '2.0',
					id: 1,
					result: expect.objectContaining({
						protocolVersion: '2025-06-18',
						serverInfo: server_info,
					}),
				});

				expect(result2).toEqual({
					jsonrpc: '2.0',
					id: 1,
					result: expect.objectContaining({
						protocolVersion: '2025-06-18',
						serverInfo: server_info,
					}),
				});
			});

			it.todo(
				'should track client capabilities per session',
				async () => {
					// Initialize two sessions with different capabilities
					await server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: { roots: {} },
								clientInfo: {
									name: 'client-1',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'session-with-roots' },
					);

					await server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: { elicitation: {} },
								clientInfo: {
									name: 'client-2',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'session-with-tools' },
					);

					// Verify that sessions maintain different capability contexts
					// This is internal behavior that would be tested through side effects
					expect(server).toBeInstanceOf(McpServer);
				},
			);
		});

		describe('session isolation', () => {
			beforeEach(async () => {
				// Initialize multiple sessions
				const sessions = [
					{ sessionId: 'session-a' },
					{ sessionId: 'session-b' },
					{ sessionId: 'session-c' },
				];
				await Promise.all(
					sessions.map((sessionId) =>
						server.receive(
							request({
								jsonrpc: '2.0',
								id: 1,
								method: 'initialize',
								params: {
									protocolVersion: '2025-06-18',
									capabilities: {},
									clientInfo: {
										name: `client-${sessionId}`,
										version: '1.0.0',
									},
								},
							}),
							sessionId,
						),
					),
				);
			});

			it('should handle tool calls across multiple sessions simultaneously', async () => {
				const tool_handler = vi.fn().mockImplementation((args) => ({
					content: [
						{
							type: 'text',
							text: `Tool executed with: ${JSON.stringify(args || {})}`,
						},
					],
				}));

				server.tool(
					{
						name: 'multi-session-tool',
						description: 'A tool for multi-session testing',
						schema: mock_schema,
					},
					tool_handler,
				);

				// Call the same tool from different sessions with different arguments
				const call_requests = [
					{
						request: request({
							jsonrpc: '2.0',
							id: 2,
							method: 'tools/call',
							params: {
								name: 'multi-session-tool',
								arguments: { test: 'session-a-data' },
							},
						}),
						session: 'session-a',
					},
					{
						request: request({
							jsonrpc: '2.0',
							id: 2,
							method: 'tools/call',
							params: {
								name: 'multi-session-tool',
								arguments: { test: 'session-b-data' },
							},
						}),
						session: 'session-b',
					},
					{
						request: request({
							jsonrpc: '2.0',
							id: 2,
							method: 'tools/call',
							params: {
								name: 'multi-session-tool',
								arguments: { test: 'session-c-data' },
							},
						}),
						session: 'session-c',
					},
				];

				const results = await Promise.all(
					call_requests.map(({ request, session }) =>
						server.receive(request, { sessionId: session }),
					),
				);

				// Verify each session got its own result
				expect(results[0].result.content[0].text).toContain(
					'session-a-data',
				);
				expect(results[1].result.content[0].text).toContain(
					'session-b-data',
				);
				expect(results[2].result.content[0].text).toContain(
					'session-c-data',
				);

				// Verify the tool was called 3 times with different arguments
				expect(tool_handler).toHaveBeenCalledTimes(3);
				expect(tool_handler).toHaveBeenNthCalledWith(1, {
					test: 'session-a-data',
				});
				expect(tool_handler).toHaveBeenNthCalledWith(2, {
					test: 'session-b-data',
				});
				expect(tool_handler).toHaveBeenNthCalledWith(3, {
					test: 'session-c-data',
				});
			});

			it('should handle prompt calls across multiple sessions simultaneously', async () => {
				const prompt_handler = vi.fn().mockImplementation((args) => ({
					messages: [
						{
							role: 'user',
							content: {
								type: 'text',
								text: `Prompt executed with: ${JSON.stringify(args || {})}`,
							},
						},
					],
				}));

				server.prompt(
					{
						name: 'multi-session-prompt',
						description: 'A prompt for multi-session testing',
						schema: mock_schema,
					},
					prompt_handler,
				);

				const prompt_requests = [
					{
						request: request({
							jsonrpc: '2.0',
							id: 3,
							method: 'prompts/get',
							params: {
								name: 'multi-session-prompt',
								arguments: { sessionData: 'session-a-prompt' },
							},
						}),
						session: 'session-a',
					},
					{
						request: request({
							jsonrpc: '2.0',
							id: 3,
							method: 'prompts/get',
							params: {
								name: 'multi-session-prompt',
								arguments: { sessionData: 'session-b-prompt' },
							},
						}),
						session: 'session-b',
					},
				];

				const results = await Promise.all(
					prompt_requests.map(({ request, session }) =>
						server.receive(request, { sessionId: session }),
					),
				);

				expect(results[0].result.messages[0].content.text).toContain(
					'session-a-prompt',
				);
				expect(results[1].result.messages[0].content.text).toContain(
					'session-b-prompt',
				);

				expect(prompt_handler).toHaveBeenCalledTimes(2);
				expect(prompt_handler).toHaveBeenNthCalledWith(1, {
					sessionData: 'session-a-prompt',
				});
				expect(prompt_handler).toHaveBeenNthCalledWith(2, {
					sessionData: 'session-b-prompt',
				});
			});

			it('should handle resource subscriptions per session', async () => {
				const resource_handler = vi.fn().mockResolvedValue({
					contents: [
						{
							uri: 'test://multi-session-resource',
							text: 'content',
						},
					],
				});

				server.resource(
					{
						name: 'multi-session-resource',
						description: 'A resource for multi-session testing',
						uri: 'test://multi-session-resource',
					},
					resource_handler,
				);

				server.resource(
					{
						name: 'one-session-resource',
						description: 'A resource for one-session testing',
						uri: 'test://one-session-resource',
					},
					() => {
						return {
							contents: [],
						};
					},
				);

				const on = vi.fn();
				const off = server.on('send', on);

				// Subscribe from different sessions
				const subscribe_requests = [
					{
						request: request({
							jsonrpc: '2.0',
							id: 4,
							method: 'resources/subscribe',
							params: { uri: 'test://multi-session-resource' },
						}),
						session: 'session-a',
					},
					{
						request: request({
							jsonrpc: '2.0',
							id: 4,
							method: 'resources/subscribe',
							params: { uri: 'test://multi-session-resource' },
						}),
						session: 'session-b',
					},
				];

				const results = await Promise.all(
					subscribe_requests.map(({ request, session }) =>
						server.receive(request, { sessionId: session }),
					),
				);

				server.receive(
					request(
						request({
							jsonrpc: '2.0',
							id: 4,
							method: 'resources/subscribe',
							params: { uri: 'test://one-session-resource' },
						}),
					),
					{ sessionId: 'session-a' },
				);

				expect(results[0]).toEqual({
					jsonrpc: '2.0',
					id: 4,
					result: {},
				});
				expect(results[1]).toEqual({
					jsonrpc: '2.0',
					id: 4,
					result: {},
				});

				server.changed('resource', 'test://multi-session-resource');

				expect(on).toHaveBeenCalledWith({
					context: {
						sessions: ['session-a', 'session-b'],
					},
					request: {
						jsonrpc: '2.0',
						method: 'notifications/resources/updated',
						params: {
							title: 'multi-session-resource',
							uri: 'test://multi-session-resource',
						},
					},
				});

				// change a resource only subscribed to from a and verify only session-a
				// is sent to the send event

				server.changed('resource', 'test://one-session-resource');

				expect(on).toHaveBeenNthCalledWith(2, {
					context: {
						sessions: ['session-a'],
					},
					request: {
						jsonrpc: '2.0',
						method: 'notifications/resources/updated',
						params: {
							title: 'one-session-resource',
							uri: 'test://one-session-resource',
						},
					},
				});

				off();
			});
		});

		describe('concurrent operations', () => {
			beforeEach(async () => {
				// Initialize sessions
				await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: {},
								clientInfo: {
									name: 'concurrent-client-1',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'concurrent-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: {},
								clientInfo: {
									name: 'concurrent-client-2',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'concurrent-session-2' },
					),
				]);
			});

			it('should handle concurrent tool registrations and calls', async () => {
				const tool1 = vi.fn().mockResolvedValue({
					content: [{ type: 'text', text: 'tool1 result' }],
				});
				const tool2 = vi.fn().mockResolvedValue({
					content: [{ type: 'text', text: 'tool2 result' }],
				});

				// Register tools concurrently
				server.tool(
					{ name: 'concurrent-tool-1', description: 'Tool 1' },
					tool1,
				);
				server.tool(
					{ name: 'concurrent-tool-2', description: 'Tool 2' },
					tool2,
				);

				// Call tools concurrently from different sessions
				const concurrent_calls = await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 2,
							method: 'tools/call',
							params: { name: 'concurrent-tool-1' },
						}),
						{ sessionId: 'concurrent-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 2,
							method: 'tools/call',
							params: { name: 'concurrent-tool-2' },
						}),
						{ sessionId: 'concurrent-session-2' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 3,
							method: 'tools/list',
						}),
						{ sessionId: 'concurrent-session-1' },
					),
				]);

				expect(concurrent_calls[0].result.content[0].text).toBe(
					'tool1 result',
				);
				expect(concurrent_calls[1].result.content[0].text).toBe(
					'tool2 result',
				);
				expect(concurrent_calls[2].result.tools).toHaveLength(2);

				expect(tool1).toHaveBeenCalledTimes(1);
				expect(tool2).toHaveBeenCalledTimes(1);
			});

			it('should handle mixed request types concurrently', async () => {
				// Setup tools, prompts, and resources
				server.tool(
					{ name: 'mixed-tool', description: 'Mixed test tool' },
					vi.fn().mockResolvedValue({
						content: [{ type: 'text', text: 'tool executed' }],
					}),
				);

				server.prompt(
					{ name: 'mixed-prompt', description: 'Mixed test prompt' },
					vi.fn().mockResolvedValue({
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'prompt executed',
								},
							},
						],
					}),
				);

				server.resource(
					{
						name: 'mixed-resource',
						description: 'Mixed test resource',
						uri: 'test://mixed-resource',
					},
					vi.fn().mockResolvedValue({
						contents: [
							{
								uri: 'test://mixed-resource',
								text: 'resource content',
							},
						],
					}),
				);

				// Execute different types of requests concurrently
				const mixed_results = await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 10,
							method: 'tools/call',
							params: { name: 'mixed-tool' },
						}),
						{ sessionId: 'concurrent-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 11,
							method: 'prompts/get',
							params: { name: 'mixed-prompt' },
						}),
						{ sessionId: 'concurrent-session-2' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 12,
							method: 'resources/read',
							params: { uri: 'test://mixed-resource' },
						}),
						{ sessionId: 'concurrent-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 13,
							method: 'ping',
						}),
						{ sessionId: 'concurrent-session-2' },
					),
				]);

				expect(mixed_results[0].result.content[0].text).toBe(
					'tool executed',
				);
				expect(mixed_results[1].result.messages[0].content.text).toBe(
					'prompt executed',
				);
				expect(mixed_results[2].result.contents[0].text).toBe(
					'resource content',
				);
				expect(mixed_results[3].result).toEqual({});
			});
		});

		describe('session state management', () => {
			it('should maintain separate logging states per session', async () => {
				// Initialize sessions
				await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: {},
								clientInfo: {
									name: 'log-client-1',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'log-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: {},
								clientInfo: {
									name: 'log-client-2',
									version: '1.0.0',
								},
							},
						}),
						{ sessionId: 'log-session-2' },
					),
				]);

				// Set different log levels for different sessions
				await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 2,
							method: 'logging/setLevel',
							params: { level: 'debug' },
						}),
						{ sessionId: 'log-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 2,
							method: 'logging/setLevel',
							params: { level: 'error' },
						}),
						{ sessionId: 'log-session-2' },
					),
				]);

				const on = vi.fn();
				const off = server.on('send', on);

				// only sessions with debug level should receive this
				server.log('info', 'This is an info message');
				expect(on).toHaveBeenCalledWith({
					context: {
						sessions: ['log-session-1'],
					},
					request: {
						jsonrpc: '2.0',
						method: 'notifications/message',
						params: {
							level: 'info',
							data: 'This is an info message',
						},
					},
				});
				off();
			});
		});
	});
});
