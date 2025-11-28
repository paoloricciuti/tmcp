import { describe, it, expect } from 'vitest';
import { McpServer } from 'tmcp';
import { InMemoryTransport } from '../src/index.js';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import * as v from 'valibot';

const adapter = new ValibotJsonSchemaAdapter();

const server_config = {
	name: 'test-server',
	version: '1.0.0',
	description: 'A test server',
};

const client_info = {
	name: 'test-client',
	version: '1.0.0',
};

describe('InMemoryTransport', () => {
	describe('initialize', () => {
		it('should initialize the server and return capabilities', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {
						listChanged: true,
					},
					prompts: {
						listChanged: true,
					},
					resources: {
						listChanged: true,
						subscribe: true,
					},
				},
			});

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			// initialize a session
			const session = transport.session();

			// execute the method
			const result = await session.initialize(
				'2025-06-18',
				{},
				client_info,
			);

			expect(result).toMatchObject({
				protocolVersion: '2025-06-18',
				serverInfo: server_config,
				capabilities: {
					tools: {
						listChanged: true,
					},
					prompts: {
						listChanged: true,
					},
					resources: {
						listChanged: true,
						subscribe: true,
					},
				},
			});

			// verify session info was updated
			expect(session.sessionInfo).toMatchObject({
				clientCapabilities: {},
				clientInfo: client_info,
			});
		});
	});

	describe('ping', () => {
		it('should respond to ping requests', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
			});

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			// initialize a session
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.ping();

			expect(result).toEqual({});
		});
	});

	describe('listTools', () => {
		it('should return the correct list of tools', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {
						listChanged: true,
					},
				},
			});

			// register the right set of tools
			server.tool(
				{
					name: 'test_tool',
					description: 'A test tool',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'Test tool executed' }],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			// initialize a session
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const tools_list = await session.listTools();

			expect(tools_list.tools).toHaveLength(1);
			expect(tools_list.tools[0]).toMatchObject({
				description: 'A test tool',
				inputSchema: {
					properties: {},
					type: 'object',
				},
				name: 'test_tool',
				title: 'A test tool',
			});
		});

		it('should return multiple tools', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {
						listChanged: true,
					},
				},
			});

			// register multiple tools
			server.tool(
				{
					name: 'tool_one',
					description: 'First tool',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'Tool one executed' }],
					};
				},
			);

			server.tool(
				{
					name: 'tool_two',
					description: 'Second tool',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'Tool two executed' }],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const tools_list = await session.listTools();

			expect(tools_list.tools).toHaveLength(2);
			expect(tools_list.tools.map((t) => t.name)).toEqual([
				'tool_one',
				'tool_two',
			]);
		});
	});

	describe('callTool', () => {
		it('should execute a tool and return the result', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {
						listChanged: true,
					},
				},
			});

			// register a tool with schema
			server.tool(
				{
					name: 'echo_tool',
					description: 'Echoes the input',
					schema: v.object({
						message: v.string(),
					}),
				},
				(params) => {
					return {
						content: [
							{ type: 'text', text: `Echo: ${params.message}` },
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.callTool('echo_tool', {
				message: 'Hello, world!',
			});

			expect(result).toEqual({
				content: [{ type: 'text', text: 'Echo: Hello, world!' }],
			});
		});

		it('should handle tools without arguments', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {},
				},
			});

			// register a tool without arguments
			server.tool(
				{
					name: 'no_args_tool',
					description: 'Tool without arguments',
				},
				() => {
					return {
						content: [{ type: 'text', text: 'Executed' }],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.callTool('no_args_tool');

			expect(result).toEqual({
				content: [{ type: 'text', text: 'Executed' }],
			});
		});
	});

	describe('listPrompts', () => {
		it('should return the correct list of prompts', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					prompts: {
						listChanged: true,
					},
				},
			});

			// register a prompt
			server.prompt(
				{
					name: 'test_prompt',
					description: 'A test prompt',
				},
				() => {
					return {
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Test prompt message',
								},
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const prompts_list = await session.listPrompts();

			expect(prompts_list.prompts).toHaveLength(1);
			expect(prompts_list.prompts[0]).toMatchObject({
				description: 'A test prompt',
				name: 'test_prompt',
				title: 'A test prompt',
				arguments: [],
			});
		});

		it('should return multiple prompts', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					prompts: {
						listChanged: true,
					},
				},
			});

			// register multiple prompts
			server.prompt(
				{
					name: 'prompt_one',
					description: 'First prompt',
				},
				() => {
					return {
						messages: [
							{
								role: 'user',
								content: { type: 'text', text: 'First' },
							},
						],
					};
				},
			);

			server.prompt(
				{
					name: 'prompt_two',
					description: 'Second prompt',
				},
				() => {
					return {
						messages: [
							{
								role: 'user',
								content: { type: 'text', text: 'Second' },
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const prompts_list = await session.listPrompts();

			expect(prompts_list.prompts).toHaveLength(2);
			expect(prompts_list.prompts.map((p) => p.name)).toEqual([
				'prompt_one',
				'prompt_two',
			]);
		});
	});

	describe('getPrompt', () => {
		it('should retrieve a prompt with its messages', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					prompts: {},
				},
			});

			// register a prompt with arguments
			server.prompt(
				{
					name: 'greeting_prompt',
					description: 'A greeting prompt',
					schema: v.object({
						name: v.string(),
					}),
				},
				(params: { name: string }) => {
					return {
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: `Hello, ${params.name}!`,
								},
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.getPrompt('greeting_prompt', {
				name: 'Alice',
			});

			expect(result).toEqual({
				messages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Hello, Alice!' },
					},
				],
			});
		});

		it('should handle prompts without arguments', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					prompts: {},
				},
			});

			// register a prompt without arguments
			server.prompt(
				{
					name: 'static_prompt',
					description: 'A static prompt',
				},
				() => {
					return {
						messages: [
							{
								role: 'user',
								content: {
									type: 'text',
									text: 'Static message',
								},
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.getPrompt('static_prompt');

			expect(result).toEqual({
				messages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Static message' },
					},
				],
			});
		});
	});

	describe('listResources', () => {
		it('should return the correct list of resources', async () => {
			// initialize server with the right capabilities
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						listChanged: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://resource',
					name: 'Test Resource',
					description: 'A test resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Resource content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const resources_list = await session.listResources();

			expect(resources_list.resources).toHaveLength(1);
			expect(resources_list.resources[0]).toMatchObject({
				description: 'A test resource',
				name: 'Test Resource',
				uri: 'test://resource',
			});
		});

		it('should return multiple resources', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register multiple resources
			server.resource(
				{
					uri: 'test://resource1',
					name: 'Resource 1',
					description: 'First resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content 1',
							},
						],
					};
				},
			);

			server.resource(
				{
					uri: 'test://resource2',
					name: 'Resource 2',
					description: 'Second resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content 2',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const resources_list = await session.listResources();

			expect(resources_list.resources).toHaveLength(2);
			expect(resources_list.resources.map((r) => r.name)).toEqual([
				'Resource 1',
				'Resource 2',
			]);
		});
	});

	describe('listResourceTemplates', () => {
		it('should return the correct list of resource templates', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register a resource template
			server.template(
				{
					uri: 'test://template/{id}',
					name: 'Test Template',
					description: 'A test resource template',
				},
				(uri: string, params) => {
					return {
						contents: [
							{
								uri,
								text: `Template content for ${params.id}`,
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const templates_list = await session.listResourceTemplates();

			expect(templates_list.resourceTemplates).toHaveLength(1);
			expect(templates_list.resourceTemplates[0]).toMatchObject({
				description: 'A test resource template',
				name: 'Test Template',
				uriTemplate: 'test://template/{id}',
			});
		});

		it('should return multiple resource templates', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register multiple templates
			server.template(
				{
					uri: 'test://template1/{id}',
					name: 'Template 1',
					description: 'First template',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content 1',
							},
						],
					};
				},
			);

			server.template(
				{
					uri: 'test://template2/{id}',
					name: 'Template 2',
					description: 'Second template',
				},
				(uri, params) => {
					return {
						contents: [
							{
								uri,
								text: 'Content 2',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const templates_list = await session.listResourceTemplates();

			expect(templates_list.resourceTemplates).toHaveLength(2);
			expect(templates_list.resourceTemplates.map((t) => t.name)).toEqual(
				['Template 1', 'Template 2'],
			);
		});
	});

	describe('readResource', () => {
		it('should read a static resource', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://static-resource',
					name: 'Static Resource',
					description: 'A static resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Static content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.readResource('test://static-resource');

			expect(result).toEqual({
				contents: [
					{
						uri: 'test://static-resource',
						text: 'Static content',
					},
				],
			});
		});

		it('should read a templated resource', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register a resource template
			server.template(
				{
					uri: 'test://users/{userId}',
					name: 'User Resource',
					description: 'User resource',
				},
				(uri: string, params) => {
					return {
						contents: [
							{
								uri,
								text: `User data for ${params.userId}`,
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.readResource('test://users/123');

			expect(result).toEqual({
				contents: [
					{
						uri: 'test://users/123',
						text: 'User data for 123',
					},
				],
			});
		});
	});

	describe('subscribeResource', () => {
		it('should subscribe to resource updates', async () => {
			// initialize server with subscribe capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://subscribable',
					name: 'Subscribable Resource',
					description: 'A subscribable resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.subscribeResource(
				'test://subscribable',
			);

			expect(result).toEqual({});

			// verify the subscription was recorded
			expect(session.subscriptions.resource).toContain(
				'test://subscribable',
			);
		});

		it('should unsubscribe from resource updates', async () => {
			// initialize server with subscribe capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://subscribable',
					name: 'Subscribable Resource',
					description: 'A subscribable resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe first
			await session.subscribeResource('test://subscribable');

			// verify the subscription was recorded
			expect(session.subscriptions.resource).toContain(
				'test://subscribable',
			);

			// now unsubscribe
			const result = await session.unsubscribeResource(
				'test://subscribable',
			);

			expect(result).toEqual({});

			// verify the subscription was removed
			expect(session.subscriptions.resource).not.toContain(
				'test://subscribable',
			);
		});

		it('should stop receiving broadcasts after unsubscribe', async () => {
			// initialize server with subscribe capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
						listChanged: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://broadcast',
					name: 'Broadcast Resource',
					description: 'Broadcast resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe to resource
			await session.subscribeResource('test://broadcast');

			// trigger a broadcast
			server.changed('resource', 'test://broadcast');

			// check broadcast messages
			expect(session.broadcastMessages).toHaveLength(1);
			expect(session.broadcastMessages[0].method).toBe(
				'notifications/resources/updated',
			);

			// clear messages
			session.clear();

			// unsubscribe
			await session.unsubscribeResource('test://broadcast');

			// trigger another broadcast
			server.changed('resource', 'test://broadcast');

			// verify no new broadcasts were received
			expect(session.broadcastMessages).toHaveLength(0);
		});

		it('should handle unsubscribing from non-subscribed resource', async () => {
			// initialize server with subscribe capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://never-subscribed',
					name: 'Never Subscribed Resource',
					description: 'A resource that was never subscribed',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// verify no subscriptions initially
			expect(session.subscriptions.resource).toHaveLength(0);

			// unsubscribe without subscribing first
			const result = await session.unsubscribeResource(
				'test://never-subscribed',
			);

			expect(result).toEqual({});

			// verify still no subscriptions
			expect(session.subscriptions.resource).toHaveLength(0);
		});

		it('should handle multiple subscriptions and selective unsubscribe', async () => {
			// initialize server with subscribe capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
					},
				},
			});

			// register multiple resources
			server.resource(
				{
					uri: 'test://resource1',
					name: 'Resource 1',
					description: 'First resource',
				},
				(uri) => {
					return {
						contents: [{ uri, text: 'Content 1' }],
					};
				},
			);

			server.resource(
				{
					uri: 'test://resource2',
					name: 'Resource 2',
					description: 'Second resource',
				},
				(uri) => {
					return {
						contents: [{ uri, text: 'Content 2' }],
					};
				},
			);

			server.resource(
				{
					uri: 'test://resource3',
					name: 'Resource 3',
					description: 'Third resource',
				},
				(uri) => {
					return {
						contents: [{ uri, text: 'Content 3' }],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe to all three resources
			await session.subscribeResource('test://resource1');
			await session.subscribeResource('test://resource2');
			await session.subscribeResource('test://resource3');

			// verify all subscriptions
			expect(session.subscriptions.resource).toHaveLength(3);
			expect(session.subscriptions.resource).toEqual([
				'test://resource1',
				'test://resource2',
				'test://resource3',
			]);

			// unsubscribe from the middle one
			await session.unsubscribeResource('test://resource2');

			// verify only resource2 was removed
			expect(session.subscriptions.resource).toHaveLength(2);
			expect(session.subscriptions.resource).toEqual([
				'test://resource1',
				'test://resource3',
			]);
			expect(session.subscriptions.resource).not.toContain(
				'test://resource2',
			);
		});
	});

	describe('complete', () => {
		it('should provide completion for prompt arguments', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					prompts: {},
				},
			});

			// register a prompt with completion
			server.prompt(
				{
					name: 'autocomplete_prompt',
					description: 'Prompt with autocomplete',
					schema: v.object({
						city: v.string(),
					}),
					complete: {
						city: (value: string) => {
							const cities = [
								'New York',
								'London',
								'Tokyo',
								'Paris',
							];
							return {
								completion: {
									values: cities.filter((c) =>
										c
											.toLowerCase()
											.startsWith(value.toLowerCase()),
									),
								},
							};
						},
					},
				},
				() => {
					return {
						messages: [
							{
								role: 'user',
								content: { type: 'text', text: 'Message' },
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.complete(
				{ type: 'ref/prompt', name: 'autocomplete_prompt' },
				{ name: 'city', value: 'New' },
			);

			expect(result).toEqual({
				completion: {
					values: ['New York'],
				},
			});
		});

		it('should provide completion for resource arguments', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {},
				},
			});

			// register a resource template with completion
			server.template(
				{
					uri: 'test://files/{filename}',
					name: 'File Resource',
					description: 'File resource',
					complete: {
						filename: (value: string) => {
							const files = [
								'index.js',
								'index.ts',
								'app.js',
								'app.ts',
							];
							return {
								completion: {
									values: files.filter((f) =>
										f
											.toLowerCase()
											.startsWith(value.toLowerCase()),
									),
								},
							};
						},
					},
				},
				(uri, params) => {
					return {
						contents: [
							{
								uri,
								text: 'File content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.complete(
				{ type: 'ref/resource', uri: 'test://files/{filename}' },
				{ name: 'filename', value: 'index' },
			);

			expect(result).toEqual({
				completion: {
					values: ['index.js', 'index.ts'],
				},
			});
		});
	});

	describe('setLogLevel', () => {
		it('should set the logging level', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					logging: {},
				},
			});

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// execute the method
			const result = await session.setLogLevel('debug');

			expect(result).toEqual({});

			// verify the log level was set in session info
			expect(session.sessionInfo.logLevel).toBe('debug');
		});
	});

	describe('session management', () => {
		it('should track sent messages per session', async () => {
			// initialize server with logging capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {},
					logging: {},
				},
			});

			server.tool(
				{
					name: 'log_tool',
					description: 'Tool that logs a message',
				},
				() => {
					server.log('info', 'Log tool executed');
					return { content: [{ type: 'text', text: 'Logged' }] };
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// check sent messages
			expect(session.sentMessages).toEqual([]);

			await session.callTool('log_tool');

			// check sent messages again
			expect(session.sentMessages).toHaveLength(1);
			expect(session.sentMessages[0].method).toBe(
				'notifications/message',
			);
		});

		it('should track broadcast messages per session', async () => {
			// initialize server with resource subscription
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
						listChanged: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://broadcast',
					name: 'Broadcast Resource',
					description: 'Broadcast resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe to resource
			await session.subscribeResource('test://broadcast');

			// trigger a broadcast
			server.changed('resource', 'test://broadcast');

			// check broadcast messages
			expect(session.broadcastMessages).toHaveLength(1);
			expect(session.broadcastMessages[0].method).toBe(
				'notifications/resources/updated',
			);
		});

		it('should clear session messages', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
						listChanged: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://clear',
					name: 'Clear Resource',
					description: 'Clear resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe and trigger broadcast
			await session.subscribeResource('test://clear');
			server.changed('resource', 'test://clear');

			// verify there are messages
			expect(session.broadcastMessages.length).toBeGreaterThan(0);

			// clear messages
			session.clear();

			// verify messages are cleared
			expect(session.sentMessages).toEqual([]);
			expect(session.broadcastMessages).toEqual([]);
		});

		it('should close session and clean up', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
			});

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session('test-session-id');

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// close session
			session.close();

			// verify session can't be used anymore (accessing a closed session should create a new one)
			const new_session = transport.session('test-session-id');
			expect(new_session.sessionInfo).toEqual({});
		});

		it('should support multiple independent sessions', async () => {
			// initialize server with logging capability
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {},
					logging: {},
				},
			});

			server.tool(
				{
					name: 'log_tool',
					description: 'Tool that logs a message',
				},
				() => {
					server.log('info', 'Log tool executed');
					return { content: [{ type: 'text', text: 'Logged' }] };
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();
			const session_two = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);
			await session_two.initialize('2025-06-18', {}, client_info);

			// check sent messages
			expect(session.sentMessages).toEqual([]);
			expect(session_two.sentMessages).toEqual([]);

			await session_two.setLogLevel('emergency');

			await session.callTool('log_tool');
			await session_two.callTool('log_tool');

			// check sent messages again
			expect(session.sentMessages).toHaveLength(1);
			expect(session.sentMessages[0].method).toBe(
				'notifications/message',
			);

			// verify that session_two has no messages since has a different log level
			expect(session_two.sentMessages).toEqual([]);
		});
	});

	describe('response', () => {
		it('should send a response to a server request', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {},
				},
			});

			server.tool(
				{
					name: 'response_tool',
					description: 'Tool that requires a response',
				},
				async () => {
					// simulate a server request that needs a response
					const response = await server.elicitation(
						'send a response',
						v.object({ name: v.string() }),
					);

					return {
						content: [
							{
								type: 'text',
								text: `Response received: ${JSON.stringify(response)}`,
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize(
				'2025-06-18',
				{
					elicitation: {},
				},
				client_info,
			);

			const tool_call = session.callTool('response_tool');
			let tool_call_response:
				| Awaited<ReturnType<typeof session.callTool>>
				| undefined;

			// await a tick to ensure the tool call is processed and request is sent
			await Promise.resolve();

			if (session.lastRequest?.id) {
				await session.response(session.lastRequest.id, {
					action: 'accept',
					content: { name: 'Test User' },
				});
				tool_call_response = await tool_call;
			}

			expect(tool_call_response).toEqual({
				content: [
					{
						type: 'text',
						text: 'Response received: {"action":"accept","content":{"name":"Test User"}}',
					},
				],
			});
		});
	});

	describe('custom context', () => {
		it('should pass custom context to server methods', async () => {
			// initialize server
			let server = new McpServer<any, { userId: string }>(server_config, {
				adapter,
				capabilities: {
					tools: {},
				},
			});

			let captured_context: { userId: string } | undefined;

			// register a tool that uses custom context
			server.tool(
				{
					name: 'context_tool',
					description: 'Tool that uses custom context',
				},
				() => {
					captured_context = server.ctx.custom;
					return {
						content: [
							{
								type: 'text',
								text: `User ID: ${server.ctx.custom?.userId}`,
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport<{ userId: string }>(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// call tool with custom context
			await session.callTool('context_tool', {}, { userId: 'user-123' });

			expect(captured_context).toEqual({ userId: 'user-123' });
		});
	});

	describe('sessionInfo and subscriptions getters', () => {
		it('should return a copy of sessionInfo', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
			});

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// get session info
			const info1 = session.sessionInfo;
			const info2 = session.sessionInfo;

			// verify they are different objects
			expect(info1).not.toBe(info2);
			expect(info1).toEqual(info2);
		});

		it('should return a copy of subscriptions', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					resources: {
						subscribe: true,
					},
				},
			});

			// register a resource
			server.resource(
				{
					uri: 'test://sub',
					name: 'Sub Resource',
					description: 'Sub resource',
				},
				(uri) => {
					return {
						contents: [
							{
								uri,
								text: 'Content',
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize('2025-06-18', {}, client_info);

			// subscribe
			await session.subscribeResource('test://sub');

			// get subscriptions
			const subs1 = session.subscriptions;
			const subs2 = session.subscriptions;

			// verify they are different objects
			expect(subs1).not.toBe(subs2);
			expect(subs1.resource).not.toBe(subs2.resource);
			expect(subs1).toEqual(subs2);
		});
	});

	describe('lastRequest getter', () => {
		it('should return the last sent request', async () => {
			// initialize server
			let server = new McpServer(server_config, {
				adapter,
				capabilities: {
					tools: {},
				},
			});

			server.tool(
				{
					name: 'response_tool',
					description: 'Tool that requires a response',
				},
				async () => {
					// simulate a server request that needs a response
					server.elicitation(
						'send a response',
						v.object({ name: v.string() }),
					);

					return {
						content: [
							{
								type: 'text',
								text: `Tool called`,
							},
						],
					};
				},
			);

			// create an InMemoryTransport
			const transport = new InMemoryTransport(server);
			const session = transport.session();

			// initialize the session
			await session.initialize(
				'2025-06-18',
				{
					elicitation: {},
				},
				client_info,
			);

			session.callTool('response_tool');

			// await a tick to ensure the tool call is processed and request is sent
			await Promise.resolve();
			expect(session.lastRequest).toStrictEqual({
				id: 1,
				jsonrpc: '2.0',
				method: 'elicitation/create',
				params: {
					message: 'send a response',
					requestedSchema: {
						$schema: 'http://json-schema.org/draft-07/schema#',
						properties: {
							name: {
								type: 'string',
							},
						},
						required: ['name'],
						type: 'object',
					},
				},
			});
		});
	});
});
