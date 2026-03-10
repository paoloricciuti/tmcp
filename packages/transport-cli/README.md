# @tmcp/transport-cli

A CLI transport for TMCP that turns your MCP server's tools into command-line commands. Each registered tool becomes a subcommand with flags derived from its JSON Schema input, powered by [yargs](https://yargs.js.org/).

## Installation

```bash
pnpm add @tmcp/transport-cli tmcp
```

## Usage

```javascript
import { McpServer } from 'tmcp';
import { CliTransport } from '@tmcp/transport-cli';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { z } from 'zod';

const server = new McpServer(
	{
		name: 'my-cli',
		version: '1.0.0',
		description: 'My CLI tool',
	},
	{
		adapter: new ZodJsonSchemaAdapter(),
		capabilities: { tools: {} },
	},
);

server.tool(
	{
		name: 'greet',
		description: 'Greet someone by name',
		schema: z.object({
			name: z.string().describe('Name of the person to greet'),
			loud: z.boolean().optional().describe('Shout the greeting'),
		}),
	},
	async (input) => {
		const text = `Hello, ${input.name}!`;
		return {
			content: [
				{ type: 'text', text: input.loud ? text.toUpperCase() : text },
			],
		};
	},
);

const cli = new CliTransport(server);
await cli.run(undefined, process.argv.slice(2));
```

Running the above:

```bash
node my-cli.js greet --name Alice
# {"content":[{"type":"text","text":"Hello, Alice!"}]}

node my-cli.js greet --name Alice --loud
# {"content":[{"type":"text","text":"HELLO, ALICE!"}]}
```

Output is pretty-printed JSON written to stdout. Errors go to stderr and set `process.exitCode` to 1.

The help output uses the server's `name` (from the `McpServer` config) as the CLI program name. In the example above, `--help` would show `my-cli` as the command name.

## Argument types

The transport maps JSON Schema types from your tool's input schema to yargs option types:

| JSON Schema type | yargs type | Example                      |
| ---------------- | ---------- | ---------------------------- |
| `string`         | `string`   | `--name Alice`               |
| `number`         | `number`   | `--count 5`                  |
| `integer`        | `number`   | `--port 8080`                |
| `boolean`        | `boolean`  | `--verbose` / `--no-verbose` |
| `array`          | `array`    | `--items foo --items bar`    |

Properties marked as required in the schema are enforced by yargs (`demandOption`). Optional properties can be omitted. Enum values (e.g. from `z.enum()` or `v.picklist()`) are passed through as `choices`.

## Custom context

If your server uses custom context, you can pass it as the first argument to `run()`:

```javascript
const cli = new CliTransport(server);
await cli.run({ userId: 'cli-user' }, process.argv.slice(2));
```

The context is forwarded to the server on every request, so your tool handlers can read it from `server.ctx.custom`.

## API

### `CliTransport`

#### Constructor

```typescript
new CliTransport(server: McpServer)
```

Creates a new CLI transport. The `server` parameter is the TMCP server instance whose tools will be exposed as commands.

#### Methods

##### `run(ctx?: TCustom, argv?: string[]): Promise<void>`

Initializes an MCP session, fetches the tool list from the server, builds yargs commands from the tool definitions, and parses the given argv (or `process.argv.slice(2)` if omitted).

- `ctx` - Optional custom context passed to the server for this invocation.
- `argv` - Optional array of CLI arguments. Defaults to `process.argv.slice(2)`.

## How it works

1. The transport sends an `initialize` JSON-RPC request to the server to start a session.
2. It calls `tools/list` to get all registered tools and their input schemas.
3. For each tool, it registers a yargs command using the tool name and converts the tool's `inputSchema` properties into yargs options.
4. When the user invokes a command, the parsed arguments are coerced back to their schema types and sent as a `tools/call` request.
5. The result is written to stdout as pretty-printed JSON.

## Related Packages

- [`tmcp`](../tmcp) - Core TMCP server implementation
- [`@tmcp/transport-stdio`](../transport-stdio) - Standard I/O transport
- [`@tmcp/transport-http`](../transport-http) - HTTP transport
- [`@tmcp/adapter-zod`](../adapter-zod) - Zod schema adapter
- [`@tmcp/adapter-valibot`](../adapter-valibot) - Valibot schema adapter

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.

## License

MIT
