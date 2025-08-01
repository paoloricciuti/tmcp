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
	// Custom SSE endpoint path (default: '/sse')
	path: '/api/events',
	// Custom message endpoint path (default: '/message')
	endpoint: '/api/message',
	// Custom session ID generation
	getSessionId: () => {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	},
	oauth: OAuth; // an oauth provider generated from @tmcp/auth
});
```

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
	path?: string; // SSE endpoint path (default: '/sse')
	endpoint?: string; // Message endpoint path (default: '/message')
}
```

#### Methods

##### `respond(request: Request): Promise<Response | null>`

Processes an HTTP request and returns a Response with Server-Sent Events, or null if the request path doesn't match the configured SSE paths.

**Parameters:**

- `request` - A Web API Request object containing the JSON-RPC message

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

If you want to have the same experience throughout Deno, Bun or Node you can also use `srvx`

```js
import { McpServer } from 'tmcp';
import { SseTransport } from '@tmcp/transport-sse';
import { serve } from 'srvx';

const server = new McpServer(/* ... */);
const transport = new SseTransport(server);

serve(async (req) => {
	const response = await transport.respond(req);
	if (response === null) {
		return new Response('Not Found', { status: 404 });
	}
	return response;
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
