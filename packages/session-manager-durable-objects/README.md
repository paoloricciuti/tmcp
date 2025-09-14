# @tmcp/session-manager-durable-objects

Cloudflare Durable Objects-based session manager for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides a distributed session manager that uses Cloudflare Durable Objects with WebSocket hibernation for session storage and real-time messaging, perfect for serverless edge deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-durable-objects
```

## Overview

The `DurableObjectSessionManager` uses Cloudflare Durable Objects to store and manage client sessions across edge locations. It leverages WebSocket hibernation functionality to maintain persistent connections while allowing the Durable Object to be evicted from memory when inactive, making it extremely efficient for serverless deployments.

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

[[migrations]]
tag = "v1"
new_classes = ["SyncLayer"]
```

### 2. Worker Script Setup

```javascript
// src/index.js
import { McpServer } from 'tmcp';
import { HttpTransport } from '@tmcp/transport-http';
import {
	DurableObjectSessionManager,
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

const sessionManager = new DurableObjectSessionManager();
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

// In your code
const sessionManager = new DurableObjectSessionManager('MY_CUSTOM_BINDING');
```

## How It Works

The Durable Objects session manager uses Cloudflare's WebSocket hibernation feature:

1. **WebSocket Connections**: Each session establishes a WebSocket connection to the Durable Object
2. **Hibernation**: When inactive, the Durable Object can be evicted from memory while keeping WebSocket connections open
3. **Automatic Revival**: When messages arrive, the Durable Object is automatically recreated and connection state is restored

## API

### `DurableObjectSessionManager`

#### Constructor

```typescript
new DurableObjectSessionManager(binding?: string)
```

Creates a new Durable Objects session manager instance.

**Parameters:**

- `binding` - Durable Object binding name (defaults to 'TMCP_DURABLE_OBJECT')

#### Methods

All methods implement the `SessionManager` interface:

##### `create(id: string, controller: ReadableStreamDefaultController): Promise<void>`

Creates a new session and establishes a WebSocket connection to the Durable Object.

##### `delete(id: string): Promise<void>`

Removes a session by sending a delete message through the WebSocket connection.

##### `has(id: string): Promise<boolean>`

Checks if a session exists in the Durable Object.

##### `send(sessions: string[] | undefined, data: string): Promise<void>`

Sends data to specified sessions or all sessions via WebSocket broadcast.

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
