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

/**
 * Utility helper to build icon payloads for list responses.
 * @param {string} name
 */
const create_icons = (name) => [
	{
		src: `https://example.com/${name}.png`,
		mimeType: 'image/png',
		sizes: ['64x64'],
	},
];

describe('McpServer', () => {
	/**
	 * @type {McpServer<MockSchema<any>, any>}
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
			const tool_icons = create_icons('list-tool');

			server.tool(
				{
					name: 'list-test-tool',
					description: 'A tool for list testing',
					title: 'List Test Tool',
					icons: tool_icons,
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
							icons: tool_icons,
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
							icons: undefined,
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
				result: {
					isError: true,
					content: [
						{
							type: 'text',
							text: 'Tool non-existent-tool not found',
						},
					],
				},
			});
		});

		it('should return error result when tool arguments validation fails', async () => {
			const validation_error_schema =
				/** @type {StandardSchemaV1<any>} */ ({
					'~standard': {
						validate: vi.fn().mockResolvedValue({
							issues: [{ message: 'Invalid input' }],
						}),
						vendor: 'mock',
						version: 1,
					},
				});
			const tool = vi.fn();

			server.tool(
				{
					name: 'validation-error-tool',
					description: 'A tool with invalid arguments',
					schema: validation_error_schema,
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 6,
				method: 'tools/call',
				params: {
					name: 'validation-error-tool',
					arguments: { test: 'value' },
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(tool).not.toHaveBeenCalled();
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 6,
				result: {
					isError: true,
					content: [
						{
							type: 'text',
							text: 'Invalid arguments for tool validation-error-tool: [{"message":"Invalid input"}]',
						},
					],
				},
			});
		});

		it('should return error result when structured content validation fails', async () => {
			const validation_error_schema =
				/** @type {StandardSchemaV1<any>} */ ({
					'~standard': {
						validate: vi.fn().mockResolvedValue({
							value: { test: 'value' },
						}),
						vendor: 'mock',
						version: 1,
					},
				});
			const failing_output_schema =
				/** @type {StandardSchemaV1<any>} */ ({
					'~standard': {
						validate: vi.fn().mockResolvedValue({
							issues: [{ message: 'Invalid output' }],
						}),
						vendor: 'mock',
						version: 1,
					},
				});
			const tool = vi.fn().mockResolvedValue({
				content: [
					{
						type: 'text',
						text: 'structured response',
					},
				],
				structuredContent: { cool: true },
			});

			server.tool(
				{
					name: 'output-validation-tool',
					description: 'A tool with invalid structured output',
					schema: validation_error_schema,
					outputSchema: failing_output_schema,
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 7,
				method: 'tools/call',
				params: {
					name: 'output-validation-tool',
					arguments: { test: 'value' },
				},
			});

			const result = await server.receive(call_request, {
				sessionId: 'session-1',
			});

			expect(
				validation_error_schema['~standard'].validate,
			).toHaveBeenCalledWith({ test: 'value' });
			expect(tool).toHaveBeenCalledWith({ test: 'value' });
			expect(
				failing_output_schema['~standard'].validate,
			).toHaveBeenCalledWith({ cool: true });
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 7,
				result: {
					isError: true,
					content: [
						{
							type: 'text',
							text: 'Tool output-validation-tool returned invalid structured content: [{"message":"Invalid output"}]',
						},
					],
				},
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
			const prompt_icons = create_icons('list-prompt');

			server.prompt(
				{
					name: 'list-test-prompt',
					description: 'A prompt for list testing',
					title: 'List Test Prompt',
					icons: prompt_icons,
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
							icons: prompt_icons,
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
			const resource_icons = create_icons('list-resource');

			server.resource(
				{
					name: 'list-test-resource',
					description: 'A resource for list testing',
					uri: 'test://list-resource',
					icons: resource_icons,
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
							icons: resource_icons,
						},
					],
				},
			});
		});

		it('should include icons when listing resource templates', async () => {
			const template_icons = create_icons('template-icons');

			server.template(
				{
					name: 'icon-template',
					description: 'A template with icons',
					title: 'Template With Icons',
					uri: 'test://template/{id}',
					icons: template_icons,
				},
				async (uri) => ({
					contents: [{ uri, text: `Content for ${uri}` }],
				}),
			);

			const list_templates = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'resources/templates/list',
			});

			const result = await server.receive(list_templates, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 3,
				result: {
					resourceTemplates: [
						{
							name: 'icon-template',
							title: 'Template With Icons',
							description: 'A template with icons',
							uriTemplate: 'test://template/{id}',
							icons: template_icons,
						},
					],
				},
			});
		});

		it('should include icons returned from template list results', async () => {
			const generated_icons = create_icons('generated-template-resource');

			server.template(
				{
					name: 'list-template-with-icons',
					description: 'Template whose list results include icons',
					title: 'List Template With Icons',
					uri: 'test://template-with-icons/{id}',
					list() {
						return [
							{
								name: 'generated-resource',
								description: 'Generated resource with icons',
								uri: 'test://template-with-icons/generated-resource',
								icons: generated_icons,
							},
						];
					},
				},
				async (uri) => ({
					contents: [{ uri, text: `Generated content for ${uri}` }],
				}),
			);

			const resources_list = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'resources/list',
			});

			const result = await server.receive(resources_list, {
				sessionId: 'session-1',
			});

			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 4,
				result: {
					resources: [
						{
							name: 'generated-resource',
							description: 'Generated resource with icons',
							uri: 'test://template-with-icons/generated-resource',
							icons: generated_icons,
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

		it('should log messages when logging is enabled', async () => {
			const on = vi.fn();
			server.tool(
				{
					name: 'log-test-tool',
					description: 'A tool for log testing',
				},
				() => {
					server.log('info', 'test message', 'test-logger');
					return {
						content: [{ type: 'text', text: 'tool executed' }],
					};
				},
			);
			server.on('send', on, { once: true });

			await server.receive(
				request({
					jsonrpc: '2.0',
					id: 3,
					method: 'tools/call',
					params: {
						name: 'log-test-tool',
					},
				}),
				{ sessionId: 'session-1' },
			);

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
			expect(listener).not.toHaveBeenCalled();

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

			expect(listener).toHaveBeenNthCalledWith(1, {
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

			expect(listener).toHaveBeenNthCalledWith(2, {
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

			expect(listener).toHaveBeenNthCalledWith(3, {
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
					server.elicitation('Message', mock_schema);
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

			expect(listener).toHaveBeenNthCalledWith(4, {
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

			expect(listener).toHaveBeenNthCalledWith(5, {
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

			expect(listener).toHaveBeenNthCalledWith(6, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 2,
					jsonrpc: '2.0',
					method: 'sampling/createMessage',
					params: {
						maxTokens: 1000,
						messages: [],
					},
				},
			});

			expect(listener).toHaveBeenNthCalledWith(7, {
				context: {
					sessions: ['session-1'],
				},
				request: {
					id: 3,
					jsonrpc: '2.0',
					method: 'elicitation/create',
					params: {
						message: 'Message',
						requestedSchema: {
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

				server.tool(
					{
						name: 'log-test-tool',
						description: 'A tool for log testing',
					},
					() => {
						server.log('info', 'This is an info message');
						return {
							content: [{ type: 'text', text: 'tool executed' }],
						};
					},
				);

				const on = vi.fn();
				const off = server.on('send', on);

				await Promise.all([
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 3,
							method: 'tools/call',
							params: {
								name: 'log-test-tool',
							},
						}),
						{ sessionId: 'log-session-1' },
					),
					server.receive(
						request({
							jsonrpc: '2.0',
							id: 3,
							method: 'tools/call',
							params: {
								name: 'log-test-tool',
							},
						}),
						{ sessionId: 'log-session-2' },
					),
				]);

				// only sessions with debug level should receive this
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

	describe('progress functionality', () => {
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

		it('should not send progress notifications when no progress token is present', async () => {
			const on = vi.fn();
			const off = server.on('send', on);

			// Call progress without a progress token
			server.progress(50, 100, 'Processing...');

			// Should not send any notifications
			expect(on).not.toHaveBeenCalled();
			off();
		});

		it('should send progress notifications when progress token is present', async () => {
			// Create a tool that uses progress
			server.tool(
				{
					name: 'progress-tool',
					description: 'A tool that reports progress',
				},
				() => {
					server.progress(25, 100, 'Started processing');
					server.progress(50, 100, 'Half way done');
					server.progress(100, 100, 'Completed');
					return {
						content: [{ type: 'text', text: 'Tool completed' }],
					};
				},
			);

			const on = vi.fn();
			const off = server.on('send', on);

			// Call the tool with a progress token
			const call_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/call',
				params: {
					name: 'progress-tool',
					_meta: {
						progressToken: 'test-progress-token',
					},
				},
			});

			await server.receive(call_request, { sessionId: 'session-1' });

			// Filter only progress notifications
			const progress_calls = on.mock.calls.filter(
				(call) => call[0].request.method === 'notifications/progress',
			);

			expect(progress_calls).toHaveLength(3);

			expect(progress_calls[0][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 25,
						total: 100,
						message: 'Started processing',
						progressToken: 'test-progress-token',
					},
				},
			});

			expect(progress_calls[1][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 50,
						total: 100,
						message: 'Half way done',
						progressToken: 'test-progress-token',
					},
				},
			});

			expect(progress_calls[2][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 100,
						total: 100,
						message: 'Completed',
						progressToken: 'test-progress-token',
					},
				},
			});

			off();
		});

		it('should handle progress with default parameters', async () => {
			const on = vi.fn();
			const off = server.on('send', on);

			// Create a tool that uses progress with defaults
			server.tool(
				{
					name: 'default-progress-tool',
					description: 'A tool that reports progress with defaults',
				},
				() => {
					server.progress(0.5); // Using defaults: total=1, message=undefined
					return {
						content: [{ type: 'text', text: 'Tool completed' }],
					};
				},
			);

			// Call the tool with a progress token
			const call_request = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'tools/call',
				params: {
					name: 'default-progress-tool',
					_meta: {
						progressToken: 'default-token',
					},
				},
			});

			await server.receive(call_request, { sessionId: 'session-1' });

			expect(on).toHaveBeenCalledWith({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 0.5,
						total: 1,
						message: undefined,
						progressToken: 'default-token',
					},
				},
			});

			off();
		});

		it('should handle progress in prompts', async () => {
			// Create a prompt that uses progress
			server.prompt(
				{
					name: 'progress-prompt',
					description: 'A prompt that reports progress',
				},
				() => {
					server.progress(1, 3, 'Analyzing request');
					server.progress(2, 3, 'Generating response');
					server.progress(3, 3, 'Finalizing');
					return {
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Generated prompt',
								},
							},
						],
					};
				},
			);

			const on = vi.fn();
			const off = server.on('send', on);

			// Call the prompt with a progress token
			const prompt_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'prompts/get',
				params: {
					name: 'progress-prompt',
					_meta: {
						progressToken: 'prompt-progress-token',
					},
				},
			});

			await server.receive(prompt_request, { sessionId: 'session-1' });

			// Filter only progress notifications
			const progress_calls = on.mock.calls.filter(
				(call) => call[0].request.method === 'notifications/progress',
			);

			expect(progress_calls).toHaveLength(3);
			expect(progress_calls[0][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 1,
						total: 3,
						message: 'Analyzing request',
						progressToken: 'prompt-progress-token',
					},
				},
			});

			off();
		});

		it('should handle progress in resources', async () => {
			// Create a resource that uses progress
			server.resource(
				{
					name: 'progress-resource',
					description: 'A resource that reports progress',
					uri: 'test://progress-resource',
				},
				() => {
					server.progress(10, 20, 'Loading data');
					server.progress(20, 20, 'Data loaded');
					return {
						contents: [
							{
								uri: 'test://progress-resource',
								text: 'Resource content',
							},
						],
					};
				},
			);

			const on = vi.fn();
			const off = server.on('send', on);

			// Read the resource with a progress token
			const resource_request = request({
				jsonrpc: '2.0',
				id: 5,
				method: 'resources/read',
				params: {
					uri: 'test://progress-resource',
					_meta: {
						progressToken: 'resource-progress-token',
					},
				},
			});

			await server.receive(resource_request, { sessionId: 'session-1' });

			// Filter only progress notifications
			const progress_calls = on.mock.calls.filter(
				(call) => call[0].request.method === 'notifications/progress',
			);

			expect(progress_calls).toHaveLength(2);
			expect(progress_calls[0][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 10,
						total: 20,
						message: 'Loading data',
						progressToken: 'resource-progress-token',
					},
				},
			});

			expect(progress_calls[1][0]).toEqual({
				context: {
					sessions: ['session-1'],
				},
				request: {
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: {
						progress: 20,
						total: 20,
						message: 'Data loaded',
						progressToken: 'resource-progress-token',
					},
				},
			});

			off();
		});

		it('should handle progress across multiple sessions with different tokens', async () => {
			// Initialize a second session
			const init2 = request({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test2', version: '1.0.0' },
				},
			});
			await server.receive(init2, { sessionId: 'session-2' });

			// Create a tool that uses progress
			server.tool(
				{
					name: 'multi-session-progress-tool',
					description: 'A tool for multi-session progress testing',
				},
				() => {
					server.progress(75, 100, 'Processing for current session');
					return {
						content: [{ type: 'text', text: 'Tool completed' }],
					};
				},
			);

			const on = vi.fn();
			const off = server.on('send', on);

			// Call from session 1 and session 2 simultaneously
			await Promise.all([
				server.receive(
					request({
						jsonrpc: '2.0',
						id: 6,
						method: 'tools/call',
						params: {
							name: 'multi-session-progress-tool',
							_meta: {
								progressToken: 'session-1-token',
							},
						},
					}),
					{ sessionId: 'session-1' },
				),
				server.receive(
					request({
						jsonrpc: '2.0',
						id: 6,
						method: 'tools/call',
						params: {
							name: 'multi-session-progress-tool',
							_meta: {
								progressToken: 'session-2-token',
							},
						},
					}),
					{ sessionId: 'session-2' },
				),
			]);

			// Filter only progress notifications
			const progress_calls = on.mock.calls.filter(
				(call) => call[0].request.method === 'notifications/progress',
			);

			expect(progress_calls).toHaveLength(2);

			// Check that each session got its own progress notification with the correct token
			const session_one_call = progress_calls.find((call) =>
				call[0].context.sessions.includes('session-1'),
			);
			const session_two_call = progress_calls.find((call) =>
				call[0].context.sessions.includes('session-2'),
			);

			expect(session_one_call).toBeDefined();
			expect(session_one_call?.[0].request.params.progressToken).toBe(
				'session-1-token',
			);

			expect(session_two_call).toBeDefined();
			expect(session_two_call?.[0].request.params.progressToken).toBe(
				'session-2-token',
			);

			off();
		});
	});

	describe('enabled functionality', () => {
		beforeEach(async () => {
			vi.clearAllMocks();

			await server.receive(
				request({
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: { name: 'test-client', version: '1.0.0' },
					},
				}),
				{ sessionId: 'session-1' },
			);
		});

		describe('tools with enabled function', () => {
			it('should include enabled tools in tools/list when enabled returns true', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(true);

				server.tool(
					{
						name: 'enabled_tool',
						description: 'A tool that is enabled',
						enabled: enabled_mock,
					},
					async () => ({
						content: [{ type: 'text', text: 'Tool executed' }],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.tools).toHaveLength(1);
				expect(result.result.tools[0]).toMatchObject({
					name: 'enabled_tool',
					description: 'A tool that is enabled',
				});
			});

			it('should exclude disabled tools from tools/list when enabled returns false', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(false);

				server.tool(
					{
						name: 'disabled_tool',
						description: 'A tool that is disabled',
						enabled: enabled_mock,
					},
					async () => ({
						content: [{ type: 'text', text: 'Tool executed' }],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.tools).toHaveLength(0);
			});

			it('should include tools without enabled function by default', async () => {
				server.tool(
					{
						name: 'always_enabled_tool',
						description: 'A tool without enabled function',
					},
					async () => ({
						content: [{ type: 'text', text: 'Tool executed' }],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(result.result.tools).toHaveLength(1);
				expect(result.result.tools[0].name).toBe('always_enabled_tool');
			});

			it('should handle mix of enabled and disabled tools', async () => {
				const enabled_mock_true = vi.fn().mockResolvedValue(true);
				const enabled_mock_false = vi.fn().mockResolvedValue(false);

				server.tool(
					{
						name: 'enabled_tool',
						description: 'Enabled tool',
						enabled: enabled_mock_true,
					},
					async () => ({
						content: [
							{ type: 'text', text: 'Enabled tool executed' },
						],
					}),
				);

				server.tool(
					{
						name: 'disabled_tool',
						description: 'Disabled tool',
						enabled: enabled_mock_false,
					},
					async () => ({
						content: [
							{ type: 'text', text: 'Disabled tool executed' },
						],
					}),
				);

				server.tool(
					{
						name: 'always_enabled_tool',
						description: 'Always enabled tool',
					},
					async () => ({
						content: [
							{
								type: 'text',
								text: 'Always enabled tool executed',
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock_true).toHaveBeenCalled();
				expect(enabled_mock_false).toHaveBeenCalled();
				expect(result.result.tools).toHaveLength(2);

				const tool_names = result.result.tools.map(
					/** @param {any} tool */ (tool) => tool.name,
				);
				expect(tool_names).toContain('enabled_tool');
				expect(tool_names).toContain('always_enabled_tool');
				expect(tool_names).not.toContain('disabled_tool');
			});
		});

		describe('prompts with enabled function', () => {
			it('should include enabled prompts in prompts/list when enabled returns true', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(true);

				server.prompt(
					{
						name: 'enabled_prompt',
						description: 'A prompt that is enabled',
						enabled: enabled_mock,
					},
					async () => ({
						description: 'Enabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Enabled prompt content',
								},
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'prompts/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.prompts).toHaveLength(1);
				expect(result.result.prompts[0]).toMatchObject({
					name: 'enabled_prompt',
					description: 'A prompt that is enabled',
				});
			});

			it('should exclude disabled prompts from prompts/list when enabled returns false', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(false);

				server.prompt(
					{
						name: 'disabled_prompt',
						description: 'A prompt that is disabled',
						enabled: enabled_mock,
					},
					async () => ({
						description: 'Disabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Disabled prompt content',
								},
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'prompts/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.prompts).toHaveLength(0);
			});

			it('should include prompts without enabled function by default', async () => {
				server.prompt(
					{
						name: 'always_enabled_prompt',
						description: 'A prompt without enabled function',
					},
					async () => ({
						description: 'Always enabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Always enabled prompt content',
								},
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'prompts/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(result.result.prompts).toHaveLength(1);
				expect(result.result.prompts[0].name).toBe(
					'always_enabled_prompt',
				);
			});

			it('should handle mix of enabled and disabled prompts', async () => {
				const enabled_mock_true = vi.fn().mockResolvedValue(true);
				const enabled_mock_false = vi.fn().mockResolvedValue(false);

				server.prompt(
					{
						name: 'enabled_prompt',
						description: 'Enabled prompt',
						enabled: enabled_mock_true,
					},
					async () => ({
						description: 'Enabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Enabled prompt content',
								},
							},
						],
					}),
				);

				server.prompt(
					{
						name: 'disabled_prompt',
						description: 'Disabled prompt',
						enabled: enabled_mock_false,
					},
					async () => ({
						description: 'Disabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Disabled prompt content',
								},
							},
						],
					}),
				);

				server.prompt(
					{
						name: 'always_enabled_prompt',
						description: 'Always enabled prompt',
					},
					async () => ({
						description: 'Always enabled prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Always enabled prompt content',
								},
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'prompts/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock_true).toHaveBeenCalled();
				expect(enabled_mock_false).toHaveBeenCalled();
				expect(result.result.prompts).toHaveLength(2);

				const prompt_names = result.result.prompts.map(
					/** @param {any} prompt */ (prompt) => prompt.name,
				);
				expect(prompt_names).toContain('enabled_prompt');
				expect(prompt_names).toContain('always_enabled_prompt');
				expect(prompt_names).not.toContain('disabled_prompt');
			});
		});

		describe('resources with enabled function', () => {
			it('should include enabled resources in resources/list when enabled returns true', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(true);

				// Now that the bug is fixed, the enabled parameter should work correctly
				server.resource(
					{
						name: 'enabled_resource',
						description: 'A resource that is enabled',
						uri: 'test://enabled-resource',
						enabled: enabled_mock,
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.resources).toHaveLength(1);
				expect(result.result.resources[0]).toMatchObject({
					name: 'enabled_resource',
					description: 'A resource that is enabled',
					uri: 'test://enabled-resource',
				});
			});

			it('should exclude disabled resources when enabled returns false', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(false);

				// Now that the bug is fixed, this should work correctly
				server.resource(
					{
						name: 'disabled_resource',
						description: 'A resource that is disabled',
						uri: 'test://disabled-resource',
						enabled: enabled_mock,
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.resources).toHaveLength(0);
			});

			it('should include resources without enabled function by default', async () => {
				server.resource(
					{
						name: 'always_enabled_resource',
						description: 'A resource without enabled function',
						uri: 'test://always-enabled-resource',
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(result.result.resources).toHaveLength(1);
				expect(result.result.resources[0].name).toBe(
					'always_enabled_resource',
				);
			});

			it('should handle mix of enabled and disabled resources', async () => {
				const enabled_mock_true = vi.fn().mockResolvedValue(true);
				const enabled_mock_false = vi.fn().mockResolvedValue(false);

				server.resource(
					{
						name: 'enabled_resource',
						description: 'Enabled resource',
						uri: 'test://enabled-resource',
						enabled: enabled_mock_true,
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				server.resource(
					{
						name: 'disabled_resource',
						description: 'Disabled resource',
						uri: 'test://disabled-resource',
						enabled: enabled_mock_false,
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				server.resource(
					{
						name: 'always_enabled_resource',
						description: 'Always enabled resource',
						uri: 'test://always-enabled-resource',
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock_true).toHaveBeenCalled();
				expect(enabled_mock_false).toHaveBeenCalled();
				expect(result.result.resources).toHaveLength(2);

				const resource_names = result.result.resources.map(
					/** @param {any} resource */ (resource) => resource.name,
				);
				expect(resource_names).toContain('enabled_resource');
				expect(resource_names).toContain('always_enabled_resource');
				expect(resource_names).not.toContain('disabled_resource');
			});
		});

		describe('templates with enabled function', () => {
			it('should include enabled templates in resources/list when enabled returns true', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(true);

				server.template(
					{
						name: 'enabled_template',
						description: 'A template that is enabled',
						uri: 'test://template/{id}',
						enabled: enabled_mock,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/templates/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.resourceTemplates).toHaveLength(1);
				expect(result.result.resourceTemplates[0]).toMatchObject({
					name: 'enabled_template',
					description: 'A template that is enabled',
					uriTemplate: 'test://template/{id}',
				});
			});

			it('should exclude disabled templates from resources/templates/list when enabled returns false', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(false);

				server.template(
					{
						name: 'disabled_template',
						description: 'A template that is disabled',
						uri: 'test://disabled-template/{id}',
						enabled: enabled_mock,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/templates/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(result.result.resourceTemplates).toHaveLength(0);
			});

			it('should handle enabled templates with list method', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(true);
				const list_mock = vi.fn().mockResolvedValue([
					{
						name: 'Generated Resource 1',
						description: 'A generated resource',
						uri: 'test://template/resource1',
					},
					{
						name: 'Generated Resource 2',
						description: 'Another generated resource',
						uri: 'test://template/resource2',
					},
				]);

				server.template(
					{
						name: 'enabled_template_with_list',
						description:
							'A template with list method that is enabled',
						uri: 'test://template-with-list/{id}',
						enabled: enabled_mock,
						list: list_mock,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(list_mock).toHaveBeenCalled();
				expect(result.result.resources).toHaveLength(2);
				expect(result.result.resources[0].name).toBe(
					'Generated Resource 1',
				);
				expect(result.result.resources[1].name).toBe(
					'Generated Resource 2',
				);
			});

			it('should exclude disabled templates with list method', async () => {
				const enabled_mock = vi.fn().mockResolvedValue(false);
				const list_mock = vi.fn().mockResolvedValue([
					{
						name: 'Generated Resource 1',
						description: 'A generated resource',
						uri: 'test://template/resource1',
					},
				]);

				server.template(
					{
						name: 'disabled_template_with_list',
						description:
							'A template with list method that is disabled',
						uri: 'test://disabled-template-with-list/{id}',
						enabled: enabled_mock,
						list: list_mock,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock).toHaveBeenCalled();
				expect(list_mock).not.toHaveBeenCalled(); // Should not call list if disabled
				expect(result.result.resources).toHaveLength(0);
			});

			it('should include templates without enabled function by default', async () => {
				server.template(
					{
						name: 'always_enabled_template',
						description: 'A template without enabled function',
						uri: 'test://always-enabled-template/{id}',
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/templates/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(result.result.resourceTemplates).toHaveLength(1);
				expect(result.result.resourceTemplates[0].name).toBe(
					'always_enabled_template',
				);
			});

			it('should handle mix of enabled and disabled templates with list method in resources/list', async () => {
				const enabled_mock_true = vi.fn().mockResolvedValue(true);
				const enabled_mock_false = vi.fn().mockResolvedValue(false);
				const list_mock_enabled = vi.fn().mockResolvedValue([
					{
						name: 'Generated Resource 1',
						description:
							'A generated resource from enabled template',
						uri: 'test://enabled-template/resource1',
					},
				]);
				const list_mock_disabled = vi.fn().mockResolvedValue([
					{
						name: 'Generated Resource 2',
						description:
							'A generated resource from disabled template',
						uri: 'test://disabled-template/resource2',
					},
				]);
				const list_mock_always = vi.fn().mockResolvedValue([
					{
						name: 'Generated Resource 3',
						description:
							'A generated resource from always enabled template',
						uri: 'test://always-enabled-template/resource3',
					},
				]);

				server.template(
					{
						name: 'enabled_template',
						description: 'Enabled template',
						uri: 'test://enabled-template/{id}',
						enabled: enabled_mock_true,
						list: list_mock_enabled,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				server.template(
					{
						name: 'disabled_template',
						description: 'Disabled template',
						uri: 'test://disabled-template/{id}',
						enabled: enabled_mock_false,
						list: list_mock_disabled,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				server.template(
					{
						name: 'always_enabled_template',
						description: 'Always enabled template',
						uri: 'test://always-enabled-template/{id}',
						list: list_mock_always,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock_true).toHaveBeenCalled();
				expect(enabled_mock_false).toHaveBeenCalled();
				// Only enabled and always-enabled templates should have their list methods called
				expect(list_mock_enabled).toHaveBeenCalled();
				expect(list_mock_disabled).not.toHaveBeenCalled(); // Should not be called due to enabled=false
				expect(list_mock_always).toHaveBeenCalled();

				expect(result.result.resources).toHaveLength(2);

				const resource_names = result.result.resources.map(
					/** @param {any} resource */ (resource) => resource.name,
				);
				expect(resource_names).toContain('Generated Resource 1'); // From enabled template
				expect(resource_names).toContain('Generated Resource 3'); // From always enabled template
				expect(resource_names).not.toContain('Generated Resource 2'); // From disabled template
			});

			it('should handle mix of enabled and disabled templates in resources/templates/list', async () => {
				const enabled_mock_true = vi.fn().mockResolvedValue(true);
				const enabled_mock_false = vi.fn().mockResolvedValue(false);

				server.template(
					{
						name: 'enabled_template',
						description: 'Enabled template',
						uri: 'test://enabled-template/{id}',
						enabled: enabled_mock_true,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				server.template(
					{
						name: 'disabled_template',
						description: 'Disabled template',
						uri: 'test://disabled-template/{id}',
						enabled: enabled_mock_false,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				server.template(
					{
						name: 'always_enabled_template',
						description: 'Always enabled template',
						uri: 'test://always-enabled-template/{id}',
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				const result = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/templates/list',
					}),
					{ sessionId: 'session-1' },
				);

				expect(enabled_mock_true).toHaveBeenCalled();
				expect(enabled_mock_false).toHaveBeenCalled();
				expect(result.result.resourceTemplates).toHaveLength(2);

				const template_names = result.result.resourceTemplates.map(
					/** @param {any} template */ (template) => template.name,
				);
				expect(template_names).toContain('enabled_template');
				expect(template_names).toContain('always_enabled_template');
				expect(template_names).not.toContain('disabled_template');
			});
		});

		describe('error handling in enabled functions', () => {
			it('should treat tools as disabled when enabled function throws error', async () => {
				const enabled_mock = vi
					.fn()
					.mockRejectedValue(new Error('Enabled check failed'));

				server.tool(
					{
						name: 'error_tool',
						description: 'A tool with failing enabled function',
						enabled: enabled_mock,
					},
					async () => ({
						content: [{ type: 'text', text: 'Tool executed' }],
					}),
				);

				// Add a working tool to verify the list still works
				server.tool(
					{
						name: 'working_tool',
						description: 'A working tool',
					},
					async () => ({
						content: [
							{ type: 'text', text: 'Working tool executed' },
						],
					}),
				);

				// When enabled function throws, tool should be treated as disabled
				const response = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
					{ sessionId: 'session-1' },
				);

				// Response should be successful, but the erroring tool should not be included
				expect(response.error).toBeUndefined();
				expect(response.result.tools).toHaveLength(1);
				expect(response.result.tools[0].name).toBe('working_tool');
				expect(enabled_mock).toHaveBeenCalled();
			});

			it('should treat prompts as disabled when enabled function throws error', async () => {
				const enabled_mock = vi
					.fn()
					.mockRejectedValue(new Error('Enabled check failed'));

				server.prompt(
					{
						name: 'error_prompt',
						description: 'A prompt with failing enabled function',
						enabled: enabled_mock,
					},
					async () => ({
						description: 'Error prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Error prompt content',
								},
							},
						],
					}),
				);

				// Add a working prompt to verify the list still works
				server.prompt(
					{
						name: 'working_prompt',
						description: 'A working prompt',
					},
					async () => ({
						description: 'Working prompt response',
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Working prompt content',
								},
							},
						],
					}),
				);

				// When enabled function throws, prompt should be treated as disabled
				const response = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'prompts/list',
					}),
					{ sessionId: 'session-1' },
				);

				// Response should be successful, but the erroring prompt should not be included
				expect(response.error).toBeUndefined();
				expect(response.result.prompts).toHaveLength(1);
				expect(response.result.prompts[0].name).toBe('working_prompt');
				expect(enabled_mock).toHaveBeenCalled();
			});

			it('should treat resources as disabled when enabled function throws error', async () => {
				const enabled_mock = vi
					.fn()
					.mockRejectedValue(new Error('Enabled check failed'));

				server.resource(
					{
						name: 'error_resource',
						description: 'A resource with failing enabled function',
						uri: 'test://error-resource',
						enabled: enabled_mock,
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				// Add a working resource to verify the list still works
				server.resource(
					{
						name: 'working_resource',
						description: 'A working resource',
						uri: 'test://working-resource',
					},
					async (uri) => ({
						contents: [
							{
								uri: uri,
								text: `Content for ${uri}`,
							},
						],
					}),
				);

				// When enabled function throws, resource should be treated as disabled
				const response = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/list',
					}),
					{ sessionId: 'session-1' },
				);

				// Response should be successful, but the erroring resource should not be included
				expect(response.error).toBeUndefined();
				expect(response.result.resources).toHaveLength(1);
				expect(response.result.resources[0].name).toBe(
					'working_resource',
				);
				expect(enabled_mock).toHaveBeenCalled();
			});

			it('should treat templates as disabled when enabled function throws error', async () => {
				const enabled_mock = vi
					.fn()
					.mockRejectedValue(new Error('Enabled check failed'));

				server.template(
					{
						name: 'error_template',
						description: 'A template with failing enabled function',
						uri: 'test://error-template/{id}',
						enabled: enabled_mock,
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				// Add a working template to verify the list still works
				server.template(
					{
						name: 'working_template',
						description: 'A working template',
						uri: 'test://working-template/{id}',
					},
					async (uri, params) => ({
						contents: [
							{
								uri: uri,
								text: `Template content for ${uri} with params ${JSON.stringify(params)}`,
							},
						],
					}),
				);

				// When enabled function throws, template should be treated as disabled
				const response = await server.receive(
					request({
						jsonrpc: '2.0',
						id: 2,
						method: 'resources/templates/list',
					}),
					{ sessionId: 'session-1' },
				);

				// Response should be successful, but the erroring template should not be included
				expect(response.error).toBeUndefined();
				expect(response.result.resourceTemplates).toHaveLength(1);
				expect(response.result.resourceTemplates[0].name).toBe(
					'working_template',
				);
				expect(enabled_mock).toHaveBeenCalled();
			});
		});
	});

	describe('custom context functionality', () => {
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

		it('should make custom context available via ctx.custom', async () => {
			let captured_context;
			const tool = vi.fn().mockImplementation(() => {
				captured_context = server.ctx;
				return {
					content: [{ type: 'text', text: 'tool executed' }],
				};
			});

			server.tool(
				{
					name: 'context-test-tool',
					description: 'A tool that captures context',
				},
				tool,
			);

			const call_request = request({
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/call',
				params: {
					name: 'context-test-tool',
				},
			});

			const custom_context = {
				user_id: '12345',
				request_source: 'web-app',
				metadata: { timestamp: Date.now() },
			};

			await server.receive(call_request, {
				sessionId: 'session-1',
				custom: custom_context,
			});

			expect(captured_context).toEqual({
				sessionId: 'session-1',
				custom: custom_context,
			});
		});

		it('should handle custom context in prompts', async () => {
			let captured_context;
			const prompt = vi.fn().mockImplementation(() => {
				captured_context = server.ctx;
				return {
					messages: [
						{
							role: 'user',
							content: { type: 'text', text: 'prompt result' },
						},
					],
				};
			});

			server.prompt(
				{
					name: 'context-test-prompt',
					description: 'A prompt that captures context',
				},
				prompt,
			);

			const get_request = request({
				jsonrpc: '2.0',
				id: 3,
				method: 'prompts/get',
				params: {
					name: 'context-test-prompt',
				},
			});

			const custom_context = {
				organization: 'acme-corp',
				environment: 'production',
			};

			await server.receive(get_request, {
				sessionId: 'session-1',
				custom: custom_context,
			});

			expect(captured_context).toEqual({
				sessionId: 'session-1',
				custom: custom_context,
			});
		});

		it('should handle custom context in resources', async () => {
			let captured_context;
			const resource = vi.fn().mockImplementation(() => {
				captured_context = server.ctx;
				return {
					contents: [
						{ uri: 'test://resource', text: 'resource content' },
					],
				};
			});

			server.resource(
				{
					name: 'context-test-resource',
					description: 'A resource that captures context',
					uri: 'test://context-resource',
				},
				resource,
			);

			const read_request = request({
				jsonrpc: '2.0',
				id: 4,
				method: 'resources/read',
				params: {
					uri: 'test://context-resource',
				},
			});

			const custom_context = {
				tenant_id: 'tenant-123',
				permissions: ['read', 'write'],
			};

			await server.receive(read_request, {
				sessionId: 'session-1',
				custom: custom_context,
			});

			expect(captured_context).toEqual({
				sessionId: 'session-1',
				custom: custom_context,
			});
		});
	});
});
