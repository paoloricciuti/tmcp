# @tmcp/transport-sse

A Server-Sent Events (SSE) transport implementation for TMCP (TypeScript Model Context Protocol) servers. This package provides SSE-based communication for MCP servers, enabling efficient real-time bidirectional communication between clients and servers through standard HTTP with Server-Sent Events.

## Installation

```bash
pnpm add @tmcp/transport-sse tmcp
```

## Usage

### Basic Setup

```javascript
import { McpServer } from 'tmcp';
import { SseTransport } from '@tmcp/transport-sse';

// Create your MCP server
const server = new McpServer(
	{
		name: 'my-sse-server',
		version: '1.0.0',
		description: 'My SSE MCP server',
	},
	{
		adapter: new YourSchemaAdapter(),
		capabilities: {
			tools: { listChanged: true },
			prompts: { listChanged: true },
			resources: { listChanged: true },
		},
	},
);

// Add your tools, prompts, and resources
server.tool(
	{
		name: 'example_tool',
		description: 'An example tool',
	},
	async () => {
		return {
			content: [{ type: 'text', text: 'Hello from SSE!' }],
		};
	},
);

// Create the SSE transport (defaults to '/sse' path for events, '/message' for messages)
const transport = new SseTransport(server);

// Use with your preferred HTTP server
// Example with Node.js built-in server:
import * as http from 'node:http';
import { createRequestListener } from '@remix-run/node-fetch-server';

const httpServer = http.createServer((request)=>{
	const response = await transport.respond(request);
	if(response){
		return response;
	}
	return new Response(null, { status: 404 });
}));

httpServer.listen(3000, () => {
	console.log('MCP SSE server listening on port 3000');
});
```

### With Custom Configuration

```javascript
const transport = new SseTransport(server, {
	// Custom SSE endpoint path (default: '/sse', use null to respond on every path)
	path: '/api/events',
	// Custom message endpoint path (default: '/message')
	endpoint: '/api/message',
	// Custom session ID generation
	getSessionId: () => {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	},
	oauth: OAuth; // an oauth provider generated from @tmcp/auth
});

> [!NOTE]
> In development you'll see a warning when the `path` option is omitted. Upcoming releases will interpret an `undefined` path as "respond on every path", so set the field explicitly (for example `path: '/sse'` or `path: null`) to keep the behaviour you expect.
```

### With Custom Context

You can pass custom context data to your MCP server for each request. This is useful for authentication, user information, database connections, etc.

```javascript
// Define your custom context type
interface MyContext {
    userId: string;
    permissions: string[];
    database: DatabaseConnection;
}

// Create server with custom context
const server = new McpServer(serverInfo, options).withContext<MyContext>();

server.tool(
    {
        name: 'get-user-profile',
        description: 'Get the current user profile',
    },
    async () => {
        // Access custom context in your handler
        const { userId, database } = server.ctx.custom!;
        const profile = await database.users.findById(userId);

        return {
            content: [
                { type: 'text', text: `User profile: ${JSON.stringify(profile)}` }
            ],
        };
    },
);

// Create transport (it will be typed to accept your custom context)
const transport = new SseTransport(server);

// Create transport (it will be typed to accept your custom context)
const transport = new HttpTransport(server);

// then in the handler
const response = await transport.respond(req, {
	userId,
	permissions,
	database: req.locals.db,
});
```

### Session Management

The SSE transport supports custom session managers for different deployment scenarios:

#### In-Memory Sessions (Default)

```javascript
import { InMemorySessionManager } from '@tmcp/session-manager';

const transport = new SseTransport(server, {
	sessionManager: new InMemorySessionManager(), // Default behavior
});
```

#### Redis Sessions (Multi-Server/Serverless)

For deployments across multiple servers or serverless environments where sessions need to be shared:

```javascript
import { RedisSessionManager } from '@tmcp/session-manager-redis';

const transport = new SseTransport(server, {
	sessionManager: new RedisSessionManager('redis://localhost:6379'),
});
```

**When to use Redis sessions:**

- **Multi-server deployments**: When your application runs on multiple servers and clients might connect to different instances
- **Serverless deployments**: When your transport is deployed on serverless platforms where instances are ephemeral (attention, serverless environment generally kills SSE request after a not-so-long amount of time, it's generally preferable to use streaming-http)
- **Load balancing**: When using load balancers that might route requests to different server instances

## API

### `SseTransport`

#### Constructor

```typescript
new SseTransport(server: McpServer, options?: SseTransportOptions)
```

Creates a new SSE transport instance.

**Parameters:**

- `server` - A TMCP server instance to handle incoming requests
- `options` - Optional configuration for the transport

**Options:**

```typescript
interface SseTransportOptions {
	getSessionId?: () => string; // Custom session ID generator
	path?: string | null; // SSE endpoint path (default: '/sse', null responds on every path)
	endpoint?: string; // Message endpoint path (default: '/message')
	oauth?: OAuth; // an oauth provider generated from @tmcp/auth
	sessionManager?: SessionManager; // Custom session manager (default: InMemorySessionManager)
}
```

#### Methods

##### `respond(request: Request, customContext?: T): Promise<Response | null>`

Processes an HTTP request and returns a Response with Server-Sent Events, or null if the request path doesn't match the configured SSE paths.

**Parameters:**

- `request` - A Web API Request object containing the JSON-RPC message
- `customContext` - Optional custom context data to pass to the MCP server for this request

**Returns:**

- A Response object with SSE stream for ongoing communication, or null if the request path doesn't match the SSE endpoints

**HTTP Methods:**

- **GET**: Establishes SSE connection and returns event stream with endpoint information
- **POST**: Processes MCP messages and sends responses through the SSE stream
- **DELETE**: Disconnects sessions and cleans up resources
- **OPTIONS**: Handles CORS preflight requests

##### `close(): void`

Closes all active SSE sessions and cleans up resources.

## Protocol Details

### HTTP Methods

The transport supports four HTTP methods across two endpoints:

#### GET - SSE Event Stream (path: `/sse`)

Establishes a Server-Sent Events connection:

```http
GET /sse?session_id=optional-session-id HTTP/1.1
mcp-session-id: optional-session-id
```

Response: Long-lived SSE stream with endpoint information:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
mcp-session-id: generated-or-provided-session-id

event: endpoint
data: /message?session_id=session-id

data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}

```

#### POST - Message Processing (path: `/message`)

Clients send JSON-RPC messages via HTTP POST requests:

```http
POST /message?session_id=session-id HTTP/1.1
Content-Type: application/json
mcp-session-id: session-id

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Response: Acknowledgment (response sent through SSE stream):

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
mcp-session-id: session-id
```

#### DELETE - Session Disconnect

Disconnects a session and cleans up resources:

```http
DELETE /sse?session_id=session-id HTTP/1.1
mcp-session-id: session-to-disconnect
```

Response:

```http
HTTP/1.1 204 No Content
mcp-session-id: session-to-disconnect
```

### Session Management

- **Session ID**: Can be provided via query parameter or `mcp-session-id` header
- **Automatic Generation**: If no session ID is provided, one is generated automatically
- **Session Persistence**: Sessions persist across multiple requests until the client disconnects
- **Server Notifications**: Server can send notifications to active sessions through SSE

## Framework Examples

### Bun

```javascript
import { McpServer } from 'tmcp';
import { SseTransport } from '@tmcp/transport-sse';

const server = new McpServer(/* ... */);
const transport = new SseTransport(server);

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

### Deno

```javascript
import { McpServer } from 'tmcp';
import { SseTransport } from '@tmcp/transport-sse';

const server = new McpServer(/* ... */);
const transport = new SseTransport(server);

Deno.serve({ port: 3000 }, async (req) => {
	const response = await transport.respond(req);
	if (response === null) {
		return new Response('Not Found', { status: 404 });
	}
	return response;
});
```

### `srvx`

If you want the same experience across Deno, Bun, and Node.js, you can use [srvx](https://srvx.h3.dev/).

```js
import { McpServer } from 'tmcp';
import { SseTransport } from '@tmcp/transport-sse';
import { serve } from 'srvx';

const server = new McpServer(/* ... */);
const transport = new SseTransport(server);

serve({
	async fetch(req) {
		const response = await transport.respond(req);
		if (response === null) {
			return new Response('Not Found', { status: 404 });
		}
		return response;
	},
});
```

## Error Handling

The transport includes comprehensive error handling:

- **Malformed JSON**: Invalid JSON requests return appropriate error responses
- **Content-Type Validation**: Ensures proper `application/json` content type
- **Session Management**: Automatic cleanup of disconnected sessions
- **CORS Handling**: Built-in CORS support for cross-origin requests
- **Server Errors**: Server processing errors are propagated to clients

## Development

```bash
# Install dependencies
pnpm install

# Generate TypeScript declarations
pnpm generate:types

# Lint the code
pnpm lint
```

## Requirements

- Node.js 16+ (for native ES modules and Web API support)
- A TMCP server instance
- An HTTP server framework or runtime
- A schema adapter (Zod, Valibot, etc.)

## Related Packages

- [`tmcp`](../tmcp) - Core TMCP server implementation
- [`@tmcp/transport-http`](../transport-http) - HTTP transport with SSE streaming
- [`@tmcp/transport-stdio`](../transport-stdio) - Standard I/O transport
- [`@tmcp/adapter-zod`](../adapter-zod) - Zod schema adapter
- [`@tmcp/adapter-valibot`](../adapter-valibot) - Valibot schema adapter

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT
