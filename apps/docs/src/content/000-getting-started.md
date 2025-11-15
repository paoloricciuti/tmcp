---
title: Getting Started
description: A quick guide to get started using tmcp
section: Overview
---

<script>
	import { Steps, Step, Callout, Card } from "@svecodocs/kit";
	import PackageManagers from "$lib/components/package-managers.svelte";
	import Select from "$lib/components/select.svelte";
	import ArrowRight from "phosphor-svelte/lib/ArrowRight";
</script>

You have two ways to setup your project with `tmcp` to start building your MCP server:

## Using the cli

<Steps>
<Step>Run the CLI</Step>

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm create tmcp
```

{/snippet}
{#snippet npm()}

```bash
npm init tmcp
```

{/snippet}
{#snippet yarn()}

```bash
yarn create tmcp
```

{/snippet}

{#snippet bun()}

```bash
bun create tmcp
```

{/snippet}
</PackageManagers>
<Step>Follow the wizard 🧙🏻</Step>

The wizard will guide you towards the creation of a `tmcp` project. It will ask you for where do you want to create your project, which JSON schema adapter you want to use, which transport you want to use and if you want to include helpers to authenticate your MCP servers.

It will also ask you if you want to have an example MCP server that will create a file with the minimal boilerplate (using `srvx` in case you are building an HTTP server).

```bash
┌  🚀 Welcome to create-tmcp!
│
◇  Where should we create your TMCP project?
│  my-awesome-mcp
│
◇  Which schema adapter would you like to use?
│  Valibot (Recommended)
│
◇  Which transports would you like to include?
│  STDIO, HTTP
│
◇  Would you like to include OAuth 2.1 authentication?
│  Yes
│
◇  Would you like to include an example MCP server?
│  Yes
│
◇  Where should we place the example server?
│  src/index.js
│
◇  Would you like to automatically install dependencies?
│  Yes
│
◇  Which package manager would you like to use?
│  pnpm (Recommended)
│
◇  Project created successfully!
│
◇  Next steps: ───────╮
│                     │
│  cd my-awesome-mcp  │
│  pnpm run dev       │
│                     │
├─────────────────────╯
│
└  Happy coding! 🎉
```

<Step>That's it</Step>

That's it, `cd` into your folder and start building your awesome mcp server!

</Steps>

<Callout type="tip" title="Info">

The installer will create a `package.json` with the latest version of the required dependencies. If you want you can also run the boilerplate CLI in an existing project and it merge with your existing `package.json`.

</Callout>

## Manual installation

`tmcp` is very composable: what this means is that each functionality it's separated in it's own package so you only get the bare minimum dependencies depending on what you are building.

So to setup a project manually you need to follow some steps:

<Steps>
<Step>Install `tmcp`</Step>

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add tmcp
```

{/snippet}
{#snippet npm()}

```bash
npm i tmcp
```

{/snippet}
{#snippet yarn()}

```bash
yarn add tmcp
```

{/snippet}

{#snippet bun()}

```bash
bun add tmcp
```

{/snippet}
</PackageManagers>

<Step>Choose a validation library</Step>

There are several adapters to convert from your validation library to JSON schema (the required format for the MCP protocol):

- Valibot
- Zod (v3 and v4)
- Arktype
- Effect

once you have picked your dependency install the validation library AND the relative `tmcp` adapter

<Select options={["valibot", "zod", "arktype", "effect"]} title="Adapter">
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

<Step>Pick your transport</Step>

The core `tmcp` library is just a JSON-rpc server...to communicate you need to install an adapter. You can pick between three different adapters

- **STDIO**: used to build local servers that can be published on `npm` and communicate over `stdin` and `stdout`
- **HTTP**: used to build remote servers. You can deploy them anywhere node/bun/deno run and use Streamable HTTP to communicate with your MCP client.
- **SSE**: also used to build remote servers. This transport is officially deprecated in the MCP spec so you should default to HTTP if possible.

<Select options={["STDIO", "HTTP", "SSE"]} title="Transport">

{#snippet children(transport)}

{#if transport === "STDIO"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add @tmcp/transport-stdio
```

{/snippet}
{#snippet npm()}

```bash
npm i @tmcp/transport-stdio
```

{/snippet}
{#snippet yarn()}

```bash
yarn add @tmcp/transport-stdio
```

{/snippet}

{#snippet bun()}

```bash
bun add @tmcp/transport-stdio
```

{/snippet}
</PackageManagers>

{:else if transport === "HTTP"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add @tmcp/transport-http
```

{/snippet}
{#snippet npm()}

```bash
npm i @tmcp/transport-http
```

{/snippet}
{#snippet yarn()}

```bash
yarn add @tmcp/transport-http
```

{/snippet}

{#snippet bun()}

```bash
bun add @tmcp/transport-http
```

{/snippet}
</PackageManagers>

{:else if transport === "SSE"}

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add @tmcp/transport-sse
```

{/snippet}
{#snippet npm()}

```bash
npm i @tmcp/transport-sse
```

{/snippet}
{#snippet yarn()}

```bash
yarn add @tmcp/transport-sse
```

{/snippet}

{#snippet bun()}

```bash
bun add @tmcp/transport-sse
```

{/snippet}
</PackageManagers>

{/if}

{/snippet}

</Select>

<Step>(Optional) Install the Auth helper</Step>

If you plan to use authentication for your MCP server `tmcp` you will need to act as an _Authorization server_. This can be challenging and that's why `tmcp` ships with a package dedicated to authentication. You can install it like this

<PackageManagers>
{#snippet pnpm()}

```bash
pnpm add @tmcp/auth
```

{/snippet}
{#snippet npm()}

```bash
npm i @tmcp/auth
```

{/snippet}
{#snippet yarn()}

```bash
yarn add @tmcp/auth
```

{/snippet}

{#snippet bun()}

```bash
bun add @tmcp/auth
```

{/snippet}
</PackageManagers>

And use it in your transport.

<Card href="/docs/auth/oauth" title="Learn how to use the authentication helpers" icon={ArrowRight} horizontal>
You can learn more about how to use the authentication helpers in the section dedicated to it.
</Card>

</Steps>
