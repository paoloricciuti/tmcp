# @tmcpkit/transport-http

An HTTP transport implementation for TMCP (TypeScript Model Context Protocol) servers. This package provides HTTP Streaming based communication for MCP servers over HTTP, enabling web-based clients to interact with your MCP server through standard HTTP requests.

## Installation

```bash
npm install @tmcpkit/transport-http tmcp
# or
pnpm add @tmcpkit/transport-http tmcp
# or
yarn add @tmcpkit/transport-http tmcp
```

## Usage

### Basic Setup

```javascript
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcpkit/transport-http';

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

// Create the HTTP transport
const transport = new HttpTransport(server);

// Use with your preferred HTTP server
// Example with Node.js built-in server:
import { createServer } from 'http';

const httpServer = createServer(async (req, res) => {
	if (req.method === 'POST' && req.url === '/mcp') {
		try {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', async () => {
				const request = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: req.headers,
					body: body,
				});

				const response = await transport.respond(request);

				// Copy response to Node.js response
				response.headers.forEach((value, key) => {
					res.setHeader(key, value);
				});
				res.statusCode = response.status;

				const reader = response.body.getReader();
				const pump = async () => {
					const { done, value } = await reader.read();
					if (done) {
						res.end();
						return;
					}
					res.write(value);
					pump();
				};
				pump();
			});
		} catch (error) {
			res.statusCode = 500;
			res.end('Internal Server Error');
		}
	} else {
		res.statusCode = 404;
		res.end('Not Found');
	}
});

httpServer.listen(3000, () => {
	console.log('MCP HTTP server listening on port 3000');
});
```

### With Custom Session Management

```javascript
const transport = new HttpTransport(server, {
	getSessionId: () => {
		// Custom session ID generation
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	},
});
```

## Features

- **🌐 HTTP/SSE Communication**: Uses Server-Sent Events for real-time bidirectional communication
- **🔄 Session Management**: Maintains client sessions with automatic session ID generation
- **📡 Streaming Responses**: Supports streaming responses through SSE
- **🔧 Framework Agnostic**: Works with any HTTP server framework (Fastify, Bun, Deno, etc.)
- **⚡ Real-time Updates**: Server can push notifications and updates to connected clients
- **🛡️ Error Handling**: Graceful error handling for malformed requests

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
}
```

#### Methods

##### `respond(request: Request): Promise<Response>`

Processes an HTTP request and returns a Response with Server-Sent Events.

**Parameters:**

- `request` - A Web API Request object containing the JSON-RPC message

**Returns:**

- A Response object with SSE stream for ongoing communication

## Protocol Details

### Request Format

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

### Response Format

The server responds with Server-Sent Events:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
mcp-session-id: generated-or-provided-session-id

data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}

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
import { HttpTransport } from '@tmcpkit/transport-http';

const server = new McpServer(/* ... */);
const transport = new HttpTransport(server);

Bun.serve({
	port: 3000,
	async fetch(req) {
		if (req.method === 'POST' && new URL(req.url).pathname === '/mcp') {
			return await transport.respond(req);
		}
		return new Response('Not Found', { status: 404 });
	},
});
```

### Deno

```javascript
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcpkit/transport-http';

const server = new McpServer(/* ... */);
const transport = new HttpTransport(server);

Deno.serve({ port: 3000 }, async (req) => {
	if (req.method === 'POST' && new URL(req.url).pathname === '/mcp') {
		return await transport.respond(req);
	}
	return new Response('Not Found', { status: 404 });
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
- [`@tmcpkit/transport-stdio`](../transport-stdio) - Standard I/O transport
- [`@tmcpkit/adapter-zod`](../adapter-zod) - Zod schema adapter
- [`@tmcpkit/adapter-valibot`](../adapter-valibot) - Valibot schema adapter

## License

MIT
