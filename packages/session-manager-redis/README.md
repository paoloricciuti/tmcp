# @tmcp/session-manager-redis

Redis-based session manager for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides a distributed session manager that uses Redis for session storage and pub/sub messaging, enabling multi-server and serverless deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-redis redis
```

## Overview

The `RedisSessionManager` uses Redis to store and manage client sessions across multiple server instances. It leverages Redis pub/sub functionality to enable real-time communication between different server instances and client sessions.

**Key Features:**

- **Distributed Sessions**: Share sessions across multiple server instances
- **Serverless Ready**: Perfect for serverless and ephemeral environments
- **Real-time Messaging**: Uses Redis pub/sub for instant message delivery
- **Load Balancer Compatible**: Works seamlessly with load balancers

## Usage

### Basic Setup

```javascript
import { RedisSessionManager } from '@tmcp/session-manager-redis';

const sessionManager = new RedisSessionManager('redis://localhost:6379');
```

### With Authentication

```javascript
const sessionManager = new RedisSessionManager(
	'redis://username:password@localhost:6379',
);
```

### With TLS

```javascript
const sessionManager = new RedisSessionManager('rediss://localhost:6380');
```

### Using with Transport Layers

#### HTTP Transport

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import { RedisSessionManager } from '@tmcp/session-manager-redis';

const sessionManager = new RedisSessionManager('redis://localhost:6379');
const transport = new HttpTransport(server, { sessionManager });
```

#### SSE Transport

```javascript
import { SseTransport } from '@tmcp/transport-sse';
import { RedisSessionManager } from '@tmcp/session-manager-redis';

const sessionManager = new RedisSessionManager('redis://localhost:6379');
const transport = new SseTransport(server, { sessionManager });
```

## How It Works

The Redis session manager uses two Redis features:

1. **Key-Value Storage**: Session availability is tracked using keys like `available:session:{id}`
2. **Pub/Sub Messaging**: Messages are sent to sessions via channels like `session:{id}`

### Session Lifecycle

1. **Session Creation**: When a client connects, a session key is created and the manager subscribes to the session's pub/sub channel
2. **Message Delivery**: Messages are published to the session channel and delivered to the connected stream controller
3. **Session Cleanup**: When a session disconnects, keys are deleted and subscriptions are removed

### Multi-Server Communication

When you deploy your MCP server to multiple servers (or in a serverless environment) the SSE stream request could go to a different server/function than the POST request that generates the notification. So when the server receives the SSE stream request it stores the information in redis and subscribe to notifications on `session:${id}`. When the POST request arrives to a different server and need to send back something to the client instead of sending it directly it publishes on `session:${id}` so that the original request can pick it up and stream back the new notification.

## API

### `RedisSessionManager`

#### Constructor

```typescript
new RedisSessionManager(redisUrl: string)
```

Creates a new Redis session manager instance.

**Parameters:**

- `redisUrl` - Redis connection URL (supports redis:// and rediss:// protocols)

#### Methods

All methods implement the `SessionManager` interface:

##### `create(id: string, controller: ReadableStreamDefaultController): Promise<void>`

Creates a new session and sets up Redis pub/sub subscriptions.

##### `delete(id: string): Promise<void>`

Removes a session and cleans up Redis keys and subscriptions.

##### `has(id: string): Promise<boolean>`

Checks if a session exists by looking for its Redis key.

##### `send(sessions: string[] | undefined, data: string): Promise<void>`

Sends data to specified sessions or all sessions via Redis pub/sub.

## Related Packages

- [`@tmcp/session-manager`](../session-manager) - Base session manager interface and in-memory implementation
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
