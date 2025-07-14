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

- **Zod** - `@tmcpkit/adapter-zod`
- **Valibot** - `@tmcpkit/adapter-valibot`
- **ArkType** - `@tmcpkit/adapter-arktype`
- **Effect Schema** - `@tmcpkit/adapter-effect`
- **Zod v3** - `@tmcpkit/adapter-zod-v3`

## Installation

```bash
pnpm install tmcp
# Choose your preferred schema library adapter
pnpm install @tmcpkit/adapter-zod zod
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
				return { content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }] };
			case 'subtract':
				return { content: [{ type: 'text', text: `${a} - ${b} = ${a - b}` }] };
			case 'multiply':
				return { content: [{ type: 'text', text: `${a} × ${b} = ${a * b}` }] };
			case 'divide':
				return { content: [{ type: 'text', text: `${a} ÷ ${b} = ${a / b}` }] };
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
		return { content: [{ type: 'text', text: 'Tool result' }] };
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
```

##### `receive(request, sessionId)`

Process an incoming MCP request.

```javascript
const response = server.receive(jsonRpcRequest, sessionId);
```

##### `elicitation(schema)`

Request client elicitation with schema validation.

```javascript
const result = await server.elicitation(schema);
```

##### `message(request)`

Request language model sampling from the client.

```javascript
const result = await server.message({
	messages: [
		{
			role: 'user',
			content: { type: 'text', text: 'Hello!' }
		}
	]
});
```

##### `refreshRoots()`

Refresh the roots list from the client.

```javascript
await server.refreshRoots();
console.log(server.roots); // Access current roots
```

##### `changed(type, id)`

Send notifications for subscriptions.

```javascript
server.changed('resource', 'file://path/to/resource');
```

##### `on(event, callback)`

Listen to server events.

```javascript
server.on('initialize', (data) => {
	console.log('Client initialized:', data);
});

server.on('send', ({ request, context }) => {
	console.log('Sending request:', request);
});
```

## Advanced Examples

### Client Interaction Features

```javascript
// Elicitation - Request structured data from client
const userData = await server.elicitation(z.object({
	name: z.string(),
	age: z.number(),
	preferences: z.array(z.string())
}));

// Message sampling - Request AI responses
const aiResponse = await server.message({
	messages: [
		{
			role: 'user',
			content: { type: 'text', text: 'Explain quantum computing' }
		}
	],
	maxTokens: 100
});

// Roots management - Access client's filesystem roots
await server.refreshRoots();
console.log('Available roots:', server.roots);
```

### Event Handling

```javascript
// Listen to server events
server.on('initialize', (data) => {
	console.log('Client capabilities:', data.capabilities);
});

server.on('send', ({ request, context }) => {
	console.log('Outgoing request:', request.method);
});
```

### Resource Subscriptions

```javascript
// Subscribe to resource changes
server.resource(
	{
		name: 'file-watcher',
		description: 'Watch file changes',
		uri: 'file://watched/file.txt'
	},
	async (uri) => {
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: await readFile(uri)
				}
			]
		};
	}
);

// Notify subscribers when resource changes
server.changed('resource', 'file://watched/file.txt');
```

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
	async ({ name }) => ({
		content: [{ type: 'text', text: `Hello ${name}` }]
	}),
);

server.tool(
	{
		name: 'valibot-tool',
		schema: v.object({ age: v.number() }),
	},
	async ({ age }) => ({
		content: [{ type: 'text', text: `Age: ${age}` }]
	}),
);
```

### Completion API

The completion API allows you to provide auto-completion suggestions for prompt and template parameters. Completion functions return an object with `completion` containing `values`, `total`, and `hasMore` properties.

#### Completion Response Format

```javascript
{
  completion: {
    values: string[],      // Array of completion values (max 100 items)
    total?: number,        // Total number of available completions
    hasMore?: boolean      // Whether there are more completions available
  }
}
```

#### Prompt Parameter Completion

```javascript
server.prompt(
	{
		name: 'story-generator',
		description: 'Generate a story with specific parameters',
		schema: z.object({
			genre: z.string(),
			length: z.enum(['short', 'medium', 'long']),
			character: z.string(),
		}),
		complete: {
			genre: (arg, context) => {
				const genres = ['fantasy', 'sci-fi', 'mystery', 'romance', 'thriller'];
				const filtered = genres.filter(g => g.startsWith(arg.toLowerCase()));
				
				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false
					}
				};
			},
			length: (arg, context) => {
				const lengths = ['short', 'medium', 'long'];
				const filtered = lengths.filter(l => l.includes(arg));
				
				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false
					}
				};
			},
			character: (arg, context) => {
				// Dynamic completion based on genre
				const characters = {
					fantasy: ['wizard', 'dragon', 'knight', 'elf'],
					'sci-fi': ['robot', 'alien', 'cyborg', 'space-explorer'],
					mystery: ['detective', 'suspect', 'witness', 'victim'],
					default: ['hero', 'villain', 'sidekick', 'mentor']
				};
				
				const genre = context.params?.genre || 'default';
				const charList = characters[genre] || characters.default;
				const filtered = charList.filter(c => c.includes(arg));
				
				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false
					}
				};
			}
		}
	},
	async (input) => {
		return {
			description: `A ${input.length} ${input.genre} story featuring a ${input.character}`,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Write a ${input.length} ${input.genre} story featuring a ${input.character}.`
					}
				}
			]
		};
	}
);
```

#### Resource Template Completion

```javascript
server.template(
	{
		name: 'user-profile',
		description: 'Get user profile by ID',
		uri: 'users/{userId}/profile',
		complete: {
			userId: (arg, context) => {
				// Filter users based on the current input
				const allUsers = ['user1', 'user2', 'user3', 'admin-user'];
				const filtered = allUsers.filter(id => id.includes(arg));
				
				return {
					completion: {
						values: filtered.slice(0, 10), // Limit to 10 results
						total: filtered.length,
						hasMore: filtered.length > 10
					}
				};
			},
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

#### Advanced Completion Examples

```javascript
// Completion with async data fetching
server.template(
	{
		name: 'project-files',
		description: 'Access project files by path',
		uri: 'projects/{projectId}/files/{filePath}',
		complete: {
			projectId: (arg, context) => {
				// Static list of project IDs
				const projects = ['web-app', 'mobile-app', 'api-server'];
				const filtered = projects.filter(p => p.includes(arg));
				
				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false
					}
				};
			},
			filePath: async (arg, context) => {
				// Dynamic file path completion based on project
				const projectId = context.params?.projectId;
				if (!projectId) {
					return {
						completion: {
							values: [],
							total: 0,
							hasMore: false
						}
					};
				}
				
				// Simulate fetching files from filesystem
				const files = await getProjectFiles(projectId);
				const filtered = files.filter(f => f.includes(arg));
				
				return {
					completion: {
						values: filtered.slice(0, 20),
						total: filtered.length,
						hasMore: filtered.length > 20
					}
				};
			}
		}
	},
	async (uri, params) => {
		const content = await readProjectFile(params.projectId, params.filePath);
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: content
				}
			]
		};
	}
);

// Completion with pagination support
server.prompt(
	{
		name: 'search-documents',
		description: 'Search through large document collection',
		schema: z.object({
			query: z.string(),
			category: z.string()
		}),
		complete: {
			category: (arg, context) => {
				// Large category list with pagination
				const allCategories = generateCategoryList(); // Assume this returns 500+ items
				const filtered = allCategories.filter(c => 
					c.toLowerCase().includes(arg.toLowerCase())
				);
				
				return {
					completion: {
						values: filtered.slice(0, 50), // Show first 50 matches
						total: filtered.length,
						hasMore: filtered.length > 50
					}
				};
			}
		}
	},
	async (input) => {
		const results = await searchDocuments(input.query, input.category);
		return {
			description: `Search results for "${input.query}" in ${input.category}`,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Found ${results.length} documents matching "${input.query}"`
					}
				}
			]
		};
	}
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
		const result = await createUser(user, preferences, tags);
		return {
			content: [{ 
				type: 'text', 
				text: `User created: ${user.name} (${user.email})` 
			}]
		};
	},
);
```

## Contributing

Contributions are welcome! Please see our [contributing guidelines](../../CONTRIBUTING.md) for details.

## License

MIT © Paolo Ricciuti
