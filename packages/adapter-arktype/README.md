# @tmcp/arktype-jsonschema

ArkType adapter for TMCP JSON Schema conversion.

## Installation

```bash
npm install @tmcp/arktype-jsonschema arktype tmcp
```

## Usage

```javascript
import { ArktypeJsonSchemaAdapter } from '@tmcp/arktype-jsonschema';
import { type } from 'arktype';

const adapter = new ArktypeJsonSchemaAdapter();

// Define an ArkType schema
const userSchema = type({
	name: 'string',
	age: 'number',
	email: 'string.email'
});

// Convert to JSON Schema
const jsonSchema = await adapter.toJsonSchema(userSchema);
console.log(jsonSchema);
```

## Usage with TMCP Server

```javascript
import { McpServer } from 'tmcp';
import { ArktypeJsonSchemaAdapter } from '@tmcp/arktype-jsonschema';
import { type } from 'arktype';

const adapter = new ArktypeJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'Server with ArkType schemas'
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true }
		}
	}
);

// Define a tool with ArkType schema
server.tool(
	{
		name: 'create_user',
		description: 'Create a new user',
		schema: type({
			name: 'string',
			age: 'number',
			email: 'string.email'
		})
	},
	async ({ name, age, email }) => {
		return `Created user: ${name}, age ${age}, email ${email}`;
	}
);
```

## API

### `ArktypeJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides ArkType-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts an ArkType schema to JSON Schema format

## Dependencies

- `arktype` - Peer dependency for schema validation and type definitions
- `tmcp` - Peer dependency for the base adapter

## Features

- **Built-in conversion** - Uses ArkType's native `toJsonSchema()` method
- **Type safety** - Full TypeScript support with proper type inference
- **Easy integration** - Drop-in replacement for other TMCP adapters