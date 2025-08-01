# CLAUDE.md

You have access to both Claude Code's built-in file tools and the Context Coder MCP for enhanced codebase analysis. Follow this workflow:

1. ALWAYS start every new chat by calling get_codebase_size and get_codebase MCP tools to ingest and understand the full project context
2. Use Context Coders's codebase analysis as your primary reference - avoid reading files since you already have the complete codebase, only read file if you are missing something or if the user specifically requests it.
3. Remember: Context Coder gives you full codebase context, Claude Code gives you precise editing control - use both strategically

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tmcp** is a lightweight, schema-agnostic Model Context Protocol (MCP) server implementation distributed as a monorepo. It provides an alternative to the official MCP SDK with minimal dependencies and unified API design.

## Architecture

### Monorepo Structure

- `packages/tmcp/` - Core library with `McpServer` class and base `JsonSchemaAdapter`
- `packages/adapter-*/` - Schema validation library adapters (Zod, Valibot, ArkType, Effect, Zod v3)
- Uses adapter pattern where each adapter implements `toJsonSchema(schema)` method

### Code Style

- **JavaScript with JSDoc** - No TypeScript files, comprehensive JSDoc annotations for type safety
- **ES Modules** - `"type": "module"` throughout
- **snake_case** - Internal methods and variables
- **Private fields** - Use `#` for class encapsulation
- JSDoc validation enforced via ESLint

### Key Classes

- `McpServer` (`packages/tmcp/src/index.js`) - Main server implementation with `.tool()`, `.prompt()`, `.resource()`, `.template()` methods
- `JsonSchemaAdapter` (`packages/tmcp/src/adapter.js`) - Base adapter class
- Adapters extend base class: `ZodJsonSchemaAdapter`, `ValibotJsonSchemaAdapter`, etc.

## Development Commands

```bash
# Package management (always use pnpm)
pnpm install

# Code quality
pnpm lint           # ESLint with JSDoc validation
pnpm lint:fix       # Auto-fix ESLint issues
pnpm format         # Prettier formatting
pnpm format:check   # Check Prettier formatting

# Type checking
pnpm typecheck      # TypeScript checking across all packages

# Build and publishing
pnpm -r generate:types  # Generate .d.ts files from JSDoc
pnpm release            # Changeset-based release

# Testing
pnpm test           # Currently no tests implemented
pnpm -r test        # Run tests in all packages

# Single package commands
cd packages/tmcp && pnpm generate:types    # Generate types for core package
cd packages/adapter-zod && pnpm generate:types  # Generate types for specific adapter
```

## Key Dependencies

### Core Package (`tmcp`)

- `json-rpc-2.0` - JSON-RPC protocol handling
- `uri-template-matcher` - URI template matching for resources
- `valibot` - Internal validation (not exposed to users)
- `sqids` - Short unique ID generation

### Development

- `@standard-schema/spec` - Standardized schema interface for type inference
- `@changesets/cli` - Version management and publishing
- `eslint-plugin-jsdoc` - JSDoc validation and linting

## Type Generation Process

The project uses TypeScript compiler to generate `.d.ts` files from JavaScript with JSDoc comments:

- Each package runs `tsc --declaration --emitDeclarationOnly`
- Generated types are committed and published
- `publint` validates package exports

## Adapter Development Pattern

When creating new schema adapters:

1. Extend `JsonSchemaAdapter` base class
2. Implement `toJsonSchema(schema)` method to convert schema to JSON Schema
3. Export class as default with clear naming: `{LibraryName}JsonSchemaAdapter`
4. Follow existing package structure in `packages/adapter-*/`

## MCP Protocol Implementation

The server implements full MCP capabilities:

- **Tools** - Executable functions with optional schema validation
- **Prompts** - Template generation with completion support
- **Resources** - Static resource serving
- **Templates** - Dynamic URI template resources with parameter completion

## Core Implementation Details

### McpServer Class (`packages/tmcp/src/index.js`)

The main server class uses private fields (`#`) for encapsulation and implements:

- Session management with `AsyncLocalStorage`
- Client capabilities tracking per session
- JSON-RPC protocol handling via `json-rpc-2.0`
- URI template matching for dynamic resources
- Event-driven architecture with `EventTarget`

### Key Methods:

- `.tool(definition, handler)` - Register tools with schema validation
- `.prompt(definition, handler)` - Register prompts with completion support
- `.resource(definition, handler)` - Register static resources
- `.template(definition, handler)` - Register URI template resources
- `.receive(message, session_id)` - Process JSON-RPC messages
- `.elicitation(schema)` - Request client elicitation
- `.message(request)` - Request language model sampling

### Transport Layers

The monorepo includes transport implementations:

- `packages/transport-stdio/` - Standard I/O transport
- `packages/transport-http/` - HTTP transport
- `packages/transport-sse/` - Server-Sent Events transport

## Workspace Structure

This is a pnpm workspace configured in `pnpm-workspace.yaml`:

- `packages/*` - Core packages and adapters
- `apps/*` - Example applications (playground)

## Publishing Process

Uses Changesets for version management:

- Create changesets with `pnpm changeset`
- Release with `pnpm release` (runs `changeset publish`)
- All packages published to npm with `@tmcp/` scope except core `tmcp`
