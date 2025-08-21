# @tmcp/session-manager

Session management for TMCP (TypeScript Model Context Protocol) transport implementations. This package provides the base `SessionManager` interface and an in-memory implementation for managing client sessions in MCP servers.

## Installation

```bash
pnpm add @tmcp/session-manager
```

## Overview

Session managers handle the storage and communication with client sessions in TMCP transport layers. They manage:

- **Session Creation**: Establishing new client sessions with stream controllers
- **Session Deletion**: Cleaning up disconnected sessions
- **Session Queries**: Checking if sessions exist
- **Message Broadcasting**: Sending messages to specific sessions or all sessions

## Usage

### In-Memory Session Manager (Default)

The `InMemorySessionManager` stores sessions in memory and is suitable for single-server deployments:

```javascript
import { InMemorySessionManager } from '@tmcp/session-manager';

const sessionManager = new InMemorySessionManager();
```

### Custom Session Manager

You can implement your own session manager by extending the base `SessionManager` class:

```javascript
import { SessionManager } from '@tmcp/session-manager';

class CustomSessionManager extends SessionManager {
	/**
	 * Create a new session with the given ID and controller
	 * @param {string} id - Session ID
	 * @param {ReadableStreamDefaultController} controller - Stream controller
	 */
	create(id, controller) {
		// Implementation here
	}

	/**
	 * Delete a session by ID
	 * @param {string} id - Session ID to delete
	 */
	delete(id) {
		// Implementation here
	}

	/**
	 * Check if a session exists
	 * @param {string} id - Session ID to check
	 * @returns {Promise<boolean>} - Whether the session exists
	 */
	async has(id) {
		// Implementation here
	}

	/**
	 * Send data to specific sessions or all sessions
	 * @param {string[] | undefined} sessions - Session IDs to send to (undefined = all sessions)
	 * @param {string} data - Data to send
	 */
	send(sessions, data) {
		// Implementation here
	}
}
```

## API

### `SessionManager` (Abstract Base Class)

#### Methods

##### `create(id: string, controller: ReadableStreamDefaultController): void`

Creates a new session with the specified ID and associates it with a stream controller.

**Parameters:**

- `id` - Unique session identifier
- `controller` - ReadableStreamDefaultController for sending data to the client

##### `delete(id: string): void`

Removes a session and cleans up its resources.

**Parameters:**

- `id` - Session ID to delete

##### `has(id: string): Promise<boolean>`

Checks whether a session with the given ID exists.

**Parameters:**

- `id` - Session ID to check

**Returns:**

- Promise resolving to true if the session exists, false otherwise

##### `send(sessions: string[] | undefined, data: string): void`

Sends data to one or more sessions.

**Parameters:**

- `sessions` - Array of session IDs to send to, or undefined to send to all sessions
- `data` - String data to send (typically SSE-formatted)

### `InMemorySessionManager`

Concrete implementation that stores sessions in a JavaScript Map. Suitable for single-server deployments.

#### Usage with Transport Layers

```javascript
import { HttpTransport } from '@tmcp/transport-http';
import { SseTransport } from '@tmcp/transport-sse';
import { InMemorySessionManager } from '@tmcp/session-manager';

const sessionManager = new InMemorySessionManager();

// Use with HTTP transport
const httpTransport = new HttpTransport(server, { sessionManager });

// Use with SSE transport
const sseTransport = new SseTransport(server, { sessionManager });
```

## Related Packages

- [`@tmcp/session-manager-redis`](../session-manager-redis) - Redis-based session manager for multi-server deployments
- [`@tmcp/transport-http`](../transport-http) - HTTP transport using session managers
- [`@tmcp/transport-sse`](../transport-sse) - SSE transport using session managers
- [`tmcp`](../tmcp) - Core TMCP server implementation

## License

MIT
