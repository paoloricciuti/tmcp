---
title: message
description: Learn how to request LLM sampling from the client to enable agentic behaviors in your MCP server.
section: Core
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

The `message` method allows your MCP server to request LLM sampling (also called "completions" or "generations") from the client. This is called "sampling" in the MCP specification and enables servers to implement agentic behaviors—like calling an LLM to process data, generate responses, or make decisions—without requiring server-side API keys.

The client maintains control over model access, selection, and permissions while your server can leverage AI capabilities through a standardized interface.

<Callout type="warning">

Not all MCP clients support sampling yet. The server will throw an error if you attempt to use `message` with a client that doesn't declare the `sampling` capability.

</Callout>

## Basic API

You can request LLM sampling by calling the `message` method on the server instance. The method takes a request object and returns a promise with the LLM's response.

```ts
const response = await server.message({
	messages: [
		{
			role: 'user',
			content: {
				type: 'text',
				text: 'What is the capital of France?',
			},
		},
	],
	maxTokens: 100,
});

console.log(response.content.text); // "The capital of France is Paris."
console.log(response.model); // "claude-3-sonnet-20240307"
console.log(response.stopReason); // "endTurn"
```

The response includes the LLM's message with `role` (always `"assistant"`), `content` (text, image, or audio), the `model` used, and `stopReason` indicating why generation stopped.

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `messages` | Yes | Array of messages with `role` (`"user"` or `"assistant"`) and `content` (text, image, or audio). Each message contains a single content item. |
| `maxTokens` | Yes | Maximum number of tokens to generate. |
| `systemPrompt` | No | System prompt to guide the LLM's behavior. |
| `modelPreferences` | No | Object with `hints` (array of model name hints), `costPriority`, `speedPriority`, and `intelligencePriority` (all 0-1). Client uses these to select an appropriate model. |
| `temperature` | No | Controls randomness (0.0 = deterministic, higher = more random). Support varies by client. |
| `stopSequences` | No | Array of strings that stop generation when encountered. |
| `metadata` | No | Arbitrary metadata object to pass to the LLM provider. |
| `includeContext` | No | Request to include context from MCP servers: `"none"`, `"thisServer"`, or `"allServers"`. Deprecated, may be ignored by client. |

## Multi-turn Conversations

Build conversations by including previous messages in the array:

```ts
const response = await server.message({
	messages: [
		{
			role: 'user',
			content: { type: 'text', text: 'What is 2 + 2?' },
		},
		{
			role: 'assistant',
			content: { type: 'text', text: '2 + 2 equals 4.' },
		},
		{
			role: 'user',
			content: { type: 'text', text: 'Now multiply that by 3.' },
		},
	],
	maxTokens: 100,
});
```

## Checking Client Support

Check if the client supports sampling before using this method:

```ts
server.tool(
	{
		name: 'analyze_with_ai',
		description: 'Analyze data using AI',
		enabled() {
			return !!server.ctx.sessionInfo?.clientCapabilities?.sampling;
		},
	},
	async () => {
		const response = await server.message({
			messages: [
				{
					role: 'user',
					content: { type: 'text', text: 'Analyze this data.' },
				},
			],
			maxTokens: 500,
		});
		return tool.text(response.content.text);
	},
);
```

## Error Handling

The method throws `McpError` when the client doesn't support sampling (code `-32601`), the user rejects the request (code `-1`), or invalid parameters are provided (code `-32602`).

```ts
try {
	const response = await server.message({
		messages: [
			{
				role: 'user',
				content: { type: 'text', text: 'Hello!' },
			},
		],
		maxTokens: 500,
	});
} catch (error) {
	if (error.code === -1) {
		return tool.text('User declined the request.');
	} else if (error.code === -32601) {
		return tool.text('Sampling not available with this client.');
	}
	throw error;
}
```
