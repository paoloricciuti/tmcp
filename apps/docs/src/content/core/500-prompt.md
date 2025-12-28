---
title: prompt
description: Learn how to register a new prompt for your MCP server.
section: Core
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

Prompts are another important MCP primitive that allows you to expose pre-written prompt templates to users. Unlike [tools](/docs/core/tool) which are autonomously invoked by the LLM, prompts are explicitly selected by users to help structure their requests.

Prompts can include dynamic arguments that users can fill in, making them flexible templates for common workflows. They're particularly useful for guiding users towards best practices or providing structured starting points for complex tasks.

<Callout type="tip">

For illustration purpose we are not gonna use the [prompt utilities](/docs/utils/prompt) but you should definitely check them out as they would make the code much shorter.

</Callout>

## Basic API

You can register a prompt by invoking the `prompt` method on the server instance. The first argument is a configuration object and the second a handler that will be invoked whenever that prompt is requested by the MCP client.

```ts
server.prompt(
	{
		name: 'your-prompt',
		description: 'A description for the user',
		title: 'Your Prompt',
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: 'Write a comprehensive test suite for the selected code',
					},
				},
			],
		};
	},
);
```

`name` and `description` are the only required properties (you can also specify a `title` for a human readable title but that's optional) of the configuration object. The return value of the handler must be an object with a `messages` property which is an array of one or more messages. Each message has a `role` (either `"user"` or `"assistant"`) and `content` that can be text, images, audio, or embedded resources (you can refer to the [MCP spec](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts#prompt-messages) to know all possible content types).

<Callout type="tip">

You can also create a prompt in a separate module and add it with `server.prompt(yourPrompt)`. Learn more in the [definePrompt](/docs/core/definePrompt) documentation page.
	
</Callout>

## Accepting arguments

Prompts become much more powerful when they can accept dynamic arguments from users. To accept arguments, you need to specify the schema of your expected input.

<Callout type="note">

If you didn't define an adapter in your [McpServer](/docs/core/mcp-server#specifying-an-adapter) instance, trying to pass a schema will fail with a type error.

</Callout>

If you defined your adapter, accepting arguments is as simple as passing the `schema` property:

```ts
server.prompt(
	{
		name: 'code-review',
		description: 'Generate a code review prompt for a specific file',
		title: 'Code Review',
		schema: v.object({
			filePath: v.string(),
			focusArea: v.optional(v.string()),
		}),
	},
	({ filePath, focusArea }) => {
		const focusText = focusArea ? ` with special attention to ${focusArea}` : '';
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Please review the code in ${filePath}${focusText}. Provide constructive feedback on code quality, potential bugs, and improvements.`,
					},
				},
			],
		};
	},
);
```

<Callout type="warning">

The schema **MUST** be an object and you'll get a type error if it's not.

</Callout>

## Multi-message Prompts

Prompts can return multiple messages to create more complex conversation templates. This is useful for few-shot prompting or providing context through a conversation structure:

```ts
server.prompt(
	{
		name: 'api-design-review',
		description: 'Get help designing a REST API with examples',
		title: 'API Design Review',
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: 'I need to design a REST API for a user management system',
					},
				},
				{
					role: 'assistant',
					content: {
						type: 'text',
						text: 'I can help you design that API. What operations do you need to support?',
					},
				},
				{
					role: 'user',
					content: {
						type: 'text',
						text: 'I need CRUD operations for users, plus authentication',
					},
				},
			],
		};
	},
);
```

## Content Types

While text is the most common content type, prompts support various content types for multi-modal interactions:

### Text Content

Standard text messages (shown in examples above):

```ts
{
	type: 'text',
	text: 'Your text content here',
}
```

### Image Content

Include visual context in prompts:

```ts
server.prompt(
	{
		name: 'analyze-ui',
		description: 'Analyze a UI screenshot',
		title: 'UI Analysis',
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'image',
						data: 'base64-encoded-image-data',
						mimeType: 'image/png',
					},
				},
			],
		};
	},
);
```

### Embedded Resources

Reference server-side resources directly in prompt messages:

```ts
server.prompt(
	{
		name: 'review-with-docs',
		description: 'Code review with documentation context',
		title: 'Documented Code Review',
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'resource',
						resource: {
							uri: 'file:///docs/api-guidelines.md',
							mimeType: 'text/markdown',
							text: 'API Guidelines content...',
						},
					},
				},
			],
		};
	},
);
```

<Callout type="note">

The MCP spec also supports audio content (`type: 'audio'`) with base64-encoded audio data and a MIME type. All content types can include optional annotations for metadata about audience, priority, and modification times.

</Callout>

## Completions

One of the unique features of prompts is the ability to provide auto-completion suggestions for arguments. This helps users fill in the prompt arguments more quickly and with fewer errors.

You can specify completions for each argument using the `complete` property in the configuration object:

```ts
server.prompt(
	{
		name: 'code-review',
		description: 'Generate a code review prompt for a specific file',
		title: 'Code Review',
		schema: v.object({
			filePath: v.string(),
			focusArea: v.string(),
		}),
		complete: {
			filePath: async (query, context) => {
				// Return completion suggestions based on the query
				const files = await listProjectFiles();
				return {
					completion: {
						values: files
							.filter((f) => f.includes(query))
							.map((file) => file),
					},
				};
			},
			focusArea: (query) => {
				return {
					completion: {
						values: [
							'performance',
							'security',
							'maintainability',
							'error handling',
							'testing',
						].filter((area) => area.includes(query.toLowerCase())),
					},
				};
			},
		},
	},
	({ filePath, focusArea }) => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Please review the code in ${filePath} with special attention to ${focusArea}.`,
					},
				},
			],
		};
	},
);
```

Each completion function receives the current query string and a context object containing the other arguments that have been filled in, allowing you to provide context-aware suggestions.

## `enabled` function

One pattern that is quite common in every software is having a different feature-set based on some flag or the status of some user. You could technically create a new instance of the `McpServer` for each request and conditionally add a prompt but to facilitate the process `tmcp` exposes an `enabled` property on the configuration object. The property is a function that returns a boolean and, as you might have guessed, allows you to include a specific prompt in the list of prompts conditionally. Within the function you have access to the [context](/docs/core/ctx) so you can make decisions based on the client capabilities, the client info or even just reading a feature flag in the db to do A/B testing or to allow your admin to turn on or off a prompt without a re-deploy.

```ts
server.prompt(
	{
		name: 'advanced-refactoring',
		description: 'Advanced code refactoring suggestions',
		title: 'Advanced Refactoring',
		enabled() {
			return server.ctx.sessionInfo?.clientInfo?.name !== 'basic-client';
		},
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: 'Analyze the selected code and suggest advanced refactoring techniques',
					},
				},
			],
		};
	},
);
```

## Icons

To allow the users to understand what an MCP server is about at a glance the MCP spec allows you to include a set of icons for each prompt. Obviously `tmcp` allows you to specify those too using the `icons` property of the configuration object.

<Callout type="note">

MCP clients are usually very strict about which icons they do or don't display. If your server is remote they'll only display remote icons served by the same domain or `data` images, if it's local they'll only display local files or `data` images. We suggest to include more icons and to properly test them with various clients.

</Callout>

```ts
server.prompt(
	{
		name: 'code-review',
		description: 'Generate a code review prompt',
		title: 'Code Review',
		icons: [
			{
				src: 'https://dantemcp.com/review.png',
			},
			{
				src: 'data:image/png;base64,...',
			},
		],
	},
	() => {
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: 'Please review this code for quality and best practices',
					},
				},
			],
		};
	},
);
```
