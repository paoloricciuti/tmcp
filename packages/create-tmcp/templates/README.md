# {{PROJECT_NAME}}

A TMCP (lightweight MCP) server built with:

- **Schema Adapter**: {{ADAPTER_NAME}}
- **Transports**: {{TRANSPORT_NAMES}}{{AUTH_LINE}}{{EXAMPLE_LINE}}

## Development

```bash
# Install dependencies
pnpm install

# Start the server
pnpm run start

# Start with file watching
pnpm run dev
```

## Usage

This server provides the following capabilities:

### Tools

- `hello` - A simple greeting tool

{{EXAMPLE_SECTION}}

## Architecture

This server uses the TMCP (lightweight MCP) architecture:

- **McpServer**: Core server implementation
- **Schema Adapter**: {{ADAPTER_DESCRIPTION}}
- **Transports**: Communication layers ({{TRANSPORT_NAMES}}){{AUTH_ARCHITECTURE}}

## Learn More

- [TMCP Documentation](https://github.com/paoloricciuti/tmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
