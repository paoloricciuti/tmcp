# @tmcp/session-manager-postgres

PostgreSQL-based session manager for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides a distributed session manager that uses PostgreSQL for session storage and LISTEN/NOTIFY messaging, enabling multi-server and serverless deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-postgres
```

## Overview

The `PostgresSessionManager` uses PostgreSQL to store and manage client sessions across multiple server instances. It leverages PostgreSQL's LISTEN/NOTIFY functionality to enable real-time communication between different server instances and client sessions.

LISTEN/NOTIFY have some trade-off and do require some setup to properly work so you might want to read [their documentation](https://www.postgresql.org/docs/current/sql-listen.html) or this [guide from neon](https://neon.com/guides/pub-sub-listen-notify) to learn about them.

**Key Features:**

- **Distributed Sessions**: Share sessions across multiple server instances
- **Serverless Ready**: Perfect for serverless and ephemeral environments
- **Real-time Messaging**: Uses PostgreSQL LISTEN/NOTIFY for instant message delivery
- **Load Balancer Compatible**: Works seamlessly with load balancers
- **Automatic Session Expiry**: Sessions are automatically cleaned up after 10 seconds of inactivity

## Usage

### Basic Setup

```javascript
import { PostgresSessionManager } from '@tmcp/session-manager-postgres';

const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb',
});
```

### With Authentication

```javascript
const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://username:password@localhost:5432/mydb',
});
```

### With TLS

```javascript
const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb?sslmode=require',
});
```

### Custom Table Name

```javascript
const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb',
	tableName: 'my_sessions',
});
```

### Disable Automatic Table Creation

```javascript
const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb',
	create: false,
});
```

### Using with Transport Layers

#### HTTP Transport

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import { PostgresSessionManager } from '@tmcp/session-manager-postgres';

const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb',
});
const transport = new HttpTransport(server, { sessionManager });
```

#### SSE Transport

```javascript
import { SseTransport } from '@tmcp/transport-sse';
import { PostgresSessionManager } from '@tmcp/session-manager-postgres';

const sessionManager = new PostgresSessionManager({
	connectionString: 'postgresql://localhost:5432/mydb',
});
const transport = new SseTransport(server, { sessionManager });
```

## How It Works

The PostgreSQL session manager uses two PostgreSQL features:

1. **Table Storage**: Session availability is tracked using a table with `id` and `updated_at` columns
2. **LISTEN/NOTIFY Messaging**: Messages are sent to sessions via channels like `session:{id}` and `delete:session:{id}`

### Session Lifecycle

1. **Session Creation**: When a client connects, a session record is created in the database and the manager listens to the session's notification channels
2. **Message Delivery**: Messages are sent via NOTIFY to the session channel and delivered to the connected stream controller
3. **Session Cleanup**: When a session disconnects, records are deleted and listeners are removed

### Multi-Server Communication

When you deploy your MCP server to multiple servers (or in a serverless environment) the SSE stream request could go to a different server/function than the POST request that generates the notification. So when the server receives the SSE stream request it stores the information in PostgreSQL and listens to notifications on `session:${id}`. When the POST request arrives to a different server and needs to send back something to the client instead of sending it directly it sends a NOTIFY on `session:${id}` so that the original request can pick it up and stream back the new notification.

### Session Expiry

Sessions are automatically expired after 10 seconds the stream they were managed is closed. This ensure that even if your process suddenly crashes (or your serverless function shuts down because it reached the timeout) it will not waste space on your db. Each session has an interval that updates the `updated_at` timestamp every 10 seconds to keep it alive. When querying for active sessions, only those updated within the last 10 seconds are considered.

## Database Schema

The session manager creates a table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS tmcp_sessions (
    id TEXT PRIMARY KEY,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API

### `PostgresSessionManager`

#### Constructor

```typescript
new PostgresSessionManager(options: {
    connectionString: string;
    tableName?: string;
    create?: boolean;
})
```

Creates a new PostgreSQL session manager instance.

**Parameters:**

- `connectionString` - PostgreSQL connection string
- `tableName` - Custom table name for sessions (defaults to `'tmcp_sessions'`)
- `create` - Whether to create the table if it doesn't exist (defaults to `true`). If you know for sure the table exists you can pass false to save a bit of compute time.

#### Methods

All methods implement the `SessionManager` interface:

##### `create(id: string, controller: ReadableStreamDefaultController): Promise<void>`

Creates a new session and sets up PostgreSQL LISTEN subscriptions.

##### `delete(id: string): Promise<void>`

Removes a session and cleans up database records and subscriptions.

##### `has(id: string): Promise<boolean>`

Checks if a session exists by querying the database table.

##### `send(sessions: string[] | undefined, data: string): Promise<void>`

Sends data to specified sessions or all active sessions via PostgreSQL NOTIFY.

## Related Packages

- [`@tmcp/session-manager`](../session-manager) - Base session manager interface and in-memory implementation
- [`@tmcp/session-manager-redis`](../session-manager-redis) - Redis-based session manager
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
