# @tmcp/session-manager-redis

Redis-based session managers for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides distributed implementations for both streaming session coordination and session metadata persistence backed by Redis, enabling multi-server and serverless deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-redis redis
```

## Overview

`RedisStreamSessionManager` uses Redis pub/sub to fan out MCP notifications across processes, while `RedisInfoSessionManager` keeps per-session metadata (client capabilities, client info, log level, resource subscriptions) in Redis so that stateless transports can hydrate the MCP context on every request.

**Key Features:**

- **Distributed Sessions**: Share sessions across multiple server instances
- **Serverless Ready**: Perfect for serverless and ephemeral environments
- **Real-time Messaging**: Uses Redis pub/sub for instant message delivery
- **Load Balancer Compatible**: Works seamlessly with load balancers
- **Client Metadata Storage**: Persists capabilities, client info, log levels, and resource subscriptions between requests

## Usage

### Basic Setup

```javascript
import {
	RedisStreamSessionManager,
	RedisInfoSessionManager,
} from '@tmcp/session-manager-redis';

const sessionManager = {
	streams: new RedisStreamSessionManager('redis://localhost:6379'),
	info: new RedisInfoSessionManager('redis://localhost:6379'),
};

// You can point the two managers at different Redis instances if desired, but using the same URL is a convenient default.
```

### With Authentication

```javascript
const sessionManager = {
	streams: new RedisStreamSessionManager(
		'redis://username:password@localhost:6379',
	),
	info: new RedisInfoSessionManager(
		'redis://username:password@localhost:6379',
	),
};
```

### With TLS

```javascript
const sessionManager = {
	streams: new RedisStreamSessionManager('rediss://localhost:6380'),
	info: new RedisInfoSessionManager('rediss://localhost:6380'),
};
```

### Using with Transport Layers

#### HTTP Transport

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import {
	RedisStreamSessionManager,
	RedisInfoSessionManager,
} from '@tmcp/session-manager-redis';

const sessionManager = {
	streams: new RedisStreamSessionManager('redis://localhost:6379'),
	info: new RedisInfoSessionManager('redis://localhost:6379'),
};
const transport = new HttpTransport(server, { sessionManager });
```

#### SSE Transport

```javascript
import { SseTransport } from '@tmcp/transport-sse';
import {
	RedisStreamSessionManager,
	RedisInfoSessionManager,
} from '@tmcp/session-manager-redis';

const sessionManager = {
	streams: new RedisStreamSessionManager('redis://localhost:6379'),
	info: new RedisInfoSessionManager('redis://localhost:6379'),
};
const transport = new SseTransport(server, { sessionManager });
```

## How It Works

The Redis session managers use two Redis capabilities:

1. **Pub/Sub Messaging**: `RedisStreamSessionManager` publishes JSON payloads to channels like `session:{id}` so that whichever process holds the streaming controller can forward the message.
2. **Key-Value Storage & Sets**: `RedisInfoSessionManager` stores metadata under keys such as `tmcp:client_info:{id}`, `tmcp:client_capabilities:{id}`, `tmcp:log_level:{id}`, and tracks resource subscriptions in sets like `tmcp:subscriptions:{uri}`.

### Session Lifecycle

1. **Session Creation**: When a client connects, the stream manager spins up a pub/sub subscription while the info manager stores the client's capabilities and info.
2. **Message Delivery**: Messages are published to the session channel and delivered to the connected stream controller. Broadcasts look up all subscribers for a resource via the info manager before publishing.
3. **Session Cleanup**: When a session disconnects, stream controllers are disposed and all metadata keys/sets for the session are removed.

### Multi-Server Communication

When you deploy your MCP server to multiple servers (or in a serverless environment) the SSE stream request could go to a different server/function than the POST request that generates the notification. So when the server receives the SSE stream request it stores the information in redis and subscribe to notifications on `session:${id}`. When the POST request arrives to a different server and need to send back something to the client instead of sending it directly it publishes on `session:${id}` so that the original request can pick it up and stream back the new notification.

## API

### `RedisStreamSessionManager`

- `new RedisStreamSessionManager(redisUrl: string)` – establishes pub/sub connections for streaming traffic
- `create(id, controller)` – stores the stream controller for the session and subscribes to `session:{id}`
- `delete(id)` – unsubscribes and removes controller state
- `has(id)` – resolves to `true` if a controller is tracked
- `send(sessions, data)` – publishes to either `session:{id}` channels or broadcasts to all active sessions

### `RedisInfoSessionManager`

- `new RedisInfoSessionManager(redisUrl: string)` – reuses Redis to persist metadata
- `setClientInfo(id, info)` / `getClientInfo(id)` – JSON stored under `tmcp:client_info:{id}`
- `setClientCapabilities(id, capabilities)` / `getClientCapabilities(id)` – JSON stored under `tmcp:client_capabilities:{id}`
- `setLogLevel(id, level)` / `getLogLevel(id)` – string stored under `tmcp:log_level:{id}`
- `addSubscription(id, uri)` / `getSubscriptions(uri)` – maintain membership in `tmcp:subscriptions:{uri}`
- `delete(id)` – clears all metadata and removes the session from every subscription set

## Related Packages

- [`@tmcp/session-manager`](../session-manager) - Base session manager interface and in-memory implementation
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
