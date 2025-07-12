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

- **Zod** - `@tmcpkit/adapter-zod`
- **Valibot** - `@tmcpkit/adapter-valibot`
- **ArkType** - `@tmcpkit/adapter-arktype`
- **Effect Schema** - `@tmcpkit/adapter-effect`
- **Zod v3** - `@tmcpkit/adapter-zod-v3`

## Installation

```bash
pnpm install tmcp
# Choose your preferred schema library adapter
ènpm install @tmcpkit/adapter-zod zod
```

## Quick Start

```javascript
import { McpServer } from 'tmcp';
import { ZodJsonSchemaAdapter } from '@tmcpkit/adapter-zod';
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

// Process incoming requests
server.receive(request);
```

## API Reference

### McpServer

The main server class that handles MCP protocol communications.

#### Constructor

```javascript
new McpServer(serverInfo, options);
```

- `serverInfo`: Server metadata (name, version, description)
- `options`: Configuration object with adapter and capabilities

#### Methods

##### `tool(definition, handler)`

Register a tool with optional schema validation.

```javascript
server.tool(
	{
		name: 'tool-name',
		description: 'Tool description',
		schema: yourSchema, // optional
	},
	async (input) => {
		// Tool implementation
		return result;
	},
);
```

##### `prompt(definition, handler)`

Register a prompt template with optional schema validation.

```javascript
server.prompt(
  {
	name: 'prompt-name',
	description: 'Prompt description',
	schema: yourSchema, // optional
	complete: (arg, context) => ['completion1', 'completion2'] // optional
  },
  async (input) => {
	// Prompt implementation
	return { messages: [...] };
  }
);
```

##### `resource(definition, handler)`

Register a static resource.

```javascript
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
```

##### `template(definition, handler)`

Register a URI template for dynamic resources.

```javascript
server.template(
  {
	name: 'template-name',
	description: 'Template description',
	uri: 'file://path/{id}/resource',
	complete: (arg, context) => ['id1', 'id2'] // optional
  },
  async (uri, params) => {
	// Template implementation using params.id
	return { contents: [...] };
  }
);
```

##### `receive(request)`

Process an incoming MCP request.

```javascript
const response = server.receive(jsonRpcRequest);
```

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

## License

MIT © Paolo Ricciuti
