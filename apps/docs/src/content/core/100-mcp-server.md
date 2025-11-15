---
title: McpServer
description: The main McpServer class
section: Core
---

<script>
	import { Callout, Card } from "@svecodocs/kit";
	import PackageManagers from "$lib/components/package-managers.svelte";
	import Select from "$lib/components/select.svelte";
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

The official MCP spec requires the server to send back the information about the input of a tool/prompt (or the requested schema of an elicitation request) in JSON-schema. While very powerful JSON-schema is also very verbose and very often developers already have a validation library installed in their project.

Thanks to [standard schema](https://github.com/standard-schema/standard-schema) you can use every library that supports standard schema with `tmcp`. However we still need a way to convert from your validation library of choice to JSON-schema and that could be as simple as doing `schema.toJSONSchema()` in zod version 4 or as complex as finding and installing a separate library to do it for you (like zod v3 or valibot).

Introducing, adapters.

We did most of the work for you for the most common validation libraries:

- Valibot
- Zod V3
- Zod V4
- Arktype
- Effect

so if you are using one of these libraries you are golden: just run

<Select options={["valibot", "zod", "zod (v3)", "arktype", "effect"]} title="Adapter">
{#snippet children(adapter)}

{#if adapter === "valibot"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add valibot @tmcp/adapter-valibot
```

{/snippet}
{#snippet npm()}

```bash
npm i valibot @tmcp/adapter-valibot
```

{/snippet}
{#snippet yarn()}

```bash
yarn add valibot @tmcp/adapter-valibot
```

{/snippet}

{#snippet bun()}

```bash
bun add valibot @tmcp/adapter-valibot
```

{/snippet}
</PackageManagers>

{:else if adapter === "zod"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add zod @tmcp/adapter-zod
```

{/snippet}
{#snippet npm()}

```bash
npm i zod @tmcp/adapter-zod
```

{/snippet}
{#snippet yarn()}

```bash
yarn add zod @tmcp/adapter-zod
```

{/snippet}

{#snippet bun()}

```bash
bun add zod @tmcp/adapter-zod
```

{/snippet}
</PackageManagers>

{:else if adapter === "zod (v3)"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add zod @tmcp/adapter-zod-v3
```

{/snippet}
{#snippet npm()}

```bash
npm i zod @tmcp/adapter-zod-v3
```

{/snippet}
{#snippet yarn()}

```bash
yarn add zod @tmcp/adapter-zod-v3
```

{/snippet}

{#snippet bun()}

```bash
bun add zod @tmcp/adapter-zod-v3
```

{/snippet}
</PackageManagers>

{:else if adapter === "arktype"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add arktype @tmcp/adapter-arktype
```

{/snippet}
{#snippet npm()}

```bash
npm i arktype @tmcp/adapter-arktype
```

{/snippet}
{#snippet yarn()}

```bash
yarn add arktype @tmcp/adapter-arktype
```

{/snippet}

{#snippet bun()}

```bash
bun add arktype @tmcp/adapter-arktype
```

{/snippet}
</PackageManagers>

{:else}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add effect-ts @tmcp/adapter-effect
```

{/snippet}
{#snippet npm()}

```bash
npm i effect-ts @tmcp/adapter-effect
```

{/snippet}
{#snippet yarn()}

```bash
yarn add effect-ts @tmcp/adapter-effect
```

{/snippet}

{#snippet bun()}

```bash
bun add effect-ts @tmcp/adapter-effect
```

{/snippet}
</PackageManagers>

{/if}

{/snippet}

</Select>

once you do that you'll find a named export with a descriptive name that you can instantiate and pass as adapter to your McpServer class.

```ts
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';

const server = new McpServer(
	{
		name: 'a-super-basic-server',
		version: '1.0.0',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {},
	},
);
```

Then you will be able to pass `valibot` schemas to your tools/prompts/elicitations.

<details class="mt-4">
	<summary class="text-xl">What if my standard schema library is not one of those?</summary>

Don't worry!

Writing your own adapter is very simple (given that your library supports converting into JSON-schema...if that's not the case I have bad news 😅).

`tmcp` also exports a class named `JsonSchemaAdapter`, all you have to do is create a class extends that class and override the `toJsonSchema` method

```ts
import { JsonSchemaAdapter } from 'tmcp/adapter';
// every validation library exports their base type
// which needs to be a StandardSchema compatible type
import type { BaseSchemaType } from 'your-validation-library';

class MyCustomJsonSchemaAdapter extends JsonSchemaAdapter<BaseSchemaType> {
	async toJsonSchema(schema: BaseSchemaType) {
		// find a way to convert to json schema
		return schema.toJsonSchema();
	}
}
```

That's it! Now you can use your library with `tmcp`...and if you feel it you can also [open a PR](https://github.com/paoloricciuti/tmcp/pulls) to `tmcp` to make this an officially supported library!

</details>
