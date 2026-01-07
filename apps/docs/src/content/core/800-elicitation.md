---
title: elicitation
description: Learn how to request additional information from users during tool execution.
section: Core
---

<script>
	import { Callout } from "@svecodocs/kit";
</script>

Elicitation allows your MCP server to request additional structured information from users during the execution of tools, prompts, or other operations. Instead of failing when data is missing, you can interactively gather what you need through a UI presented by the MCP client.

This is particularly useful for:
- Confirming potentially dangerous operations
- Gathering missing required parameters
- Collecting user preferences or settings
- Requesting disambiguation when multiple options are available

<Callout type="warning">

Servers **MUST NOT** use elicitation to request sensitive information like passwords, API keys, or other credentials. Elicitation is designed for non-sensitive structured data only.

</Callout>

## Basic API

You can request information from the user by calling the `elicitation` method on the server instance. The first argument is a message to display to the user, and the second is a schema defining the structure of the data you need.

```ts
const response = await server.elicitation(
	'Please provide your GitHub username',
	v.object({
		username: v.string(),
	}),
);

if (response.action === 'accept') {
	console.log('Username:', response.content.username);
}
```

<Callout type="note">

If you didn't define an adapter in your [McpServer](/docs/core/mcp-server#specifying-an-adapter) instance, trying to use elicitation will fail with a type error. The adapter is required to convert your schema to JSON Schema.

</Callout>

## Response Actions

Elicitation responses use a three-action model that clearly distinguishes between different user intentions:

### Accept

The user explicitly approved and submitted the requested data. The `content` field contains the validated data matching your schema.

```ts
const response = await server.elicitation(
	'Enter your name',
	v.object({
		name: v.string(),
	}),
);

if (response.action === 'accept') {
	// User submitted data - content is guaranteed to exist and be valid
	console.log('Hello,', response.content!.name);
}
```

### Decline

The user explicitly declined the request. This is different from canceling - the user made a conscious decision to reject the elicitation.

```ts
if (response.action === 'decline') {
	// User clicked "No", "Reject", or similar
	// Offer alternatives or explain consequences
	return {
		isError: true,
		content: [
			{
				type: 'text',
				text: 'Operation cancelled. You can try again later.',
			},
		],
	};
}
```

### Cancel

The user dismissed the dialog without making an explicit choice (e.g., pressed Escape, clicked outside, or closed the dialog).

```ts
if (response.action === 'cancel') {
	// User dismissed the dialog
	// Consider prompting again later or providing alternative paths
	return {
		isError: true,
		content: [
			{
				type: 'text',
				text: 'Request timed out or was cancelled',
			},
		],
	};
}
```

## Schema Requirements

Elicitation schemas [must be flat objects with primitive properties](https://modelcontextprotocol.io/specification/latest/client/elicitation#requested-schema). Complex nested structures and arrays of objects are not supported to simplify client implementation.

