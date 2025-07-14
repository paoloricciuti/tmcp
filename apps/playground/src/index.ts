#!/usr/bin/env node

import { McpServer } from 'tmcp';
import { StdioTransport } from '@tmcpkit/transport-stdio';
import { ValibotJsonSchemaAdapter } from '@tmcpkit/adapter-valibot';
import * as v from 'valibot';

const server = new McpServer(
	{
		name: 'playground',
		version: '1.0.0',
		description: 'A playground MCP server for testing tmcp with Valibot',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: {
				listChanged: true,
			},
			prompts: {
				listChanged: true,
			},
			resources: {
				subscribe: true,
				listChanged: true,
			},
		},
	},
);

setTimeout(() => {
	server.changed('resource', 'playground://info');
}, 10000);

// Add some example tools
const AddNumbersSchema = v.object({
	a: v.pipe(v.number(), v.description('First number to add')),
	b: v.pipe(v.number(), v.description('Second number to add')),
});

server.tool(
	{
		name: 'add_numbers',
		description: 'Add two numbers together',
		schema: AddNumbersSchema,
	},
	async (input) => {
		const result = input.a + input.b;
		return {
			content: [
				{
					type: 'text',
					text: `The sum of ${input.a} and ${input.b} is ${result}`,
				},
			],
		};
	},
);

const GreetSchema = v.object({
	name: v.pipe(v.string(), v.description('Name of the person to greet')),
	formal: v.pipe(
		v.optional(v.boolean()),
		v.description('Whether to use formal greeting'),
	),
});

server.tool(
	{
		name: 'greet',
		description: 'Generate a greeting message',
		schema: GreetSchema,
	},
	async (input) => {
		const greeting = input.formal ? 'Good day' : 'Hello';
		return {
			skibidi: true,
			content: [
				{
					type: 'text',
					text: `${greeting}, ${input.name}!`,
				},
			],
		};
	},
);

// Add a simple tool without schema
server.tool(
	{
		name: 'get_time',
		description: 'Get the current time',
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: `Current time: ${new Date().toISOString()}`,
				},
			],
		};
	},
);

// Add an example prompt
const StoryPromptSchema = v.object({
	topic: v.pipe(v.string(), v.description('Topic for the story')),
	length: v.pipe(
		v.optional(v.picklist(['short', 'medium', 'long'])),
		v.description('Length of the story'),
	),
});

server.prompt(
	{
		name: 'story_prompt',
		description: 'Generate a creative story prompt',
		schema: StoryPromptSchema,
		complete: {
			topic: (arg) => {
				return {
					completion: {
						values: [''],
					},
				};
			},
		},
	},
	async (input) => {
		const length = input.length || 'medium';
		return {
			description: `A ${length} story about ${input.topic}`,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Write a ${length} story about ${input.topic}. Be creative and engaging.`,
					},
				},
			],
		};
	},
);

// Add an example resource
server.resource(
	{
		name: 'playground_info',
		description: 'Information about this playground server',
		uri: 'playground://info',
	},
	async () => {
		return {
			contents: [
				{
					uri: 'playground://info',
					mimeType: 'text/plain',
					text: 'This is a playground MCP server built with tmcp and Valibot for testing with MCP Inspector.',
				},
			],
		};
	},
);

server.template(
	{
		description: 'A template resource for testing',
		name: 'playground_template',
		uri: 'playground://template/{name}/{action}',
		complete: {
			name: (arg) => {
				return {
					completion: {
						values: [''],
					},
				};
			},
			action: () => {
				return {
					completion: {
						values: [''],
					},
				};
			},
		},
	},
	async (uri, { action, name }) => {
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: `You called the ${action} action for ${name}.`,
				},
			],
		};
	},
);

const transport = new StdioTransport(server);

transport.listen();
