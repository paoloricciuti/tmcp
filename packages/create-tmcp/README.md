# @tmcp/create-tmcp

Interactive CLI tool to create TMCP (lightweight MCP) projects with full scaffolding support.

## Usage

Create a new TMCP project interactively:

```bash
npx @tmcp/create-tmcp
```

Or create in a specific directory:

```bash
npx @tmcp/create-tmcp my-project
```

## Features

The CLI will guide you through setting up a complete TMCP project with:

### Schema Adapters
- **Valibot** (Recommended) - Lightweight, modern validation
- **Zod v4** - Latest Zod version with enhanced features
- **Zod v3** - Legacy Zod version for compatibility
- **ArkType** - TypeScript-first validation with excellent performance
- **Effect Schema** - Functional programming approach
- **No adapter** - Manual schema handling

### Transport Layers
- **STDIO** - Standard input/output (most common for MCP)
- **HTTP** - HTTP server transport for web integration
- **Server-Sent Events** - SSE transport for real-time web apps

### Additional Features
- **OAuth 2.1 Authentication** - Optional authentication support
- **Example Server** - Complete working example with schema validation
- **TypeScript Support** - Full type definitions included
- **Modern Tooling** - ESM modules, file watching, and more

## Generated Project Structure

```
my-project/
├── package.json          # Dependencies and scripts
├── README.md             # Project documentation
├── src/
│   ├── index.js          # Main server implementation
│   └── example.js        # Example server (optional)
```

## What You Get

Each generated project includes:

1. **Complete TMCP Server** - Ready-to-run MCP server implementation
2. **Schema Validation** - Integrated adapter for your chosen validation library
3. **Transport Configuration** - Pre-configured transport layers
4. **Development Scripts** - File watching and development commands
5. **Working Example** - Demonstrative tools and schema usage
6. **Full Documentation** - README with usage instructions

## Example Workflow

```bash
# Create new project
npx @tmcp/create-tmcp my-mcp-server

# Follow interactive prompts:
# ✓ Select Valibot adapter
# ✓ Choose STDIO + HTTP transports  
# ✓ Include OAuth authentication
# ✓ Generate example server

# Start development
cd my-mcp-server
pnpm install
pnpm run dev
```

## Schema Adapter Examples

### Valibot (Recommended)
```javascript
import * as v from 'valibot';

const UserSchema = v.object({
    name: v.pipe(v.string(), v.description('User name')),
    age: v.pipe(v.number(), v.description('User age')),
});
```

### Zod
```javascript
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string().describe('User name'),
    age: z.number().describe('User age'),
});
```

### ArkType
```javascript
import { type } from 'arktype';

const UserSchema = type({
    name: 'string',
    age: 'number',
});
```

## Advanced Usage

### Custom Project Structure
The CLI adapts to your preferences:
- Custom example server location
- Multiple transport combinations
- Optional authentication integration
- Flexible dependency management

### Development Ready
Generated projects include:
- Hot reloading with `--watch` flag
- TypeScript definitions
- ESLint configuration inheritance
- Modern package.json setup

## Requirements

- Node.js 18.0.0 or higher
- pnpm (recommended) or npm

## Learn More

- [TMCP Documentation](https://github.com/paoloricciuti/tmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Schema Adapters](https://github.com/paoloricciuti/tmcp/tree/main/packages)

## License

MIT