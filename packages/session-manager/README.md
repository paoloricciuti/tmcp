# @tmcp/session-manager

Session management for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides the base classes and in-memory implementations for both streaming session coordination and session metadata persistence.

## Installation

```bash
pnpm add @tmcp/session-manager
```

## Overview

Session management is split into two concerns:

- **Stream session managers** handle the storage of long-lived streaming connections (SSE/HTTP) and the fan-out of notifications back to the right session.
- **Info session managers** persist metadata that MCP transports need across requests, such as client capabilities, client info, requested log level, and resource subscriptions.

Together they manage:

- **Session Creation**: Establishing new client sessions with stream controllers
- **Session Deletion**: Cleaning up disconnected sessions and metadata
- **Session Queries**: Checking whether a given session is still attached
- **Message Delivery**: Sending messages to specific sessions or everyone
- **Client Metadata**: Persisting capabilities, `clientInfo`, and log level between requests
- **Resource Subscriptions**: Tracking which sessions subscribed to which URIs

## Usage

### In-Memory Session Managers (Default)

The package ships with `InMemoryStreamSessionManager` and `InMemoryInfoSessionManager`. Together they are suitable for single-server deployments or tests:

```javascript
import {
	InMemoryStreamSessionManager,
	InMemoryInfoSessionManager,
} from '@tmcp/session-manager';

const sessionManagers = {
	streams: new InMemoryStreamSessionManager(),
	info: new InMemoryInfoSessionManager(),
};
```

### Custom Session Managers

You can implement your own managers by extending the base classes that ship with this package.

#### Stream session manager

```javascript
import { StreamSessionManager } from '@tmcp/session-manager';

class CustomStreamSessionManager extends StreamSessionManager {
	create(id, controller) {
		// Persist the ReadableStream controller for later notifications
	}

	delete(id) {
		// Clean up the controller and any associated timers
	}

	async has(id) {
		// Return whether a controller for the session exists
	}

	send(sessions, data) {
		// Fan out the payload to the targeted sessions (or everyone if sessions is undefined)
	}
}
```

#### Info session manager

```javascript
import { InfoSessionManager } from '@tmcp/session-manager';

class CustomInfoSessionManager extends InfoSessionManager {
	async getClientInfo(id) {
		// Return the last clientInfo payload for the session
	}

	setClientInfo(id, info) {
		// Persist clientInfo for later requests
	}

	async getClientCapabilities(id) {
		// Retrieve cached client capabilities
	}

	setClientCapabilities(id, capabilities) {
		// Persist the negotiated capabilities
	}

	async getLogLevel(id) {
		// Return the log level requested by the client
	}

	setLogLevel(id, level) {
		// Store the latest log level
	}

	async getSubscriptions(uri) {
		// Return all session ids subscribed to the URI
	}

	addSubscription(id, uri) {
		// Track that the session subscribed to the URI
	}

	delete(id) {
		// Remove all metadata for the session (client info, capabilities, subscriptions, etc.)
	}
}
```

## API

### `StreamSessionManager` (Abstract Base Class)

Responsible for creating and managing streaming controllers.

- `create(id, controller)` – register a session and associate its stream controller
- `delete(id)` – remove the controller and clean up resources
- `has(id)` – resolve to `true` when a controller for the session exists
- `send(sessions, data)` – push a payload to selected sessions (or everyone when `sessions` is `undefined`)

### `InfoSessionManager` (Abstract Base Class)

Stores session metadata that needs to survive across HTTP requests or reconnects.

- `getClientInfo(id)` / `setClientInfo(id, info)`
- `getClientCapabilities(id)` / `setClientCapabilities(id, capabilities)`
- `getLogLevel(id)` / `setLogLevel(id, level)`
- `getSubscriptions(uri)` – return all session IDs that subscribed to a resource
- `addSubscription(id, uri)` – record a new resource subscription
- `delete(id)` – remove all metadata for a session when it disconnects

### `InMemoryStreamSessionManager` & `InMemoryInfoSessionManager`

Concrete in-memory implementations that cover both responsibilities. Combine them when configuring a transport:

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import { SseTransport } from '@tmcp/transport-sse';
import {
	InMemoryStreamSessionManager,
	InMemoryInfoSessionManager,
} from '@tmcp/session-manager';

const sessionManagers = {
	streams: new InMemoryStreamSessionManager(),
	info: new InMemoryInfoSessionManager(),
};

const httpTransport = new HttpTransport(server, {
	sessionManager: sessionManagers,
});
const sseTransport = new SseTransport(server, {
	sessionManager: sessionManagers,
});
```

## Related Packages

- [`@tmcp/session-manager-redis`](../session-manager-redis) - Redis-based session manager for multi-server deployments
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
