# @tmcp/adapter-arktype

ArkType adapter for TMCP JSON Schema conversion.

## Installation

```bash
pnpm add @tmcp/adapter-arktype arktype tmcp
```

## Usage

```javascript
import { ArktypeJsonSchemaAdapter } from '@tmcp/adapter-arktype';
import { type } from 'arktype';

const adapter = new ArktypeJsonSchemaAdapter();

// Define an ArkType schema
const userSchema = type({
	name: 'string',
	age: 'number',
	email: 'string.email',
});

// Convert to JSON Schema
const jsonSchema = await adapter.toJsonSchema(userSchema);
console.log(jsonSchema);
```

## Usage with TMCP Server

```javascript
import { McpServer } from 'tmcp';
import { ArktypeJsonSchemaAdapter } from '@tmcp/adapter-arktype';
import { type } from 'arktype';

const adapter = new ArktypeJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'Server with ArkType schemas',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

// Define a tool with ArkType schema
server.tool(
	{
		name: 'create_user',
		description: 'Create a new user',
		schema: type({
			name: 'string',
			age: 'number',
			email: 'string.email',
		}),
	},
	async ({ name, age, email }) => {
		return {
			content: [
				{
					type: 'text',
					text: `Created user: ${name}, age ${age}, email ${email}`,
				},
			],
		};
	},
);
```

## Advanced Usage

### Complex Type Definitions

```javascript
import { ArktypeJsonSchemaAdapter } from '@tmcp/adapter-arktype';
import { type } from 'arktype';

const adapter = new ArktypeJsonSchemaAdapter();

// Complex nested types
const userSchema = type({
	name: 'string>0',
	age: 'number>=0',
	email: 'string.email',
	preferences: {
		theme: "'light' | 'dark'",
		notifications: 'boolean',
	},
	tags: 'string[]',
});

const jsonSchema = await adapter.toJsonSchema(userSchema);
```

### Union Types and Constraints

```javascript
import { type } from 'arktype';

// Union types with constraints
const contactSchema = type({
	type: "'email' | 'phone'",
	value: 'string',
});

// Conditional types
const eventSchema = type({
	type: "'click' | 'hover' | 'scroll'",
	timestamp: 'number',
	data: 'unknown',
});
```

## API

### `ArktypeJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides ArkType-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts an ArkType schema to JSON Schema format

## Dependencies

- `arktype` - Peer dependency for schema validation and type definitions (^2.0.0)
- `tmcp` - Peer dependency for the base adapter

## Features

- **Built-in conversion** - Uses ArkType's native `toJsonSchema()` method
- **Type safety** - Full TypeScript support with proper type inference
- **Easy integration** - Drop-in replacement for other TMCP adapters
- **Runtime validation** - Leverages ArkType's powerful runtime type checking
- **String-based types** - Intuitive string-based type definitions

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.
