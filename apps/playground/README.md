# TMCP Playground

A comprehensive playground MCP server for testing the tmcp library with Valibot schema validation, showcasing all major MCP features.

## Features

- **TypeScript Implementation**: Built with TypeScript (.ts files) for type safety
- **TMCP Library**: Uses the tmcp package for MCP server implementation
- **Valibot Validation**: Uses Valibot and the @tmcpkit/adapter-valibot for schema validation
- **Stdio Communication**: Communicates via stdio for use with MCP Inspector
- **Real-time Updates**: Demonstrates resource subscriptions and change notifications
- **Template Resources**: Shows dynamic URI template resources
- **Advanced Features**: Includes elicitation, messaging, and completion examples

## Tools

### `add_numbers`
Adds two numbers together with Valibot schema validation.
- **Parameters**: `a` (number), `b` (number)
- **Returns**: Sum of the two numbers

### `greet`
Generate a greeting message with optional formal parameter.
- **Parameters**: `name` (string), `formal` (boolean, optional)
- **Returns**: Personalized greeting message

### `get_time`
Get the current time (no schema validation).
- **Parameters**: None
- **Returns**: Current ISO timestamp

## Prompts

### `story_prompt`
Generate a creative story prompt with topic and length parameters.
- **Parameters**: `topic` (string), `length` ('short'|'medium'|'long', optional)
- **Features**: Includes completion support for length parameter
- **Returns**: Story prompt with description and messages

## Resources

### `playground_info` (`file:///src/resource.txt`)
Information about this playground server loaded from a local file.
- **Features**: File watching with automatic change notifications
- **Demonstrates**: Resource subscriptions and real-time updates

### `playground_template` (`playground://template/{name}/{action}`)
A template resource for testing dynamic URI parameters.
- **Parameters**: `name` (string), `action` (string)
- **Features**: Completion support for both parameters
- **Demonstrates**: URI template resources with parameter extraction

## Advanced Features Demonstrated

### Real-time Notifications
- Resource change notifications when `src/resource.txt` is modified
- Automatic subscription management for connected clients

### Client Capabilities
- Elicitation requests for structured data input
- Message sampling for AI-powered responses
- Roots management for filesystem access

### Completion Support
- Parameter completion for prompt arguments
- URI template parameter completion
- Dynamic completion value generation

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

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "tmcp-playground": {
      "command": "node",
      "args": ["path/to/tmcp/apps/playground/dist/index.js"]
    }
  }
}
```

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

## Testing Features

### Resource Subscriptions
1. Subscribe to `file:///src/resource.txt` in MCP Inspector
2. Modify the `src/resource.txt` file
3. Observe real-time change notifications

### Template Resources
1. Access `playground://template/test/run` 
2. Try different parameter combinations
3. Use completion to discover available parameters

### Prompt Completion
1. Use the `story_prompt` prompt
2. Start typing a length parameter
3. Observe completion suggestions

## Architecture

The playground demonstrates:
- **Schema-first design** with Valibot validation
- **Event-driven architecture** with resource subscriptions
- **Type-safe development** with TypeScript
- **Production-ready patterns** for MCP server development

This playground serves as both a testing ground and a reference implementation for building MCP servers with the tmcp library.
