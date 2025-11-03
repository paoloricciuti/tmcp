# @tmcp/transport-in-memory

In-memory transport for testing MCP servers.

## Installation

```bash
pnpm add -D @tmcp/transport-in-memory
```

## Overview

`@tmcp/transport-in-memory` provides an in-memory transport layer for testing MCP (Model Context Protocol) servers without the need for actual network connections or stdio communication. It's designed to make testing MCP servers fast, reliable, and straightforward.

## Features

- **In-Memory Communication**: No network overhead, perfect for unit and integration tests
- **Session Management**: Full support for multiple concurrent sessions
- **Message Capture**: Automatically captures all sent and broadcast messages for verification
- **Custom Context Support**: Type-safe custom context passing via generics
- **Complete MCP API**: All MCP protocol methods supported
- **Subscription Tracking**: Monitors resource subscriptions per session

## Basic Usage

```javascript
import { McpServer } from 'tmcp';
import { InMemoryTransport } from '@tmcp/transport-in-memory';

// Create your MCP server
const server = new McpServer({
	name: 'test-server',
	version: '1.0.0',
});

// Add a tool
server.tool(
	{
		name: 'greet',
		description: 'Greet someone',
		inputSchema: {
			type: 'object',
			properties: {
				name: { type: 'string' },
			},
			required: ['name'],
		},
	},
	async ({ name }) => {
		return {
			content: [
				{
					type: 'text',
					text: `Hello, ${name}!`,
				},
			],
		};
	},
);

// Create transport and session
const transport = new InMemoryTransport(server);
const session = transport.session();

// Initialize the connection
await session.initialize(
	'2024-11-05',
	{ elicitation: {} },
	{ name: 'test-client', version: '1.0.0' },
);

// Call the tool
const result = await session.callTool('greet', { name: 'World' });
console.log(result.content[0].text); // "Hello, World!"

// Clean up
session.close();
transport.close();
```

## API Reference

### `InMemoryTransport`

The main transport class that manages server communication and sessions.

#### Constructor

```javascript
new InMemoryTransport(server);
```

- `server`: `McpServer` - The MCP server instance to test

#### Properties

- `server`: `McpServer` - Get the underlying server instance

#### Methods

##### `session(session_id?)`

Get or create a session.

```javascript
const session = transport.session(); // Auto-generated ID
const session2 = transport.session('custom-id'); // Custom ID
```

##### `request(method, params?, sessionId?, ctx?)`

Send a low-level JSON-RPC request (prefer using Session methods).

```javascript
await transport.request('tools/list', {}, session_id);
```

##### `response(request_id, result?, error?, sessionId?, ctx?)`

Send a response to a server-initiated request.

```javascript
await transport.response(123, { accepted: true });
```

##### `clear()`

Clear all captured messages for all sessions.

```javascript
transport.clear();
```

##### `close()`

Close all sessions and clean up event listeners.

```javascript
transport.close();
```

### `Session`

A session represents a single client connection to the server.

#### Properties

- `sessionId`: `string` - The session identifier
- `sentMessages`: `JSONRPCRequest[]` - All messages sent by the server (excluding broadcasts)
- `lastRequest`: `JSONRPCRequest | undefined` - The most recent request sent by the server
- `broadcastMessages`: `JSONRPCRequest[]` - All broadcast messages sent by the server
- `sessionInfo`: `Partial<Context["sessionInfo"]>` - Current session information
- `subscriptions`: `Subscriptions` - Current resource subscriptions

#### MCP Protocol Methods

##### `initialize(protocolVersion, capabilities, clientInfo, ctx?)`

Initialize the MCP connection.

```javascript
await session.initialize(
	'2024-11-05',
	{ tools: {}, prompts: {}, resources: {} },
	{ name: 'my-client', version: '1.0.0' },
);
```

##### `ping(ctx?)`

Ping the server.

```javascript
await session.ping();
```

##### `listTools(params?, ctx?)`

List all available tools.

```javascript
const { tools, nextCursor } = await session.listTools();
const morePage = await session.listTools({ cursor: nextCursor });
```

##### `callTool(name, args?, ctx?)`

Call a tool by name.

```javascript
const result = await session.callTool('my-tool', {
	param1: 'value1',
	param2: 42,
});
```

##### `listPrompts(params?, ctx?)`

List all available prompts.

```javascript
const { prompts } = await session.listPrompts();
```

##### `getPrompt(name, args?, ctx?)`

Get a prompt with optional arguments.

```javascript
const result = await session.getPrompt('my-prompt', {
	arg1: 'value1',
});
```

##### `listResources(params?, ctx?)`

List all available resources.

```javascript
const { resources } = await session.listResources();
```

##### `listResourceTemplates(params?, ctx?)`

List all resource templates.

```javascript
const { resourceTemplates } = await session.listResourceTemplates();
```

##### `readResource(uri, ctx?)`

Read a resource by URI.

```javascript
const resource = await session.readResource('file:///path/to/resource');
```

##### `subscribeResource(uri, ctx?)`

Subscribe to resource updates.

```javascript
await session.subscribeResource('file:///path/to/resource');
```

##### `unsubscribeResource(uri, ctx?)`

Unsubscribe from resource updates.

```javascript
await session.unsubscribeResource('file:///path/to/resource');
```

##### `complete(ref, argument, context?, ctx?)`

Request completion suggestions.

```javascript
const result = await session.complete(
	{ type: 'ref/prompt', name: 'my-prompt' },
	{ name: 'param1', value: 'part' },
	{ arguments: { param2: 'value' } },
);
```

##### `setLogLevel(level, ctx?)`

Set the logging level.

```javascript
await session.setLogLevel('debug');
```

##### `response(request_id, result?, error?, ctx?)`

Respond to a server-initiated request.

```javascript
// Get the request from sentMessages or lastRequest
const request = session.lastRequest;
await session.response(request.id, { accepted: true });
```

#### Session Management Methods

##### `clear()`

Clear all captured messages for this session.

```javascript
session.clear();
```

##### `close()`

Close the session and clean up event listeners.

```javascript
session.close();
```

## Custom Context

You can pass custom context through all requests using TypeScript generics:

```ts
const server = new McpServer({ name: 'test', version: '1.0.0' }).withContext<{
	userId: string;
	requestId: string;
}>();

const transport = new InMemoryTransport(server);
const session = transport.session();

// Pass custom context
await session.callTool(
	'my-tool',
	{ param: 'value' },
	{ userId: '123', requestId: 'abc' },
);
```

## Testing Examples

### Testing Tool Execution

```ts
import { test } from 'node:test';
import assert from 'node:assert';
import { McpServer } from 'tmcp';
import { InMemoryTransport } from '@tmcp/transport-in-memory';
import * as v from 'valibot';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';

test('tool returns correct result', async () => {
	const server = new McpServer(
		{ name: 'test', version: '1.0.0' },
		{
			adapter: new ValibotJsonSchemaAdapter(),
			capabilities: { tools: {} },
		},
	);

	server.tool(
		{
			name: 'add',
			description: 'Add two numbers',
			schema: v.object({
				a: v.number(),
				b: v.number(),
			}),
		},
		async ({ a, b }) => {
			return {
				content: [{ type: 'text', text: String(a + b) }],
			};
		},
	);

	const transport = new InMemoryTransport(server);
	const session = transport.session();

	await session.initialize(
		'2024-11-05',
		{ tools: {} },
		{ name: 'test', version: '1.0.0' },
	);

	const result = await session.callTool('add', { a: 2, b: 3 });

	assert.strictEqual(result.content[0].text, '5');

	session.close();
	transport.close();
});
```

### Testing Multiple Sessions and Response

```ts
const server = new McpServer(
	{ name: 'test', version: '1.0.0' },
	{
		adapter: undefined,
		capabilities: {
			tools: {},
		},
	},
);

server.tool(
	{
		name: 'test',
		description: 'A test tool',
	},
	async () => {
		console.log('Tool executed');
		await server.refreshRoots();
		return {
			content: [{ type: 'text', text: JSON.stringify(server.roots) }],
		};
	},
);
const transport = new InMemoryTransport(server);

const session1 = transport.session('session-1');
const session2 = transport.session('session-2');

await session1.initialize(
	'2024-11-05',
	{ roots: {} },
	{ name: 'client-1', version: '1.0.0' },
);
await session2.initialize(
	'2024-11-05',
	{ roots: {} },
	{ name: 'client-2', version: '1.0.0' },
);

const toolCall = session1.callTool('test');

if (session1.lastRequest?.id) {
	await session1.response(session1.lastRequest.id, {
		roots: ['file:///folder'],
	});
	const result = await toolCall;
	if (result?.content?.[0].type === 'text') {
		assert.equal(result?.content?.[0].text, '["file:///folder"]');
	} else {
		assert.fail('Unexpected tool result');
	}
}

assert.equal(session1.sentMessages.length, 1);
assert.equal(session2.sentMessages.length, 0);

session1.close();
session2.close();
transport.close();
```

## License

MIT
