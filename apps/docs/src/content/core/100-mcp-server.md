---
title: McpServer
description: The main McpServer class
section: Core
---

<script>
	import { Callout, Card } from "@svecodocs/kit";
</script>

This is the instance that controls the logic behind your MCP server. You will use this instance to register your tool/resource/prompts, to send notifications, to read the context etc.

At his heart this class is basically a JSON-rpc server and you can use the method [receive](/docs/core/receive) to handle JSON-rpc payloads.

## Initialization

`McpServer` is a class that you can instantiate with the information of your server (mainly name and version) and your capabilities:

```ts
const server = new McpServer(
	{
		name: 'a-super-basic-server',
		version: '1.0.0',
	},
	{
		adapter: undefined,
		capabilities: {},
	},
);
```

this will give you a very basic server that can only respond to `ping` requests and `initialize` requests. You can enhance your capabilities by specifying them in the `capabilities` object:

```ts
const server = new McpServer(
	{
		name: 'mcp-conformance-test-server',
		version: '1.0.0',
	},
	{
		adapter: undefined,
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
```

<Callout type="warning">
If you don't include a capability registering a tool/resource/prompt will not automatically include that capability and the server will not respond to that method invocation.
</Callout>

You might notice something unusual in both of this code snippets: we are explicitly setting the `adapter` to `undefined`. The adapter is required to receive any kind of input or to send elicitation requests so, unless you are planning only to add tools that don't receive any input you should actually specify an adapter. As a nicety and for quick prototyping you can omit the adapter but you will get errors as soon as you try to define a schema for a tool so that's why you need to specifically pass `undefined`.

But we are not prototyping here so...

## Specifying an adapter
