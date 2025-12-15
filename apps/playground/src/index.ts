#!/usr/bin/env node

import { McpServer } from 'tmcp';
import { defineTool } from 'tmcp/tool';
import { definePrompt } from 'tmcp/prompt';
import { StdioTransport } from '@tmcp/transport-stdio';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import fs from 'node:fs/promises';
import * as v from 'valibot';
import * as z from 'zod';

const server = new McpServer(
	{
		name: 'playground',
		version: '1.0.0',
		description: 'A playground MCP server for testing tmcp with Valibot',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			logging: {},
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

const create = defineTool(
	{
		name: 'created',
		description: 'A tool that indicates it was created',
		schema: AddNumbersSchema,
		outputSchema: v.object({
			result: v.number(),
		}),
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'This tool was created successfully!',
				},
			],
			structuredContent: {
				result: 42,
			},
		};
	},
);

const create2 = defineTool(
	{
		name: 'created',
		description: 'A tool that indicates it was created',
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'This tool was created successfully!',
				},
			],
		};
	},
);

const prompt_create = definePrompt(
	{
		name: '',
		description: '',
	},
	() => {
		return {
			messages: [],
		};
	},
);

const prompt_create2 = definePrompt(
	{
		name: '',
		description: '',
	},
	() => {
		return {
			messages: [],
		};
	},
);

server.prompts([prompt_create, prompt_create2]);
server.prompt(prompt_create);

server.tools([create, create2]);
server.tool(create);
server.tool(create2);

server.tool(
	{
		name: 'add_numbers',
		description: 'Add two numbers together',
		schema: AddNumbersSchema,
	},
	({ a }) => {
		return {};
	},
);

server.tool(
	{
		name: 'add_numbers',
		description: 'Add two numbers together',
		schema: AddNumbersSchema,
		outputSchema: v.object({
			test: v.number(),
		}),
	},
	async (input) => {
		const result = input.a + input.b;
		return {
			structuredContent: {
				test: 1,
			},
			content: [
				{
					type: 'text',
					text: `The sum of ${input.a} and ${input.b} is ${result}`,
				},
			],
		};
	},
);

server.tool(
	{
		name: 'add_numbers',
		description: 'Add two numbers together',
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: `The sum of `,
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
		annotations: {
			readOnlyHint: true,
		},
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
			length: (arg) => {
				const values = ['short', 'medium', 'long'].filter((l) =>
					l.includes(arg),
				);
				return {
					completion: {
						values,
						total: values.length,
						hasMore: false,
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
		uri: 'file:///src/resource.txt',
	},
	async () => {
		console.error('roots', server.roots);
		server
			.message({
				maxTokens: 100,
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: 'What is this playground server?',
						},
					},
				],
			})
			.then((result) => {
				console.error('sampling result', result);
			});
		return {
			contents: [
				{
					uri: 'file:///src/resource.txt',
					mimeType: 'text/plain',
					text: await fs.readFile('./src/resource.txt', 'utf-8'),
				},
			],
		};
	},
);

const changed = fs.watch('./src/resource.txt');

(async () => {
	for await (let _ of changed) {
		console.error('changed');
		server.log('info', 'Resource changed, notifying clients');
		server.changed('resource', 'file:///src/resource.txt');
	}
})();

server.template(
	{
		description: 'A template resource for testing',
		name: 'playground_template',
		uri: 'playground://template/{name}/{action}',
		list: () => {
			return [
				{
					name: 'example',
					uri: 'playground://template/example/action',
					mimeType: 'text/plain',
				},
				{
					name: 'example2',
					uri: 'playground://template/example/action2',
					mimeType: 'text/plain',
				},
			];
		},
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
