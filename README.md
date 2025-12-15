> [!WARNING]
> Unfortunately i published the 1.0 by mistake...this package is currently under heavy development so there will be breaking changes in minors...threat this `1.x` as the `0.x` of any other package. Sorry for the disservice, every breaking will be properly labeled in the PR name.

# tmcp

A lightweight, schema-agnostic Model Context Protocol (MCP) server implementation with unified API design.

## Why tmcp?

tmcp offers significant advantages over the official MCP SDK:

- **🔄 Schema Agnostic**: Works with any validation library through adapters
- **📦 No Weird Dependencies**: Minimal footprint with only essential dependencies (looking at you `express`)
- **🎯 Unified API**: Consistent, intuitive interface across all MCP capabilities
- **🔌 Extensible**: Easy to add support for new schema libraries
- **⚡ Lightweight**: No bloat, just what you need

## Supported Schema Libraries

tmcp works with all major schema validation libraries through its adapter system:

- **Zod** - `@tmcp/adapter-zod`
- **Valibot** - `@tmcp/adapter-valibot`
- **ArkType** - `@tmcp/adapter-arktype`
- **Effect Schema** - `@tmcp/adapter-effect`
- **Zod v3** - `@tmcp/adapter-zod-v3`

## Installation

```bash
pnpm install tmcp
# Choose your preferred schema library adapter
pnpm install @tmcp/adapter-zod zod
# Choose your preferred transport
pnpm install @tmcp/transport-stdio  # For CLI/desktop apps
pnpm install @tmcp/transport-http   # For web-based clients
```

## Quick Start

### Standard I/O Transport (CLI/Desktop)

```javascript
import { McpServer } from 'tmcp';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { StdioTransport } from '@tmcp/transport-stdio';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'My awesome MCP server',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
			prompts: { listChanged: true },
			resources: { listChanged: true },
		},
	},
);

// While the adapter is optional (you can opt out by explicitly passing `adapter: undefined`) without an adapter the server cannot accept inputs, produce structured outputs, or request elicitations at all only do this for very simple servers.

// Define a tool with type-safe schema
server.tool(
	{
		name: 'calculate',
		description: 'Perform mathematical calculations',
		schema: z.object({
			operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
			a: z.number(),
			b: z.number(),
		}),
	},
	async ({ operation, a, b }) => {
		switch (operation) {
			case 'add':
				return a + b;
			case 'subtract':
				return a - b;
			case 'multiply':
				return a * b;
			case 'divide':
				return a / b;
		}
	},
);

// Start the server with stdio transport
const transport = new StdioTransport(server);
transport.listen();
```

### HTTP Transport (Web-based)

```javascript
import { McpServer } from 'tmcp';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { HttpTransport } from '@tmcp/transport-http';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(/* ... same server config ... */);

// Add tools as above...

// Create HTTP transport
const transport = new HttpTransport(server);

// Use with your preferred HTTP server (Bun example)
Bun.serve({
	port: 3000,
	async fetch(req) {
		const response = await transport.respond(req);
		if (response === null) {
			return new Response('Not Found', { status: 404 });
		}
		return response;
	},
});
```

## Defining Tools, Prompts, Resources, and Templates in Separate Files

For better code organization and reusability, you can define your tools, prompts, resources, and templates in separate files using the `defineTool`, `definePrompt`, `defineResource`, and `defineTemplate` utilities:

```ts
// tools/calculator.ts
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import { z } from 'zod';

export const addTool = defineTool(
	{
		name: 'add',
		description: 'Add two numbers',
		schema: z.object({
			a: z.number(),
			b: z.number(),
		}),
	},
	async ({ a, b }) => tool.text(`${a} + ${b} = ${a + b}`),
);
```

```ts
// server.ts
import { McpServer } from 'tmcp';
import { addTool } from './tools/calculator.js';

const server = new McpServer(/* ... */);

// Register a single tool
server.tool(addTool);

// Or register multiple tools at once
server.tools([addTool, multiplyTool, divideTool]);
```

This approach enables:

- **Modular organization**: Keep related functionality in separate files
- **Reusability**: Share tool definitions across multiple servers
- **Better testing**: Test tool logic independently
- **Type safety**: Full TypeScript inference for parameters and return types

The same pattern works for `definePrompt`, `defineResource`, and `defineTemplate` with their corresponding `server.prompts()`, `server.resources()`, and `server.templates()` methods.

Adding the primitive to the server will error if the tool uses a different validation library than the one expressed in the adapter.

## API Reference

### McpServer

The main server class that handles MCP protocol communications.

#### Constructor

```javascript
new McpServer(serverInfo, options);
```

- `serverInfo`: Server metadata (name, version, description)
- `options`: Configuration object with optional adapter (for schema conversion) and capabilities

> [!IMPORTANT]
> While the adapter is optional (you can opt out by explicitly passing `adapter: undefined`) without an adapter the server cannot accept inputs, produce structured outputs, or request elicitations at all only do this for very simple servers.

#### Methods

##### `tool(definition, handler)` / `tools(definitions)`

Register one or more tools with optional schema validation.

```javascript
// Register a single tool inline
server.tool(
	{
		name: 'tool-name',
		description: 'Tool description',
		schema: yourSchema, // optional
	},
	async (input) => {
		// Tool implementation
		return { content: [{ type: 'text', text: 'Tool result' }] };
	},
);

// Register a tool created with defineTool
import { defineTool } from 'tmcp/tool';

const myTool = defineTool(
	{
		name: 'tool-name',
		description: 'Tool description',
		schema: yourSchema,
	},
	async (input) => {
		return { content: [{ type: 'text', text: 'Tool result' }] };
	},
);

server.tool(myTool);

// Register multiple tools at once
server.tools([tool1, tool2, tool3]);
```

##### `prompt(definition, handler)` / `prompts(definitions)`

Register one or more prompt templates with optional schema validation.

```javascript
// Register a single prompt inline
server.prompt(
  {
    name: 'prompt-name',
    description: 'Prompt description',
    schema: yourSchema, // optional
    complete: {
      paramName: (arg, context) => ({
        completion: {
          values: ['completion1', 'completion2'],
          total: 2,
          hasMore: false
        }
      })
    } // optional
  },
  async (input) => {
    // Prompt implementation
    return { messages: [...] };
  }
);

// Register a prompt created with definePrompt
import { definePrompt } from 'tmcp/prompt';

const myPrompt = definePrompt(
  {
    name: 'prompt-name',
    description: 'Prompt description',
    schema: yourSchema,
  },
  async (input) => {
    return { messages: [...] };
  }
);

server.prompt(myPrompt);

// Register multiple prompts at once
server.prompts([prompt1, prompt2, prompt3]);
```

##### `resource(definition, handler)` / `resources(definitions)`

Register one or more static resources.

```javascript
// Register a single resource inline
server.resource(
  {
    name: 'resource-name',
    description: 'Resource description',
    uri: 'file://path/to/resource'
  },
  async (uri, params) => {
    // Resource implementation
    return { contents: [...] };
  }
);

// Register a resource created with defineResource
import { defineResource } from 'tmcp/resource';

const myResource = defineResource(
  {
    name: 'resource-name',
    description: 'Resource description',
    uri: 'file://path/to/resource'
  },
  async (uri) => {
    return { contents: [...] };
  }
);

server.resource(myResource);

// Register multiple resources at once
server.resources([resource1, resource2, resource3]);
```

### Reducing Return Boilerplate with `tmcp/utils`

Most handlers end by returning some variant of `{ content: [...] }`, `{ messages: [...] }`, or `{ completion: { ... } }`. That shape is repetitive and easy to get wrong, especially when you also need to wire `isError` or `structuredContent`. The `tmcp/utils` entry point ships tiny factories that return the correct MCP payloads for you so handlers can stay focused on business logic.

```ts
import { tool, resource, prompt, complete } from 'tmcp/utils';

server.tool({ name: 'health-check', description: 'Ping' }, async () =>
	tool.text('ok'),
);

server.tool(
	{ name: 'profile-picture', description: 'My Profile Picture' },
	async () => tool.media('image', await loadPng(), 'image/png'),
);

server.resource(
	{ name: 'readme', description: 'Project README', uri: 'file://README.md' },
	async (uri) =>
		resource.text(uri, await readFile(uri, 'utf8'), 'text/markdown'),
);

server.prompt(
	{
		name: 'explain',
		description: '',
		schema: v.object({ topic: v.string() }),
	},
	async ({ topic }) => prompt.message(`Explain ${topic} like I am five.`),
);

server.template(
	{
		name: 'users',
		description: 'Template with completion',
		uri: 'users/{id}',
		complete: {
			id: async (arg) => complete.values(await findMatchingIds(arg)),
		},
	},
	async (uri) => resource.blob(uri, await fetchUserBlob(uri)),
);
```

you can also compose different kind of tools with `tool.mix`

```ts
tool.mix([
	tool.text('Indexed workspace'),
	tool.media('image', png, 'image/png'),
]);
```

however be aware that

1. you can't pass `tool.structured` to `tool.mix` (but you can pass a second argument that will be the structured content)
2. if you pass even one `tool.error` to the `tool.mix` the whole return value will be an error

```ts
const structuredContent = {
	cool: true,
};

tool.mix(
	[
		tool.text(JSON.stringify(structuredContent)),
		tool.media('image', png, 'image/png'),
	],
	structuredContent,
);
```

Each helper is fully typed and returns the correct MCP structure (`CallToolResult`, `ReadResourceResult`, `GetPromptResult`, or `CompleteResult`). That means you can still provide `structuredContent`, embed resources, or merge multiple results via `mix` without having to copy/paste the surrounding boilerplate.

##### `template(definition, handler)` / `templates(definitions)`

Register one or more URI templates for dynamic resources.

```javascript
// Register a single template inline
server.template(
  {
    name: 'template-name',
    description: 'Template description',
    uri: 'file://path/{id}/resource',
    complete: {
      id: (arg, context) => ({
        completion: {
          values: ['id1', 'id2', 'id3'],
          total: 3,
          hasMore: false
        }
      })
    } // optional
  },
  async (uri, params) => {
    // Template implementation using params.id
    return { contents: [...] };
  }
);

// Register a template created with defineTemplate
import { defineTemplate } from 'tmcp/template';

const myTemplate = defineTemplate(
  {
    name: 'template-name',
    description: 'Template description',
    uri: 'file://path/{id}/resource',
  },
  async (uri, params) => {
    return { contents: [...] };
  }
);

server.template(myTemplate);

// Register multiple templates at once
server.templates([template1, template2, template3]);
```

##### `receive(request, context?)`

Process an incoming MCP request with optional context information.

```javascript
const response = server.receive(jsonRpcRequest, {
	sessionId: 'session-123',
	auth: authInfo,
	sessionInfo: {
		clientCapabilities, // cached from the client's initialize call
		clientInfo, // client name/version metadata
		logLevel, // last log level requested by the client
	},
	custom: {
		userId: 'alice',
	},
});
```

> [!TIP]
> `sessionInfo` is automatically populated by the built-in transports. You can read it from handlers via `server.ctx.sessionInfo` to tailor behaviour to the connected client.

##### `request({ method, params })`

Send a raw JSON-RPC request to the connected client. This is useful for
calling experimental MCP APIs or any custom client method that does not yet
have a dedicated helper in `McpServer` or to send a request with a custom JSON-schema that is not expressible with your validation library.

```javascript
const result = await server.request({
	method: 'elicitation/create',
	params: {
		message: 'Provide deployment metadata',
		requestedSchema: {
			type: 'object',
			required: ['region', 'replicas', 'features'],
			properties: {
				region: {
					type: 'string',
					enum: ['us-east-1', 'us-west-2', 'eu-central-1'],
				},
				replicas: { type: 'integer', minimum: 1, maximum: 20 },
				features: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['canary', 'observability', 'autoscaling'],
					},
					minItems: 1,
				},
			},
		},
	},
});
```

- `method`: Fully qualified MCP client method name
- `params` (optional): JSON-RPC params object/array accepted by that method

Handle the resolved payload like any other JSON-RPC response—cast or (better) validate
as needed when using this escape hatch.

## Advanced Examples

### Multiple Schema Libraries

```javascript
// Use different schemas for different tools
import { z } from 'zod';
import * as v from 'valibot';

server.tool(
	{
		name: 'zod-tool',
		schema: z.object({ name: z.string() }),
	},
	async ({ name }) => `Hello ${name}`,
);

server.tool(
	{
		name: 'valibot-tool',
		schema: v.object({ age: v.number() }),
	},
	async ({ age }) => `Age: ${age}`,
);
```

### Resource Templates with Completion

```javascript
server.template(
	{
		name: 'user-profile',
		description: 'Get user profile by ID',
		uri: 'users/{userId}/profile',
		complete: (arg, context) => {
			// Provide completions for userId parameter
			return ['user1', 'user2', 'user3'];
		},
	},
	async (uri, params) => {
		const user = await getUserById(params.userId);
		return {
			contents: [
				{
					uri,
					mimeType: 'application/json',
					text: JSON.stringify(user),
				},
			],
		};
	},
);
```

### Complex Validation

```javascript
const complexSchema = z.object({
	user: z.object({
		name: z.string().min(1),
		email: z.string().email(),
		age: z.number().min(18).max(120),
	}),
	preferences: z
		.object({
			theme: z.enum(['light', 'dark']),
			notifications: z.boolean(),
		})
		.optional(),
	tags: z.array(z.string()).default([]),
});

server.tool(
	{
		name: 'create-user',
		description: 'Create a new user with preferences',
		schema: complexSchema,
	},
	async (input) => {
		// Input is fully typed and validated
		const { user, preferences, tags } = input;
		return await createUser(user, preferences, tags);
	},
);
```

## Contributing

Contributions are welcome! Please see our [contributing guidelines](../../CONTRIBUTING.md) for details.

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT © Paolo Ricciuti
