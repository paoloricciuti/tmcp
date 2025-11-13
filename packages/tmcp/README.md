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
```

## Quick Start

```javascript
import { McpServer } from 'tmcp';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
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

// While the adapter is optional (you can opt out by explicitly passing `adapter: undefined`)
// without an adapter the server cannot accept inputs, produce structured outputs, or request
// elicitations at all only do this for very simple servers.

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
				return {
					content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }],
				};
			case 'subtract':
				return {
					content: [{ type: 'text', text: `${a} - ${b} = ${a - b}` }],
				};
			case 'multiply':
				return {
					content: [{ type: 'text', text: `${a} × ${b} = ${a * b}` }],
				};
			case 'divide':
				return {
					content: [{ type: 'text', text: `${a} ÷ ${b} = ${a / b}` }],
				};
		}
	},
);

// Process incoming requests
server.receive(request);
```

## Return helpers to skip boilerplate

Even the tiny calculator tool above ends with four near-identical `return { content: [{ type: 'text', text: ... }] }` blocks. Most MCP handlers have to build the same shapes: `CallToolResult`, `ReadResourceResult`, `GetPromptResult`, or `CompleteResult`. Writing them by hand is repetitive boilerplate. The `tmcp/utils` entry point ships a handful of factories that emit the correct shape for you.

```ts
import { tool, resource, prompt, complete } from 'tmcp/utils';

// Without helpers – lots of envelope noise
server.tool(
	{ name: 'health-check', description: 'A health check tool' },
	async () => ({
		content: [{ type: 'text', text: 'ok' }],
	}),
);

// With helpers – just describe the payload once
server.tool(
	{ name: 'health-check', description: 'A health check tool' },
	async () => tool.text('ok'),
);

server.tool(
	{ name: 'profile-picture', description: 'Your profile picture' },
	async () => tool.media('image', await loadPng(), 'image/png'),
);

server.tool(
	{
		name: 'get-images',
		description:
			'Get the orders details and the images of all the products',
		schema: v.object({
			items: v.array(ItemsSchema),
		}),
	},
	async () => {
		const orders = await loadOrders();
		const images = await loadImages(orders);

		return tool.mix(
			[
				tool.text("Here's your images"),
				...images.map((img) => tool.media('image', img)),
			],
			orders,
		);
	},
);

server.resource(
	{
		name: 'readme',
		description: 'Top-level README',
		uri: 'file://README.md',
	},
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
		description: 'Supports completion',
		uri: 'users/{id}',
		complete: {
			id: async (arg) =>
				complete.values(await findMatchingIds(arg), false),
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

### Helper catalog

- `tool` – build `CallToolResult` objects via `text`, `error`, `media`, `resource`, `resourceLink`, `structured`, and `mix` (merge multiple kind of tool response).
- `resource` – return `ReadResourceResult` through `text`, `blob`, or `mix` (merge `resource.text` and `resource.blob`).
- `prompt` – generate `GetPromptResult` using `message` (single string), `messages` (array of strings), `text`, `media`, `resource`, `resourceLink` and `mix` (merge multiple kind of tool response).
- `complete` – create `CompleteResult` payloads with `values(list, hasMore?, total?)`.

All helpers are typed, so TypeScript will prevent you from returning malformed payloads while cutting down the repetitive envelopes that used to appear in almost every handler.

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

`sessionInfo` contains the latest `clientCapabilities`, `clientInfo`, and `logLevel` reported by the connected client. Built-in transports populate it automatically, so every handler can branch on client features without additional bookkeeping.

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

##### `withContext<T>()`

Specify the type of custom context for type-safe access to application-specific data.

```javascript
interface MyCustomContext {
    userId: string;
    permissions: string[];
    database: DatabaseConnection;
}

const server = new McpServer(serverInfo, options).withContext<MyCustomContext>();

// Now you can access typed custom context in handlers
server.tool(
    {
        name: 'get-user-data',
        description: 'Get current user data',
    },
    async () => {
        const { userId, database } = server.ctx.custom!;
        const userData = await database.users.findById(userId);
        return {
            content: [{ type: 'text', text: JSON.stringify(userData) }],
        };
    },
);
```

##### `ctx`

Access the current request context, including session ID, auth info, client metadata, and custom context.

```javascript
server.tool(
	{
		name: 'context-aware-tool',
		description: 'Tool that uses request context',
	},
	async () => {
		const { sessionId, auth, sessionInfo, custom } = server.ctx;

		if (!custom?.userId) {
			throw new Error('User authentication required');
		}

		if (sessionInfo?.clientInfo) {
			console.log(`Serving ${sessionInfo.clientInfo.name}`);
		}

		return {
			content: [
				{
					type: 'text',
					text: `Hello user ${custom.userId} in session ${sessionId}`,
				},
			],
		};
	},
);
```

##### `receive(request, context?)`

Process an incoming MCP request with optional context.

```javascript
// Basic usage
const response = server.receive(jsonRpcRequest);

// With custom context (typically used by transports)
const response = server.receive(jsonRpcRequest, {
	sessionId: 'session-123',
	auth: authInfo,
	sessionInfo: {
		clientCapabilities,
		clientInfo,
		logLevel,
	},
	custom: customContextData,
});
```

##### `request({ method, params })`

Send a raw JSON-RPC request to the connected client. This lets you call
experimental MCP APIs or proprietary extensions before they gain a dedicated
method on `McpServer` or to send a request with a custom JSON-schema that is not expressible with your validation library.

```javascript
const response = await server.request({
	method: 'elicitation/create',
	params: {
		message: 'Describe the deployment plan',
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
			content: { type: 'text', text: 'Hello!' },
		},
	],
});
```

##### `refreshRoots()`

Refresh the roots list from the client.

```javascript
await server.refreshRoots();
console.log(server.roots); // Access current roots
```

##### `changed(type, id)`

Send notifications for subscriptions. When you call `changed('resource', uri)` the server now emits a broadcast notification, and the built-in transports look up which sessions subscribed to that URI before delivering it.

```javascript
server.changed('resource', 'file://path/to/resource');
```

##### `progress(progress, total?, message?)`

Report progress during long-running operations. Progress notifications are only sent when a progress token is provided by the client in the request's `_meta.progressToken` field.

```javascript
server.tool(
	{
		name: 'process-large-file',
		description: 'Process a large file with progress updates',
	},
	async (input) => {
		const totalSteps = 100;

		for (let i = 0; i <= totalSteps; i++) {
			// Report progress with current step, total steps, and optional message
			server.progress(
				i,
				totalSteps,
				`Processing step ${i}/${totalSteps}`,
			);

			// Simulate work
			await processStep(i);
		}

		return {
			content: [{ type: 'text', text: 'Processing complete!' }],
		};
	},
);
```

**Parameters:**

- `progress` (number): Current progress value (should be ≤ total and always increase)
- `total` (number, optional): Maximum progress value (defaults to 1)
- `message` (string, optional): Descriptive message about current progress

**Notes:**

- Progress notifications are only sent when the client provides a `progressToken` in the request
- Progress values should be monotonically increasing within a single operation
- Each session maintains its own progress context

##### `log(level, data, logger?)`

Send log messages to connected clients when logging is enabled.

```javascript
// Log at different severity levels
server.log('info', 'Server started successfully');
server.log('warning', 'Configuration missing, using defaults');
server.log('error', 'Failed to connect to database', 'database-logger');
```

**Parameters:**

- `level` (string): Log level ('debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency')
- `data` (any): Data to log
- `logger` (string, optional): Logger name/category

##### `on(event, callback)`

Listen to server events.

Available events:

- `initialize` – fired after the client handshake with the parsed initialize payload
- `send` – emitted for point-to-point responses/notifications destined for the active session
- `broadcast` – emitted for fan-out notifications (for example `notifications/resources/updated`)
- `subscription` – raised when the client subscribes to a resource URI
- `loglevelchange` – fired when the client requests a different log level

```javascript
server.on('initialize', ({ clientInfo }) => {
	console.log('Client initialized:', clientInfo?.name);
});

server.on('send', ({ request }) => {
	console.log('Sending message:', request);
});

server.on('broadcast', ({ request }) => {
	console.log('Broadcasting:', request.method);
});
```

## Advanced Examples

### Progress Reporting

Provide real-time progress updates for long-running operations:

```javascript
server.tool(
	{
		name: 'analyze-codebase',
		description: 'Analyze a large codebase with progress tracking',
		schema: z.object({
			path: z.string(),
			includeTests: z.boolean().default(false),
		}),
	},
	async ({ path, includeTests }) => {
		// Discover files to analyze
		const files = await discoverFiles(path, includeTests);
		const totalFiles = files.length;

		server.progress(0, totalFiles, 'Starting analysis...');

		const results = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			// Update progress with current file being processed
			server.progress(
				i + 1,
				totalFiles,
				`Analyzing ${file} (${i + 1}/${totalFiles})`,
			);

			// Analyze the file
			const analysis = await analyzeFile(file);
			results.push(analysis);
		}

		// Final progress update
		server.progress(totalFiles, totalFiles, 'Analysis complete!');

		return {
			content: [
				{
					type: 'text',
					text: `Analyzed ${totalFiles} files. Found ${results.length} issues.`,
				},
			],
			structuredContent: {
				totalFiles,
				results,
				issues: results.length,
			},
		};
	},
);

// Progress also works in prompts and resources
server.prompt(
	{
		name: 'generate-report',
		description: 'Generate a comprehensive report',
		schema: z.object({
			sections: z.array(z.string()),
		}),
	},
	async ({ sections }) => {
		const messages = [];

		for (let i = 0; i < sections.length; i++) {
			server.progress(
				i,
				sections.length,
				`Generating section: ${sections[i]}`,
			);

			const content = await generateSection(sections[i]);
			messages.push({
				role: 'user',
				content: { type: 'text', text: content },
			});
		}

		server.progress(sections.length, sections.length, 'Report complete');
		return { messages };
	},
);
```

### Client Interaction Features

```javascript
// Elicitation - Request structured data from client
const userData = await server.elicitation(
	z.object({
		name: z.string(),
		age: z.number(),
		preferences: z.array(z.string()),
	}),
);

// Message sampling - Request AI responses
const aiResponse = await server.message({
	messages: [
		{
			role: 'user',
			content: { type: 'text', text: 'Explain quantum computing' },
		},
	],
	maxTokens: 100,
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

server.on('send', ({ request }) => {
	console.log('Outgoing request:', request.method);
});

server.on('broadcast', ({ request }) => {
	if (request.method === 'notifications/resources/updated') {
		console.log('Resource updated:', request.params.uri);
	}
});
```

### Resource Subscriptions

```javascript
// Subscribe to resource changes
server.resource(
	{
		name: 'file-watcher',
		description: 'Watch file changes',
		uri: 'file://watched/file.txt',
	},
	async (uri) => {
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: await readFile(uri),
				},
			],
		};
	},
);

// Notify subscribers when resource changes
server.changed('resource', 'file://watched/file.txt');
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
				const genres = [
					'fantasy',
					'sci-fi',
					'mystery',
					'romance',
					'thriller',
				];
				const filtered = genres.filter((g) =>
					g.startsWith(arg.toLowerCase()),
				);

				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false,
					},
				};
			},
			length: (arg, context) => {
				const lengths = ['short', 'medium', 'long'];
				const filtered = lengths.filter((l) => l.includes(arg));

				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false,
					},
				};
			},
			character: (arg, context) => {
				// Dynamic completion based on genre
				const characters = {
					fantasy: ['wizard', 'dragon', 'knight', 'elf'],
					'sci-fi': ['robot', 'alien', 'cyborg', 'space-explorer'],
					mystery: ['detective', 'suspect', 'witness', 'victim'],
					default: ['hero', 'villain', 'sidekick', 'mentor'],
				};

				const genre = context.params?.genre || 'default';
				const charList = characters[genre] || characters.default;
				const filtered = charList.filter((c) => c.includes(arg));

				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false,
					},
				};
			},
		},
	},
	async (input) => {
		return {
			description: `A ${input.length} ${input.genre} story featuring a ${input.character}`,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Write a ${input.length} ${input.genre} story featuring a ${input.character}.`,
					},
				},
			],
		};
	},
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
				const filtered = allUsers.filter((id) => id.includes(arg));

				return {
					completion: {
						values: filtered.slice(0, 10), // Limit to 10 results
						total: filtered.length,
						hasMore: filtered.length > 10,
					},
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
				const filtered = projects.filter((p) => p.includes(arg));

				return {
					completion: {
						values: filtered,
						total: filtered.length,
						hasMore: false,
					},
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
							hasMore: false,
						},
					};
				}

				// Simulate fetching files from filesystem
				const files = await getProjectFiles(projectId);
				const filtered = files.filter((f) => f.includes(arg));

				return {
					completion: {
						values: filtered.slice(0, 20),
						total: filtered.length,
						hasMore: filtered.length > 20,
					},
				};
			},
		},
	},
	async (uri, params) => {
		const content = await readProjectFile(
			params.projectId,
			params.filePath,
		);
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: content,
				},
			],
		};
	},
);

// Completion with pagination support
server.prompt(
	{
		name: 'search-documents',
		description: 'Search through large document collection',
		schema: z.object({
			query: z.string(),
			category: z.string(),
		}),
		complete: {
			category: (arg, context) => {
				// Large category list with pagination
				const allCategories = generateCategoryList(); // Assume this returns 500+ items
				const filtered = allCategories.filter((c) =>
					c.toLowerCase().includes(arg.toLowerCase()),
				);

				return {
					completion: {
						values: filtered.slice(0, 50), // Show first 50 matches
						total: filtered.length,
						hasMore: filtered.length > 50,
					},
				};
			},
		},
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
						text: `Found ${results.length} documents matching "${input.query}"`,
					},
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
		const result = await createUser(user, preferences, tags);
		return {
			content: [
				{
					type: 'text',
					text: `User created: ${user.name} (${user.email})`,
				},
			],
		};
	},
);
```

## Dynamic Enabling/Disabling

All MCP capabilities (tools, prompts, resources, templates) support dynamic enabling and disabling through the `enabled` function. This allows you to conditionally show or hide capabilities based on runtime conditions, user permissions, or any other logic.

### Basic Usage

The `enabled` function is called before each list operation and determines whether the capability should be included in the response:

```javascript
server.tool(
	{
		name: 'admin-only-tool',
		description: 'Administrative tool',
		enabled: () => {
			// Only show this tool if user is admin
			return getCurrentUser().isAdmin;
		},
	},
	async (input) => {
		return { content: [{ type: 'text', text: 'Admin action completed' }] };
	},
);
```

### Async Enabled Functions

The `enabled` function can be synchronous or asynchronous:

```javascript
server.resource(
	{
		name: 'private-document',
		description: 'Access private documents',
		uri: 'private://document.txt',
		enabled: async () => {
			// Check permissions asynchronously
			const user = await getCurrentUser();
			return await hasPermission(user.id, 'read-private-docs');
		},
	},
	async (uri) => {
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: await readPrivateDocument(uri),
				},
			],
		};
	},
);
```

### Context-Aware Enabling

Within the `enabled` function you can read the session context with `server.ctx`, allowing for user-specific or session-specific logic:

```javascript
server.prompt(
	{
		name: 'personalized-prompt',
		description: 'User-specific prompt template',
		enabled: () => {
			// Access session information
			const sessionId = server.ctx.sessionId;
			const userPrefs = getUserPreferences(sessionId);
			return userPrefs.enablePersonalization;
		},
	},
	async (input) => {
		return {
			messages: [
				{
					role: 'user',
					content: { type: 'text', text: 'Personalized content...' },
				},
			],
		};
	},
);
```

or enable something based on client capabilities or info

```javascript
server.prompt(
	{
		name: 'personalized-prompt',
		description: 'Claude Code prompt',
		enabled: () => {
			// Access session information
			const clientInfo = server.ctx.sessionInfo?.clientInfo;
			return clientInfo?.name === 'Claude Code';
		},
	},
	async (input) => {
		return {
			messages: [
				{
					role: 'user',
					content: { type: 'text', text: 'Personalized content...' },
				},
			],
		};
	},
);
```

or

```javascript
server.prompt(
	{
		name: 'fetch-repositories',
		description: 'fetch the repositories of the user',
		enabled: () => {
			// Access session information
			const clientCapabilities =
				server.ctx.sessionInfo?.clientCapabilities;
			return clientCapabilities?.elicitation != null;
		},
	},
	async (input) => {
		const username = await server.elicitation(
			v.object({
				value: v.string(),
			}),
		);
		const repos = await fetchRepos(username.value);
		return {
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Your repositories are ${repos.join(', ')}`,
					},
				},
			],
		};
	},
);
```

### Template Enabling

URI templates also support the `enabled` function:

```javascript
server.template(
	{
		name: 'user-files',
		description: 'Access user-specific files',
		uri: 'users/{userId}/files/{filename}',
		enabled: async () => {
			// Check if file system is available
			return await isFileSystemMounted();
		},
		complete: {
			userId: (arg, context) => ({
				completion: {
					values: ['user1', 'user2', 'user3'],
					total: 3,
					hasMore: false,
				},
			}),
		},
	},
	async (uri, params) => {
		const content = await readUserFile(params.userId, params.filename);
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: content,
				},
			],
		};
	},
);
```

### Error Handling

If an `enabled` function throws an error, the capability will be treated as disabled:

```javascript
server.tool(
	{
		name: 'network-tool',
		description: 'Tool requiring network access',
		enabled: () => {
			// If network check fails, tool is disabled
			if (!checkNetworkConnection()) {
				throw new Error('Network unavailable');
			}
			return true;
		},
	},
	async (input) => {
		return {
			content: [{ type: 'text', text: 'Network operation completed' }],
		};
	},
);
```

### Performance Considerations

- The `enabled` function is called every time a list is requested
- Keep enabled functions lightweight to avoid performance issues
- Consider caching expensive checks when possible
- Async functions add latency to list operations

### Use Cases

Common scenarios where `enabled` functions are useful:

1. **Permission-based access**: Show tools only to authorized users
2. **Feature flags**: Enable/disable features based on configuration
3. **Resource availability**: Hide resources when underlying systems are unavailable
4. **User preferences**: Customize available capabilities per user
5. **Time-based access**: Enable tools only during specific hours
6. **License restrictions**: Limit features based on subscription level

## Contributing

Contributions are welcome! Please see our [contributing guidelines](../../CONTRIBUTING.md) for details.

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT © Paolo Ricciuti
