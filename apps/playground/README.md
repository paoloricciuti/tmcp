# TMCP Playground

A playground MCP server for testing the tmcp library with Valibot schema validation.

## Features

- **TypeScript Implementation**: Built with TypeScript (.ts files) for type safety
- **TMCP Library**: Uses the tmcp package for MCP server implementation
- **Valibot Validation**: Uses Valibot and the @tmcpkit/adapter-valibot for schema validation
- **Stdio Communication**: Communicates via stdio for use with MCP Inspector

## Tools

- `add_numbers`: Add two numbers together (with Valibot schema validation)
- `greet`: Generate a greeting message (with optional formal parameter)
- `get_time`: Get the current time (no schema validation)

## Prompts

- `story_prompt`: Generate a creative story prompt with topic and length parameters

## Resources

- `playground://info`: Information about this playground server

## Usage with MCP Inspector

1. Build the project:

    ```bash
    pnpm build
    ```

2. Start the server:

    ```bash
    node dist/index.js
    ```

3. Configure MCP Inspector to use this server via stdio

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck
```
