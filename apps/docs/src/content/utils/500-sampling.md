---
title: sampling
description: Utilities for running agentic loops with LLM sampling and tool execution
section: Utils
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

The `sampling` utility provides a higher-level abstraction for running agentic loops that combine LLM sampling with tool execution. This is useful when you want to let the LLM autonomously call tools to accomplish a task.

<Callout type="warning">

Sampling requires the client to support the `sampling` capability. Check `server.ctx.sessionInfo?.clientCapabilities?.sampling` before using these utilities.

</Callout>

## Basic Usage

Import the `sampling` utility from `tmcp/utils`:

```ts
import { sampling, tool } from 'tmcp/utils';
import { defineTool } from 'tmcp/tool';
```

## sampling.loop

The `loop` function runs an agentic loop that sends messages to the LLM and executes tool calls until the LLM returns a final answer.

```ts
const calculator = defineTool(
	{
		name: 'calculator',
		description: 'Perform mathematical calculations',
		schema: z.object({
			expression: z.string(),
		}),
	},
	async ({ expression }) => {
		const result = eval(expression); // Note: use a safe math parser in production
		return tool.text(`${expression} = ${result}`);
	},
);

const result = await sampling.loop({
	server,
	initialMessages: [
		{
			role: 'user',
			content: { type: 'text', text: 'What is 6 * 7?' },
		},
	],
	tools: [calculator],
});

console.log(result.response.content); // The LLM's final answer
console.log(result.transcript); // Full conversation history
```

## Parameters

| Parameter           | Required | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `server`            | Yes      | The MCP server instance to use for messaging                                 |
| `initialMessages`   | Yes      | Array of messages to start the conversation                                  |
| `tools`             | Yes      | Array of tools available for the LLM to call (created with `defineTool`)     |
| `systemPrompt`      | No       | Optional system prompt to guide the LLM                                      |
| `maxIterations`     | No       | Maximum number of loop iterations (defaults to `Infinity`)                   |
| `maxTokens`         | No       | Maximum tokens for each message request (defaults to `4000`)                 |
| `defaultToolChoice` | No       | Tool choice mode: `"auto"`, `"required"`, or `"none"` (defaults to `"auto"`) |

## Return Value

The `loop` function returns a `LoopResult` object:

```ts
interface LoopResult {
	response: CreateMessageResult; // The final LLM response
	transcript: Array<Message>; // Full conversation history including tool calls
}
```

The transcript contains all messages exchanged during the loop, including:

- Initial user messages
- Assistant responses (including tool use requests)
- Tool results
- The final assistant answer

## Multiple Tools

You can provide multiple tools for the LLM to choose from:

```ts
const searchTool = defineTool(
	{
		name: 'search',
		description: 'Search the web for information',
		schema: z.object({ query: z.string() }),
	},
	async ({ query }) => {
		const results = await searchWeb(query);
		return tool.text(JSON.stringify(results));
	},
);

const weatherTool = defineTool(
	{
		name: 'get_weather',
		description: 'Get current weather for a location',
		schema: z.object({ location: z.string() }),
	},
	async ({ location }) => {
		const weather = await getWeather(location);
		return tool.text(
			`Weather in ${location}: ${weather.temp}°C, ${weather.conditions}`,
		);
	},
);

const result = await sampling.loop({
	server,
	initialMessages: [
		{
			role: 'user',
			content: {
				type: 'text',
				text: 'What is the weather like in Paris today?',
			},
		},
	],
	tools: [searchTool, weatherTool],
	systemPrompt:
		'You are a helpful assistant. Use the available tools to answer questions.',
});
```

## Controlling Iterations

Use `maxIterations` to limit how many times the loop can execute. This prevents infinite loops and controls costs:

```ts
const result = await sampling.loop({
	server,
	initialMessages: [
		{
			role: 'user',
			content: {
				type: 'text',
				text: 'Research and summarize recent AI news',
			},
		},
	],
	tools: [searchTool, summarizeTool],
	maxIterations: 5, // Stop after 5 iterations even if not done
});
```

<Callout type="note">

On the last iteration, the loop automatically sets `toolChoice` to `"none"` to force the LLM to provide a final answer instead of calling more tools.

</Callout>

## Breaking Out Early

You can break out of the loop early by throwing a `BreakLoopError` from a tool:

```ts
import { BreakLoopError } from 'tmcp/utils';

const confirmTool = defineTool(
	{
		name: 'confirm_action',
		description: 'Confirm an action with the user',
		schema: z.object({ message: z.string() }),
	},
	async ({ message }) => {
		const confirmed = await askUserConfirmation(message);
		if (!confirmed) {
			throw new BreakLoopError('User cancelled the operation');
		}
		return tool.text('User confirmed');
	},
);
```

When a `BreakLoopError` is thrown, it propagates up and stops the loop immediately.

## Error Handling

The loop handles various error conditions:

```ts
try {
	const result = await sampling.loop({
		server,
		initialMessages: messages,
		tools: myTools,
		maxIterations: 10,
	});
} catch (error) {
	if (error instanceof BreakLoopError) {
		// User or tool requested early exit
		console.log('Loop ended early:', error.message);
	} else if (error.message.includes('max tokens')) {
		// LLM response was truncated
		console.log('Response too long');
	} else if (error.message.includes('exceeded maximum iterations')) {
		// Loop hit the iteration limit
		console.log('Too many iterations');
	} else {
		throw error;
	}
}
```

Tool execution errors are caught and returned to the LLM as error results, allowing it to recover:

```ts
const riskyTool = defineTool(
	{
		name: 'risky_operation',
		description: 'An operation that might fail',
	},
	async () => {
		throw new Error('Something went wrong');
		// This error is caught and sent to the LLM as an error result
		// The LLM can then decide how to proceed
	},
);
```
