# @tmcp/transport-stdio

A Standard I/O (stdio) transport implementation for TMCP (TypeScript Model Context Protocol) servers. This package provides a clean, easy-to-use interface for running MCP servers that communicate via stdin/stdout, making them compatible with MCP Inspector and other MCP clients.

## Installation

```bash
pnpm add @tmcp/transport-stdio tmcp
```

## Usage

```javascript
import { McpServer } from 'tmcp';
import { StdioTransport } from '@tmcp/transport-stdio';

// Create your MCP server
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'My MCP server',
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
			content: [{ type: 'text', text: 'Hello from the tool!' }],
		};
	},
);

// Create and start the stdio transport
const transport = new StdioTransport(server);
transport.listen();
```

## API

### `StdioTransport`

#### Constructor

```typescript
new StdioTransport(server: McpServer)
```

Creates a new stdio transport instance.

**Parameters:**

- `server` - A TMCP server instance to handle incoming requests

#### Methods

##### `listen(): void`

Starts listening for JSON-RPC messages on stdin and sets up response handling on stdout.

**Features:**

- Reads from `process.stdin` line by line
- Buffers partial messages until complete
- Parses JSON-RPC messages and forwards to the server
- Writes responses to `process.stdout`
- Handles process termination signals

## Message Flow

1. **Input**: JSON-RPC messages received via `stdin`
2. **Processing**: Messages are parsed and forwarded to the MCP server
3. **Output**: Server responses are written to `stdout`
4. **Errors**: Processing errors are logged to `stderr`

The transport automatically tracks `clientInfo`, client capabilities, and log level reported by the client and exposes them through `server.ctx.sessionInfo`. Resource subscriptions declared by the client are also recorded so `server.changed('resource', uri)` only emits notifications when the client has opted in.

## Integration with MCP Inspector

This transport is designed to work seamlessly with [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

1. Build your server with stdio transport
2. Configure MCP Inspector to use your server executable
3. Inspector will communicate via stdin/stdout automatically

## Example: Complete Server

```javascript
#!/usr/bin/env node

import { McpServer } from 'tmcp';
import { StdioTransport } from '@tmcp/transport-stdio';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { z } from 'zod';

const server = new McpServer(
	{
		name: 'example-server',
		version: '1.0.0',
		description: 'Example MCP server with stdio transport',
	},
	{
		adapter: new ZodJsonSchemaAdapter(),
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

// Add a tool with schema validation
const GreetSchema = z.object({
	name: z.string().describe('Name of the person to greet'),
});

server.tool(
	{
		name: 'greet',
		description: 'Greet someone by name',
		schema: GreetSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: `Hello, ${input.name}!`,
				},
			],
		};
	},
);

// Start the server
const transport = new StdioTransport(server);
transport.listen();
```

## Error Handling

The transport includes comprehensive error handling:

- **JSON Parse Errors**: Malformed JSON messages are caught and logged
- **Server Errors**: Server processing errors are handled gracefully
- **Process Termination**: Clean shutdown on SIGINT/SIGTERM signals

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

- Node.js 16+ (for native ES modules support)
- A TMCP server instance
- A schema adapter (Zod, Valibot, etc.)

## Related Packages

- [`tmcp`](../tmcp) - Core TMCP server implementation
- [`@tmcp/transport-http`](../transport-http) - HTTP transport for web-based clients
- [`@tmcp/adapter-zod`](../adapter-zod) - Zod schema adapter
- [`@tmcp/adapter-valibot`](../adapter-valibot) - Valibot schema adapter
- [`@tmcp/adapter-arktype`](../adapter-arktype) - ArkType schema adapter

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT
