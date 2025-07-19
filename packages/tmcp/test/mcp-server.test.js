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
		validate: vi.fn().mockResolvedValue({ value: { test: 'value' } }),
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

			const result = await server.receive(
				initialize_request,
				'session-1',
			);

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

			const result = await server.receive(ping_request, 'session-1');

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

			const result = await server.receive(notification, 'session-1');
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

			const result = await server.receive(invalid, 'session-1');

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
			await server.receive(init, 'session-1');
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

			const list_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/list',
			});

			const result = await server.receive(list_request, 'session-1');

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

			const result = await server.receive(call_request, 'session-1');

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

			const result = await server.receive(call_request, 'session-1');

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

		it('should return error for non-existent tool', async () => {
			const call_request = request({
				jsonrpc: '2.0',
				id: 5,
				method: 'tools/call',
				params: {
					name: 'non-existent-tool',
				},
			});

			const result = await server.receive(call_request, 'session-1');

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
			await server.receive(init, 'session-1');
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

			const result = await server.receive(list, 'session-1');

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

			const result = await server.receive(get_request, 'session-1');

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

			const result = await server.receive(get_request, 'session-1');

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
			await server.receive(init, 'session-1');
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

			const result = await server.receive(list, 'session-1');

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

			const result = await server.receive(read, 'session-1');

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

			const result = await server.receive(subscribe_request, 'session-1');

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

			const result = await server.receive(read_request, 'session-1');

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
			await server.receive(init_request, 'session-1');
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

			const result = await server.receive(set_level_request, 'session-1');

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
			await server.receive(init_request, 'session-1');
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

			await server.receive(init_request, 'session-1');

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

			await server.receive(subscribe_request, 'session-1');
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
			await server.receive(get_request, 'session-1');

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
});
