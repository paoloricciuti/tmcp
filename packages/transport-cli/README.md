# @tmcp/transport-cli

A CLI transport for TMCP that exposes your MCP tools as static, JSON-first commands. It is designed for agent-driven usage: tools are invoked with JSON input, schemas can be inspected directly, and output can be narrowed before it leaves stdout.

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
			name: z.string(),
			loud: z.boolean().optional(),
		}),
		outputSchema: z.object({
			message: z.string(),
		}),
	},
	async (input) => {
		const message = `Hello, ${input.name}!`;

		return {
			content: [
				{
					type: 'text',
					text: input.loud ? message.toUpperCase() : message,
				},
			],
			structuredContent: { message },
		};
	},
);

const cli = new CliTransport(server);
await cli.run(undefined, process.argv.slice(2));
```

## Commands

### `tools`

Prints the available tools as pretty JSON.

```bash
node my-cli.js tools
```

### `schema <tool>`

Prints the tool metadata plus its input and output schemas.

```bash
node my-cli.js schema greet
```

### `call <tool> [input]`

Calls a tool with a JSON object. The first positional argument is the primary input source.

```bash
node my-cli.js call greet '{"name":"Alice"}'
```

### `<tool> [input]`

Each tool name is also registered directly as an alias for `call <tool>`, unless the tool name would collide with a reserved command (`tools`, `schema`, or `call`).

```bash
node my-cli.js greet '{"name":"Alice","loud":true}'
```

## Input sources

Tool calls accept exactly one input source:

- Positional JSON: `greet '{"name":"Alice"}'`

All inputs must parse to a JSON object. If no input is provided, the transport sends `{}`.

## Output controls

Tool calls support two static output flags:

- `--output full|structured|content|text`
- `--fields path1,path2`

Examples:

```bash
node my-cli.js greet '{"name":"Alice"}' --output text

node my-cli.js get-user '{"id":"1"}' --output structured --fields user.name,user.email
```

`--fields` uses comma-separated dot paths and is applied after the output mode is selected. It is not available with `--output text`.

## Behavior

- Output is written to stdout.
- JSON outputs are pretty-printed.
- Errors are written to stderr and set `process.exitCode` to `1`.
- The CLI initializes an MCP session, sends `notifications/initialized`, and paginates through `tools/list` automatically.
- The program name shown in help output comes from `McpServer`'s `name`.

## Custom context

If your server uses custom context, pass it as the first argument to `run()`:

```javascript
const cli = new CliTransport(server);
await cli.run({ userId: 'cli-user' }, process.argv.slice(2));
```

The context is forwarded on every request, so handlers can read it from `server.ctx.custom`.

## API

### `CliTransport`

#### Constructor

```typescript
new CliTransport(server: McpServer)
```

#### Methods

```typescript
run(ctx?: TCustom, argv?: string[]): Promise<void>
```

Starts the CLI, initializes a session, discovers tools, and executes the requested static command or tool alias.

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
