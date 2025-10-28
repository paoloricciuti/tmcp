# @tmcp/session-manager-postgres

PostgreSQL-based session managers for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides distributed implementations that use PostgreSQL for both streaming session coordination and durable session metadata, enabling multi-server and serverless deployments.

## Installation

```bash
pnpm add @tmcp/session-manager-postgres
```

## Overview

`PostgresStreamSessionManager` uses LISTEN/NOTIFY to route MCP notifications to whichever process owns the streaming response, while `PostgresInfoSessionManager` persists client capabilities, client info, log levels, and resource subscriptions in regular Postgres tables so transports can restore context on every request.

LISTEN/NOTIFY have some trade-off and do require some setup to properly work so you might want to read [their documentation](https://www.postgresql.org/docs/current/sql-listen.html) or this [guide from neon](https://neon.com/guides/pub-sub-listen-notify) to learn about them.

**Key Features:**

- **Distributed Sessions**: Share sessions across multiple server instances
- **Serverless Ready**: Perfect for serverless and ephemeral environments
- **Real-time Messaging**: Uses PostgreSQL LISTEN/NOTIFY for instant message delivery
- **Load Balancer Compatible**: Works seamlessly with load balancers
- **Automatic Session Expiry**: Sessions are automatically cleaned up after 10 seconds of inactivity
- **Session Metadata**: Stores client info, capabilities, log levels, and subscriptions in dedicated tables

## Usage

### Basic Setup

```javascript
import {
	PostgresStreamSessionManager,
	PostgresInfoSessionManager,
} from '@tmcp/session-manager-postgres';

const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
};

Both managers can share the same database connection string, or you can point them at different databases if you need to scale metadata separately from streaming state.
```

### With Authentication

```javascript
const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://username:password@localhost:5432/mydb',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://username:password@localhost:5432/mydb',
	}),
};
```

### With TLS

```javascript
const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb?sslmode=require',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb?sslmode=require',
	}),
};
```

### Custom Table Name

```javascript
const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
		tableName: 'my_sessions',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
		tableNames: {
			clientCapabilities: 'my_session_capabilities',
			clientInfo: 'my_session_client_info',
			logLevel: 'my_session_log_level',
			subscriptions: 'my_session_subscriptions',
		},
	}),
};
```

### Disable Automatic Table Creation

```javascript
const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
		create: false,
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
		create: false,
	}),
};
```

### Using with Transport Layers

#### HTTP Transport

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import {
	PostgresStreamSessionManager,
	PostgresInfoSessionManager,
} from '@tmcp/session-manager-postgres';

const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
};
const transport = new HttpTransport(server, { sessionManager });
```

#### SSE Transport

```javascript
import { SseTransport } from '@tmcp/transport-sse';
import {
	PostgresStreamSessionManager,
	PostgresInfoSessionManager,
} from '@tmcp/session-manager-postgres';

const sessionManager = {
	streams: new PostgresStreamSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
	info: new PostgresInfoSessionManager({
		connectionString: 'postgresql://localhost:5432/mydb',
	}),
};
const transport = new SseTransport(server, { sessionManager });
```

## How It Works

The PostgreSQL session managers use two PostgreSQL features:

1. **LISTEN/NOTIFY Messaging**: `PostgresStreamSessionManager` subscribes to `session:{id}` and `delete:session:{id}` channels so that responses can be relayed to whichever worker holds the streaming controller.
2. **Table Storage**: Both managers persist state in tables—`tmcp_sessions` tracks active streams with `updated_at` timestamps, while `PostgresInfoSessionManager` stores JSON blobs and subscriptions in dedicated tables.

### Session Lifecycle

1. **Session Creation**: When a client connects, the stream manager inserts/refreshes a row in `tmcp_sessions` and begins listening on the session's channels, while the info manager stores the client's capabilities and info.
2. **Message Delivery**: Messages are sent via NOTIFY to `session:{id}` and picked up by the correct worker. Broadcast notifications resolve their recipient list via the subscriptions table before publishing.
3. **Session Cleanup**: When a session disconnects, the stream record is removed (or allowed to expire) and metadata rows/subscriptions for that session are deleted.

### Multi-Server Communication

When you deploy your MCP server to multiple servers (or in a serverless environment) the SSE stream request could go to a different server/function than the POST request that generates the notification. So when the server receives the SSE stream request it stores the information in PostgreSQL and listens to notifications on `session:${id}`. When the POST request arrives to a different server and needs to send back something to the client instead of sending it directly it sends a NOTIFY on `session:${id}` so that the original request can pick it up and stream back the new notification.

### Session Expiry

Stream sessions are automatically expired after 10 seconds once their controller disconnects. This ensures that even if your process suddenly crashes (or your serverless function shuts down because it reached the timeout) it will not waste space on your db. Each session has an interval that updates the `updated_at` timestamp every 10 seconds to keep it alive. When querying for active sessions, only those updated within the last 10 seconds are considered. The info manager removes metadata as part of the same cleanup routine.

## Database Schema

By default the managers create the following tables:

```sql
CREATE TABLE IF NOT EXISTS tmcp_sessions (
    id TEXT PRIMARY KEY,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tmcp_session_client_capabilities (
    id TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS tmcp_session_client_info (
    id TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS tmcp_session_log_level (
    id TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS tmcp_session_subscriptions (
    id TEXT PRIMARY KEY,
    value TEXT
);
```

## API

### `PostgresStreamSessionManager`

- `new PostgresStreamSessionManager({ connectionString, tableName, create })`
- `create(id, controller)` – stores the controller, registers LISTEN handlers, and keeps the session alive
- `delete(id)` – removes listeners and deletes the session row
- `has(id)` – checks whether a fresh row exists in `tmcp_sessions`
- `send(sessions, data)` – NOTIFY the appropriate `session:{id}` channels (broadcast when `sessions` is `undefined`)

### `PostgresInfoSessionManager`

- `new PostgresInfoSessionManager({ connectionString, tableNames, create })`
- `setClientInfo(id, info)` / `getClientInfo(id)` – JSON stored in the `clientInfo` table
- `setClientCapabilities(id, capabilities)` / `getClientCapabilities(id)` – JSON stored in the `clientCapabilities` table
- `setLogLevel(id, level)` / `getLogLevel(id)` – string stored in the `logLevel` table
- `addSubscription(id, uri)` / `getSubscriptions(uri)` – rows stored in the `subscriptions` table
- `delete(id)` – removes all metadata rows for the session and clears subscriptions

## Related Packages

- [`@tmcp/session-manager`](../session-manager) - Base session manager interface and in-memory implementation
- [`@tmcp/session-manager-redis`](../session-manager-redis) - Redis-based session manager
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
