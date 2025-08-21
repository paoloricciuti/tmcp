# @tmcp/transport-http

An HTTP transport implementation for TMCP (TypeScript Model Context Protocol) servers. This package provides HTTP Streaming based communication for MCP servers over HTTP, enabling web-based clients to interact with your MCP server through standard HTTP requests.

## Installation

```bash
pnpm add @tmcp/transport-http tmcp
```

## Usage

### Basic Setup

```javascript
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcp/transport-http';

// Create your MCP server
const server = new McpServer(
	{
		name: 'my-http-server',
		version: '1.0.0',
		description: 'My HTTP MCP server',
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
			content: [{ type: 'text', text: 'Hello from HTTP!' }],
		};
	},
);

// Create the HTTP transport (defaults to '/mcp' path)
const transport = new HttpTransport(server);

// Use with your preferred HTTP server
// Example with Node.js built-in server + @remix-run/
import * as http from 'node:http';
import { createRequestListener } from '@remix-run/node-fetch-server';

let httpServer = http.createServer(createRequestListener((request)=>{
	const response = await transport.respond(request);
	if(response){
		return response;
	}
	return new Response(null, { status: 404 });
}));


httpServer.listen(3000, () => {
	console.log('MCP HTTP server listening on port 3000');
});
```

### With Custom Configuration

```javascript
const transport = new HttpTransport(server, {
	// Custom MCP endpoint path (default: '/mcp')
	path: '/api/mcp',
	// Custom session ID generation
	getSessionId: () => {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	},
});
```

## Features

- **🌐 HTTP/SSE Communication**: Uses Server-Sent Events for real-time bidirectional communication
- **🔄 Session Management**: Maintains client sessions with automatic session ID generation
- **📡 Streaming Responses**: Supports streaming responses through SSE
- **🛤️ Configurable Path**: Customizable MCP endpoint path with automatic filtering
- **🔧 Framework Agnostic**: Works with any HTTP server framework (Fastify, Bun, Deno, etc.)
- **⚡ Real-time Updates**: Server can push notifications and updates to connected clients
- **🛡️ Error Handling**: Graceful error handling for malformed requests
- **🔀 Multiple HTTP Methods**: Supports GET (notifications), POST (messages), and DELETE (disconnect)

## API

### `HttpTransport`

#### Constructor

```typescript
new HttpTransport(server: McpServer, options?: HttpTransportOptions)
```

Creates a new HTTP transport instance.

**Parameters:**

- `server` - A TMCP server instance to handle incoming requests
- `options` - Optional configuration for the transport

**Options:**

```typescript
interface HttpTransportOptions {
	getSessionId: () => string; // Custom session ID generator
	path?: string; // MCP endpoint path (default: '/mcp')
	oauth?: OAuth; // an oauth provider generated from @tmcp/auth
}
```

#### Methods

##### `respond(request: Request): Promise<Response | null>`

Processes an HTTP request and returns a Response with Server-Sent Events, or null if the request path doesn't match the configured MCP path.

**Parameters:**

- `request` - A Web API Request object containing the JSON-RPC message

**Returns:**

- A Response object with SSE stream for ongoing communication, or null if the request path doesn't match the MCP endpoint

**HTTP Methods:**

- **POST**: Processes MCP messages and returns short-lived event stream responses
- **GET**: Establishes long-lived connections for server notifications
- **DELETE**: Disconnects sessions and cleans up resources

## Protocol Details

### HTTP Methods

The transport supports three HTTP methods:

#### POST - Message Processing

Clients send JSON-RPC messages via HTTP POST requests:

```http
POST /mcp HTTP/1.1
Content-Type: application/json
mcp-session-id: optional-session-id

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Response: Short-lived event stream that closes after sending the response:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
mcp-session-id: generated-or-provided-session-id

data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}

```

#### GET - Notification Stream

Establishes long-lived connections for server notifications:

```http
GET /mcp HTTP/1.1
mcp-session-id: optional-session-id
```

Response: Long-lived event stream for server notifications:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
mcp-session-id: generated-or-provided-session-id

data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}

```

#### DELETE - Session Disconnect

Disconnects a session and cleans up resources:

```http
DELETE /mcp HTTP/1.1
mcp-session-id: session-to-disconnect
```

Response:

```http
HTTP/1.1 204 No Content
mcp-session-id: session-to-disconnect
```

### Session Management

- **Session ID Header**: `mcp-session-id`
- **Automatic Generation**: If no session ID is provided, one is generated automatically
- **Session Persistence**: Sessions persist across multiple requests until the client disconnects
- **Server Notifications**: Server can send notifications to all active sessions

## Framework Examples

### Bun

```javascript
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcp/transport-http';

const server = new McpServer(/* ... */);
const transport = new HttpTransport(server);

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
import { HttpTransport } from '@tmcp/transport-http';

const server = new McpServer(/* ... */);
const transport = new HttpTransport(server);

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
import { HttpTransport } from '@tmcp/transport-http';
import { serve } from 'srvx';

const server = new McpServer(/* ... */);
const transport = new HttpTransport(server);

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
- **Session Management**: Automatic cleanup of disconnected sessions
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
- [`@tmcp/transport-stdio`](../transport-stdio) - Standard I/O transport
- [`@tmcp/adapter-zod`](../adapter-zod) - Zod schema adapter
- [`@tmcp/adapter-valibot`](../adapter-valibot) - Valibot schema adapter

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT
