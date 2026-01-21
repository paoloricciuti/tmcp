---
title: executeTool
description: Execute a tool created with defineTool programmatically
section: Utils
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

The `executeTool` function allows you to execute a tool that was created with `defineTool` programmatically, outside of the normal MCP request/response flow. This is useful for building agentic loops with the [server.message](/docs/core/message).

## Basic Usage

Import `executeTool` from `tmcp/tool`:

```ts
import { defineTool, executeTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import { z } from 'zod';

const calculator = defineTool(
	{
		name: 'calculator',
		description: 'Add two numbers',
		schema: z.object({
			a: z.number(),
			b: z.number(),
		}),
	},
	async ({ a, b }) => {
		return tool.text(`${a} + ${b} = ${a + b}`);
	},
);

// Execute the tool directly
const result = await executeTool(calculator, { a: 5, b: 3 });
console.log(result.content); // [{ type: 'text', text: '5 + 3 = 8' }]
```

## Type Safety

The `executeTool` function is fully typed using the tool's schema. If your tool has an input schema, you must provide arguments that match it:

```ts
const greet = defineTool(
	{
		name: 'greet',
		description: 'Greet a person',
		schema: z.object({
			name: z.string(),
			formal: z.boolean().optional(),
		}),
	},
	async ({ name, formal }) => {
		const greeting = formal ? `Good day, ${name}.` : `Hey ${name}!`;
		return tool.text(greeting);
	},
);

// TypeScript will enforce the correct argument types
await executeTool(greet, { name: 'Alice' }); // OK
await executeTool(greet, { name: 'Bob', formal: true }); // OK
await executeTool(greet, { age: 25 }); // Type error: 'name' is required
```

## Tools Without Input

For tools that don't require input (no schema), call `executeTool` without any arguments:

```ts
const getTime = defineTool(
	{
		name: 'get_time',
		description: 'Get the current time',
	},
	async () => {
		return tool.text(new Date().toISOString());
	},
);

// No arguments needed
const result = await executeTool(getTime);
```

## Output Schema

If your tool has an output schema, the return type is properly inferred:

```ts
const getData = defineTool(
	{
		name: 'get_data',
		description: 'Get structured data',
		outputSchema: z.object({
			count: z.number(),
			items: z.array(z.string()),
		}),
	},
	async () => {
		return tool.structured({
			count: 3,
			items: ['a', 'b', 'c'],
		});
	},
);

const result = await executeTool(getData);
// result.structuredContent is typed as { count: number; items: string[] }
```

## Building Custom Agentic Loops

While `sampling.loop` handles most agentic use cases, you can use `executeTool` to build custom execution flows:

```ts
async function runToolSequence(tools, inputs) {
	const results = [];
	for (let i = 0; i < tools.length; i++) {
		const result = await executeTool(tools[i], inputs[i]);
		results.push(result);

		// Stop on error
		if (result.isError) {
			break;
		}
	}
	return results;
}
```

<Callout type="note">

The `sampling.loop` utility uses `executeTool` internally to execute tools when the LLM requests them.

</Callout>

## Error Handling

Errors thrown by the tool's execute function propagate normally:

```ts
const riskyTool = defineTool(
	{
		name: 'risky',
		description: 'A tool that might fail',
	},
	async () => {
		throw new Error('Something went wrong');
	},
);

try {
	await executeTool(riskyTool);
} catch (error) {
	console.error('Tool failed:', error.message);
}
```

This is different from how errors are handled in `sampling.loop`, where tool errors are caught and sent back to the LLM as error results.
