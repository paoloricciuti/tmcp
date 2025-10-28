# @tmcp/session-manager-durable-objects

Cloudflare Durable Objects and KV-based session managers for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides distributed managers that use Durable Objects with WebSocket hibernation for streaming traffic and Cloudflare KV for session metadata, making it perfect for serverless edge deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-durable-objects
```

## Overview

`DurableObjectStreamSessionManager` keeps long-lived EventSource/WebSocket style connections inside a Durable Object and leverages hibernation so the object can be evicted when idle. `KVInfoSessionManager` stores client capabilities, info, log levels, and resource subscriptions inside a Cloudflare KV namespace so each stateless POST can hydrate the MCP context.

## Setup

### 1. Durable Object Configuration

Create a `wrangler.toml` file in your project root:

```toml
name = "my-tmcp-server"
main = "src/index.js"
compatibility_date = "2024-12-01"

[[durable_objects.bindings]]
name = "TMCP_DURABLE_OBJECT"
class_name = "SyncLayer"

[[kv_namespaces]]
binding = "TMCP_SESSION_INFO"
id = "your_kv_namespace_id"
preview_id = "your_kv_namespace_preview_id"

[[migrations]]
tag = "v1"
new_classes = ["SyncLayer"]

# Create the KV namespace before deploying:
# wrangler kv:namespace create TMCP_SESSION_INFO
```

### 2. Worker Script Setup

```javascript
// src/index.js
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcp/transport-http';
import {
	DurableObjectStreamSessionManager,
	KVInfoSessionManager,
	SyncLayer,
} from '@tmcp/session-manager-durable-objects';

const server = new McpServer(...);

// Your MCP server setup here
server.tool(
	{
		name: 'example_tool',
		description: 'An example tool',
	},
	async () => {
		return { result: 'Hello from the edge!' };
	},
);

const sessionManager = {
	streams: new DurableObjectStreamSessionManager('TMCP_DURABLE_OBJECT'),
	info: new KVInfoSessionManager('TMCP_SESSION_INFO'),
};
const transport = new HttpTransport(server, { sessionManager });


// Export the Durable Object class
export { SyncLayer };

// Export the default handler
export default {
	async fetch(request, env, ctx) {
		return await transport.respond(request);
	},
};
```

### 3. Custom Binding Name

If you prefer a different binding name:

```javascript
// In wrangler.toml
[[durable_objects.bindings]];
name = 'MY_CUSTOM_BINDING';
class_name = 'SyncLayer';

[[kv_namespaces]];
binding = 'MY_SESSION_INFO_KV';
id = 'your_kv_namespace_id';

// In your code
const sessionManager = {
	streams: new DurableObjectStreamSessionManager('MY_CUSTOM_BINDING'),
	info: new KVInfoSessionManager('MY_SESSION_INFO_KV'),
};
```

## How It Works

The stream manager relies on Cloudflare's WebSocket hibernation feature:

1. **WebSocket Connections**: Each session establishes a WebSocket connection to the Durable Object
2. **Hibernation**: When inactive, the Durable Object can be evicted from memory while keeping WebSocket connections open
3. **Automatic Revival**: When messages arrive, the Durable Object is automatically recreated and connection state is restored

The info manager persists metadata in Cloudflare KV:

1. **Client Info & Capabilities**: Stored under namespaced keys such as `tmcp:client_info:{id}` so every POST can repopulate `sessionInfo`
2. **Log Levels**: Tracks per-session logging level without needing the Durable Object to be awake
3. **Resource Subscriptions**: Maintains lightweight sets allowing broadcast notifications to resolve the correct sessions

## API

### `DurableObjectStreamSessionManager`

- `new DurableObjectStreamSessionManager(binding?: string)` – binding defaults to `TMCP_DURABLE_OBJECT`
- `create(id, controller)` – connects to the Durable Object, establishes a WebSocket, and tracks the session
- `delete(id)` – tells the Durable Object to close the WebSocket and forget the session
- `has(id)` – queries the Durable Object for an active WebSocket
- `send(sessions, data)` – forwards payloads through the Durable Object so the right connections receive them

### `KVInfoSessionManager`

- `new KVInfoSessionManager(binding?: string)` – binding should reference a Cloudflare KV namespace (default `TMCP_SESSION_INFO`)
- `setClientInfo(id, info)` / `getClientInfo(id)` – persist client metadata in KV
- `setClientCapabilities(id, capabilities)` / `getClientCapabilities(id)` – cache negotiated capabilities
- `setLogLevel(id, level)` / `getLogLevel(id)` – store the active log level per session
- `addSubscription(id, uri)` / `getSubscriptions(uri)` – maintain subscription membership keyed by URI
- `delete(id)` – remove all KV entries related to the session

### `SyncLayer` (Durable Object)

The `SyncLayer` class extends `DurableObject` and provides:

- **WebSocket Hibernation**: Automatic hibernation and revival of connections
- **Session Management**: Tracking and managing multiple WebSocket connections
- **Message Broadcasting**: Efficient message delivery to specific sessions or all sessions
- **State Persistence**: Automatic restoration of connection state after hibernation

## Deployment

### Development

```bash
pnpm wrangler dev
```

### Production

```bash
pnpm wrangler deploy
```

### Environment Variables

The session manager automatically uses the Cloudflare Workers environment to access Durable Object bindings. No additional configuration is required beyond the `wrangler.toml` setup.

## Advanced Configuration

### Custom Session ID Generation

Sessions are identified by URL parameters or auto-generated UUIDs:

```javascript
// The Durable Object automatically handles session ID extraction
// from URL parameters: ?session_id=your-custom-id
```

## Related Packages

- [`@tmcp/session-manager`](../session-manager) - Base session manager interface and in-memory implementation
- [`@tmcp/session-manager-redis`](../session-manager-redis) - Redis-based session manager for traditional deployments
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
