# @tmcp/adapter-valibot

Valibot adapter for TMCP JSON Schema conversion.

## Installation

```bash
pnpm add @tmcp/adapter-valibot valibot tmcp
```

## Usage

```javascript
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import * as v from 'valibot';

const adapter = new ValibotJsonSchemaAdapter();

// Define a Valibot schema
const userSchema = v.object({
	name: v.string(),
	age: v.number(),
	email: v.pipe(v.string(), v.email()),
});

// Convert to JSON Schema
const jsonSchema = await adapter.toJsonSchema(userSchema);
console.log(jsonSchema);
```

## Usage with TMCP Server

```javascript
import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import * as v from 'valibot';

const adapter = new ValibotJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'Server with Valibot schemas',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

// Define a tool with Valibot schema
server.tool(
	{
		name: 'create_user',
		description: 'Create a new user',
		schema: v.object({
			name: v.string(),
			age: v.pipe(v.number(), v.minValue(0)),
			email: v.pipe(v.string(), v.email()),
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

### Custom Validation and Metadata

```javascript
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import * as v from 'valibot';

const adapter = new ValibotJsonSchemaAdapter();

// Schema with custom descriptions and metadata
const userSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	age: v.pipe(v.number(), v.minValue(0), v.maxValue(150)),
	email: v.pipe(v.string(), v.email()),
	preferences: v.optional(
		v.object({
			theme: v.picklist(['light', 'dark']),
			notifications: v.boolean(),
		}),
	),
});

const jsonSchema = await adapter.toJsonSchema(userSchema);
```

### Complex Schemas

```javascript
import * as v from 'valibot';

// Union types
const contactSchema = v.union([
	v.object({
		type: v.literal('email'),
		value: v.pipe(v.string(), v.email()),
	}),
	v.object({
		type: v.literal('phone'),
		value: v.pipe(v.string(), v.regex(/^\+?\d+$/)),
	}),
]);

// Arrays and nested objects
const companySchema = v.object({
	name: v.string(),
	employees: v.array(userSchema),
	contacts: v.array(contactSchema),
	founded: v.pipe(
		v.date(),
		v.transform((date) => date.toISOString()),
	),
});
```

## API

### `ValibotJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides Valibot-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts a Valibot schema to JSON Schema format

## Dependencies

- `valibot` - Peer dependency for schema validation (^1.1.0)
- `tmcp` - Peer dependency for the base adapter
- `@valibot/to-json-schema` - For schema conversion

## Features

- **Full Valibot support** - Supports all Valibot schema types and validations
- **Type safety** - Full TypeScript support with proper type inference
- **Rich validation** - Preserves validation rules and transformations
- **Easy integration** - Drop-in replacement for other TMCP adapters
- **Performance** - Efficient schema conversion using Valibot's built-in utilities

## Acknowledgments

Huge thanks to Sean O'Bannon that provided us with the `@tmcp` scope on npm.
