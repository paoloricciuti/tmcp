import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { HttpTransport } from '@tmcp/transport-http';
import { serve } from 'srvx';
import * as v from 'valibot';
import fs from 'node:fs/promises';
import { tool, resource, prompt, complete } from 'tmcp/utils';

const server = new McpServer(
	{
		name: 'mcp-conformance-test-server',
		version: '1.0.0',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: {
				listChanged: true,
			},
			resources: {
				subscribe: true,
				listChanged: true,
			},
			prompts: {
				listChanged: true,
			},
			logging: {},
			completions: {},
		},
	},
);

server.tool(
	{
		name: 'test_simple_text',
		description: 'A description',
	},
	() => {
		return tool.text('This is a simple text response for testing.');
	},
);

server.tool(
	{
		name: 'test_image_content',
		description: 'A description',
	},
	async () => {
		const data = await fs.readFile('./assets/red.png', {
			encoding: 'base64',
		});
		return tool.media('image', data, 'image/png');
	},
);

server.tool(
	{
		name: 'test_audio_content',
		description: 'A description',
	},
	async () => {
		const data = await fs.readFile('./assets/record.wav', {
			encoding: 'base64',
		});
		return tool.media('audio', data, 'audio/wav');
	},
);

server.tool(
	{
		name: 'test_embedded_resource',
		description: 'A description',
	},
	async () => {
		return tool.resource({
			uri: 'test://embedded-resource',
			mimeType: 'text/plain',
			text: 'This is an embedded resource content.',
		});
	},
);

server.tool(
	{
		name: 'test_multiple_content_types',
		description: 'A description',
	},
	async () => {
		const data = await fs.readFile('./assets/red.png', {
			encoding: 'base64',
		});
		return tool.mix([
			tool.text('Multiple content types test:'),
			tool.media('image', data, 'image/png'),
			tool.resource({
				uri: 'test://mixed-content-resource',
				mimeType: 'application/json',
				text: '{"test":"data","value":123}',
			}),
		]);
	},
);

server.tool(
	{
		name: 'test_tool_with_logging',
		description: 'A description',
	},
	async () => {
		server.log('info', 'Tool execution started');
		await new Promise((resolve) => setTimeout(resolve, 50));
		server.log('info', 'Tool processing data');
		await new Promise((resolve) => setTimeout(resolve, 50));
		server.log('info', 'Tool execution completed');
		return tool.text('Tool with logging executed successfully.');
	},
);

server.tool(
	{
		name: 'test_tool_with_progress',
		description: 'A description',
	},
	async () => {
		server.progress(0, 100);
		await new Promise((resolve) => setTimeout(resolve, 50));
		server.progress(50, 100);
		await new Promise((resolve) => setTimeout(resolve, 50));
		server.progress(100, 100);
		return tool.text('Tool with progress executed successfully.');
	},
);

server.tool(
	{
		name: 'test_error_handling',
		description: 'A description',
	},
	() => {
		return tool.error(
			'This tool intentionally returns an error for testing',
		);
	},
);

server.tool(
	{
		name: 'test_sampling',
		description: 'A description',
		schema: v.object({
			prompt: v.pipe(
				v.string(),
				v.description('The prompt to send to the LLM'),
			),
		}),
	},
	async ({ prompt }) => {
		const response = await server.message({
			maxTokens: 100,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: prompt,
					},
				},
			],
		});
		return tool.text(`LLM response: ${response.content}`);
	},
);

server.tool(
	{
		name: 'test_elicitation',
		description: 'A description',
		schema: v.object({
			message: v.pipe(
				v.string(),
				v.description('The message to show the user'),
			),
		}),
	},
	async ({ message }) => {
		const response = await server.elicitation(
			message,
			v.object({
				username: v.pipe(v.string(), v.description("User's response")),
				email: v.pipe(
					v.string(),
					v.description("User's email address"),
				),
			}),
		);
		return tool.text(
			`User response: <action: ${response.action}, content: ${JSON.stringify(response.content)}>`,
		);
	},
);

server.tool(
	{
		name: 'test_elicitation_sep1034_defaults',
		description: 'A description',
	},
	async () => {
		const response = await server.elicitation(
			'',
			v.object({
				name: v.optional(v.string(), 'John Doe'),
				age: v.optional(v.pipe(v.number(), v.integer()), 30),
				score: v.optional(v.number(), 95.5),
				status: v.optional(
					v.picklist(['active', 'inactive']),
					'active',
				),
				verified: v.optional(v.boolean(), true),
			}),
		);
		return tool.text(
			`User response with default: <action: ${response.action}, content: ${JSON.stringify(response.content)}>`,
		);
	},
);

server.resource(
	{
		name: 'Static Text Resource',
		description: 'A static text resource for testing',
		uri: 'test://static-text',
	},
	async (uri) => {
		return resource.text(
			uri,
			'This is the content of the static text resource.',
			'text/plain',
		);
	},
);

server.resource(
	{
		uri: 'test://static-binary',
		name: 'Static Binary Resource',
		description: 'A static binary resource (image) for testing',
	},
	async (uri) => {
		const blob = await fs.readFile('./assets/red.png', {
			encoding: 'base64',
		});
		return resource.blob(uri, blob, 'image/png');
	},
);

server.template(
	{
		uri: 'test://template/{id}/data',
		name: 'Resource Template',
		description: 'A resource template with parameter substitution',
	},
	async (uri, { id }) => {
		return resource.text(
			uri,
			JSON.stringify({
				id,
				templateTest: true,
				data: `Data for ID: ${id}`,
			}),
			'application/json',
		);
	},
);

server.resource(
	{
		uri: 'test://watched-resource',
		name: 'Watched Resource',
		description: 'A resource that can be subscribed to',
	},
	async (uri) => {
		return resource.text(uri, 'Watched resource content', 'text/plain');
	},
);

server.prompt(
	{
		name: 'test_simple_prompt',
		description: 'A description',
	},
	async () => {
		return prompt.message('This is a simple prompt for testing.');
	},
);

server.prompt(
	{
		name: 'test_prompt_with_arguments',
		description: 'A description',
		schema: v.object({
			arg1: v.pipe(v.string(), v.description('First test argument')),
			arg2: v.pipe(v.string(), v.description('Second test argument')),
		}),
		complete: {
			arg1(input) {
				return complete.values(['paris', 'park', 'party'], true, 150);
			},
		},
	},
	async ({ arg1, arg2 }) => {
		return prompt.message(
			`Prompt with arguments: arg1='${arg1}', arg2='${arg2}'`,
		);
	},
);

server.prompt(
	{
		name: 'test_prompt_with_embedded_resource',
		description: 'A description',
		schema: v.object({
			resourceUri: v.pipe(
				v.string(),
				v.description('URI of the resource to embed'),
			),
		}),
	},
	async ({ resourceUri }) => {
		return prompt.mix([
			prompt.resource({
				uri: resourceUri,
				mimeType: 'text/plain',
				text: 'Embedded resource content for testing.',
			}),
			prompt.text('Please process the embedded resource above.'),
		]);
	},
);

server.prompt(
	{
		name: 'test_prompt_with_image',
		description: 'A description',
	},
	async () => {
		const data = await fs.readFile('./assets/red.png', {
			encoding: 'base64',
		});
		return prompt.mix([
			prompt.media('image', data, 'image/png'),
			prompt.text('Please analyze the image above.'),
		]);
	},
);

const transport = new HttpTransport(server, {
	path: '/mcp',
});

serve({
	async fetch(request) {
		return (
			(await transport.respond(request)) ??
			new Response('', { status: 200 })
		);
	},
});
