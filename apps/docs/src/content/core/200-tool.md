---
title: tool
description: The star of the MCP protocol...learn how to register a tool that can be called by your Agent.
section: Core
---

<script>
	import { Callout, Card } from "@svecodocs/kit";
</script>

Tools are one of the main MCP primitive: each tool you add to your MCP server will be available from the `tools/list` call the MCP client does (generally at the beginning of a session) and provides to the LLM.

Once there the LLM will be able to invoke one of the available tool and the MCP client will, in turn, invoke a `tools/call` on the MCP server. This makes them a very powerful primitive that allows LLMs to get additional context but also to interact with the real world.

<Callout type="tip">

For illustration purpose we are not gonna use the [tool utilities](/docs/utils/tool) but you should definitely check them out as they would make the code much shorter.

</Callout>

## Basic API

You can register a tool invoking the `tool` method on the server instance. The first argument is a configuration object and the second a handler that will be invoked whenever that tool is invoked by the MCP client.

```ts
server.tool(
	{
		name: 'your-tool',
		description: 'A description for the LLM',
		title: 'Your Tool',
	},
	() => {
		return {
			content: [
				{
					type: 'text',
					text: "Here's the result of the tool",
				},
			],
		};
	},
);
```

`name` and `description` are the only required properties (you can also specify a `title` for a human readable title but that's optional) of the configuration object. The return value of the handler must be an object with a `content` property which is an array of one or more contents (you can refer to the [MCP spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-result) to know the possible return values)

<Callout type="tip">

You can also create a tool in a separate module and add it with `server.tool(yourTool)`. Learn more in the [defineTool](/docs/core/defineTool) documentation page.
	
</Callout>


## Accepting inputs

If you want more powerful tools however you can also accept some inputs. However to be able to accept an input you need to specify the schema of your expected input

<Callout type="note">

If you didn't define an adapter in you [McpServer](/docs/core/mcp-server#specifying-an-adapter) instance trying to pass a schema will fail with a type error.

</Callout>

If you defined your adapter accepting some input is as simple as passing the `schema` property

```ts
server.tool(
	{
		name: 'fun-number-fact',
		description: 'Get a fun fact from a number',
		title: 'Fun Number Fact',
		schema: v.object({
			input: v.number(),
		}),
	},
	async ({ input }) => {
		const fun_fact = await get_fun_number_fact(input);
		return {
			content: [
				{
					type: 'text',
					text: fun_fact,
				},
			],
		};
	},
);
```

<Callout type="warning">

The schema **MUST** be an object and you'll get a type error if it's not.

</Callout>

## Requesting User Input

If your tool needs additional information from the user that wasn't provided in the initial call, you can use [elicitation](/docs/core/elicitation) to request structured input interactively. This allows your tool to pause execution, ask the user for specific data through a UI presented by the client, and then continue with that information.

```ts
const confirmation = await server.elicitation(
	'Are you sure you want to continue?',
	v.object({
		confirmed: v.boolean(),
	}),
);

if (confirmation.action === 'accept' && confirmation.content!.confirmed) {
	// Proceed with operation
}
```

<Callout type="note">

Learn more about requesting user input in the [elicitation documentation](/docs/core/elicitation).

</Callout>

## Structured output

Some MCP clients are also able to ingest structured output from a tool call to use the return value of a tool call programmatically (eg. code mode from [Cloudflare](https://blog.cloudflare.com/code-mode/) or [Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)).

Just like the inputs, since the output can potentially go over the wire, the protocol requires the developer to define a schema for it. To do so, define an `outputSchema` in the configuration object and return a `structuredContent` from the handler.

<Callout type="note">

The spec requires you to _ALSO_ return the structured content as `JSON.stringify`-ied text from one of the element of `content`

</Callout>

```ts
server.tool(
	{
		name: 'fun-number-fact',
		description: 'Get a fun fact from a number',
		title: 'Fun Number Fact',
		schema: v.object({
			input: v.number(),
		}),
		outputSchema: v.object({
			fact: v.string(),
		}),
	},
	async ({ input }) => {
		const fun_fact = await get_fun_number_fact(input);
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({ fact: fun_fact }),
				},
			],
			structuredContent: { fact: fun_fact },
		};
	},
);
```

<Callout type="warning">

The output schema **MUST** be an object and you'll get a type error if it's not. Also once you define an `outputSchema` you **MUST** return the `structuredContent` from the handler (unless you are returning an error).

</Callout>

## Error handling

Tools are a bit special when it comes to error handling. Since they are invoked by the LLM to give them the context about what the error is and how to recover from it the spec requires you to return an object containing `isError: true` instead of throwing. `tmcp` does that for you automatically in case the input does not validate with the provided schema or if the LLM tries to call a non existent tool but to give you maximum freedom it doesn't automatically catches errors for you.

So it's recommended to do your error handling like this

```ts
server.tool(
	{
		name: 'fun-number-fact',
		description: 'Get a fun fact from a number',
		title: 'Fun Number Fact',
		schema: v.object({
			input: v.number(),
		}),
		outputSchema: v.object({
			fact: v.string(),
		}),
	},
	async ({ input }) => {
		try {
			const fun_fact = await get_fun_number_fact(input);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ fact: fun_fact }),
					},
				],
				structuredContent: { fact: fun_fact },
			};
		} catch {
			return {
				isError: true,
				content: [
					{
						type: 'text',
						// be more descriptive than this for better results 😅
						text: 'Unable to get a fun number fact',
					},
				],
			};
		}
	},
);
```

## `enabled` function

One pattern that is quite common in every software is having a different feature-set based on some flag or the status of some user. You could technically create a new instance of the `McpServer` for each request and conditionally add a tool but to facilitate the process `tmcp` exposes an `enabled` property on the configuration object. The property is a function that returns a boolean and, as you might have guessed, allows you to include a specific tool in the list of tools conditionally. Within the function you have access to the [context](/docs/core/ctx) so you can make decisions based on the client capabilities (for example turning off a tool that requires sampling if the client doesn't supports it), the client info (for example turning off a tool that is too long for codex to handle) or even just reading a feature flag in the db to do A/B testing or to allow your admin to turn on or off a tool without a re-deploy.

```ts
server.tool(
	{
		name: 'get-divine-comedy',
		description: 'Get the whole Divine Comedy',
		enabled() {
			return server.ctx.sessionInfo?.clientInfo?.name !== 'codex';
		},
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'Midway along the journey of our life I woke to find myself in a dark wood, for I had wandered off from the straight path...',
				},
			],
		};
	},
);
```

## Icons

To allow the users to to understand what an MCP server is about at a glance the MCP spec allows you to include a set of icons for each tool. Obviously `tmcp` allows you to specify those too using the `icons` property of the configuration object.

<Callout type="note">

MCP clients are usually very strict about which icons they do or don't display. If your server is remote they'll only display remote icons served by the same domain or `data` images, if it's local they'll only display local files or `data` images. We suggest to include more icons and to properly test them with various clients.

</Callout>

```ts
server.tool(
	{
		name: 'get-divine-comedy',
		description: 'Get the whole Divine Comedy',
		icons: [
			{
				src: 'https://dantemcp.com/date.png',
			},
			{
				src: 'data:image/png;base64,...',
			},
		],
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'Midway along the journey of our life I woke to find myself in a dark wood, for I had wandered off from the straight path...',
				},
			],
		};
	},
);
```

## Hints

The MCP spec also allows tool to specify additional hints and metadata that can be used by the LLM to determine how safe is it to call it. There are currently five possible annotations

- **title**: A second way to specify a human readable title for the tool (it's in the spec, don't ask why)
- **destructiveHint**: Wether the tool will destroy some resource or not, signaling to the LLM that the tool should be called with caution
- **idempotentHint**: wether the result of the tool would always be the same given the same inputs, signaling the LLM that it doesn't need to call it again if it was already called previously with the same arguments
- **openWorldHint**: wether it would change something in the open world, like doing an api call to order a pizza
- **readOnlyHint**: if it's a read only tool that will never write to a resource of any kind, signaling to the LLM that can call with less caution

You can specify those with the `annotations` property of the configuration object.

```ts
server.tool(
	{
		// rest of the tool
		annotations: {
			title: '',
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: true,
			readOnlyHint: true,
		},
	},
	() => {
		// handler
	},
);
```
