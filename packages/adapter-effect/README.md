# @tmcp/adapter-effect

Effect Schema adapter for TMCP JSON Schema conversion.

## Installation

```bash
npm install @tmcp/adapter-effect effect tmcp
```

## Usage

```javascript
import { EffectJsonSchemaAdapter } from '@tmcp/adapter-effect';
import * as S from 'effect/Schema';

const adapter = new EffectJsonSchemaAdapter();

// Define an Effect schema
const UserSchema = S.Struct({
	name: S.String,
	age: S.Number,
	email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
});

// Convert to JSON Schema
const jsonSchema = await adapter.toJsonSchema(UserSchema);
console.log(jsonSchema);
```

## Usage with TMCP Server

```javascript
import { McpServer } from 'tmcp';
import { EffectJsonSchemaAdapter } from '@tmcp/adapter-effect';
import * as S from 'effect/Schema';

const adapter = new EffectJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'Server with Effect schemas',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

// Define a tool with Effect schema
server.tool(
	{
		name: 'create_user',
		description: 'Create a new user',
		schema: S.Struct({
			name: S.String,
			age: S.Number.pipe(S.positive()),
			email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
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

### Custom JSON Schema Options

```javascript
import { EffectJsonSchemaAdapter } from '@tmcp/adapter-effect';
import * as S from 'effect/Schema';

const adapter = new EffectJsonSchemaAdapter();

// Schema with custom descriptions and metadata
const UserSchema = S.Struct({
	name: S.String.annotations({
		title: 'Full Name',
		description: 'Full name of the user',
	}),
	age: S.Number.pipe(S.positive()).annotations({
		description: 'Age in years',
	}),
	email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)).annotations({
		description: 'Valid email address',
	}),
	preferences: S.optional(
		S.Struct({
			theme: S.Literal('light', 'dark').annotations({ default: 'light' }),
			notifications: S.Boolean.annotations({ default: true }),
		}),
	),
});

const jsonSchema = await adapter.toJsonSchema(UserSchema);
```

### Complex Schemas

```javascript
import * as S from 'effect/Schema';

// Union types
const ContactSchema = S.Union(
	S.Struct({
		type: S.Literal('email'),
		value: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
	}),
	S.Struct({
		type: S.Literal('phone'),
		value: S.String.pipe(S.pattern(/^\+?\d+$/)),
	}),
);

// Arrays and nested objects
const CompanySchema = S.Struct({
	name: S.String,
	employees: S.Array(UserSchema),
	contacts: S.Array(ContactSchema),
	founded: S.Date.pipe(
		S.transform(
			S.String,
			(date) => date.toISOString(),
			(dateStr) => new Date(dateStr),
		),
	),
});
```

## API

### `EffectJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides Effect Schema-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts an Effect schema to JSON Schema format

## Dependencies

- `effect` - Peer dependency for schema validation and type definitions
- `tmcp` - Peer dependency for the base adapter

## Features

- **Full Effect Schema support** - Supports all Effect schema types and transformations
- **Type safety** - Full TypeScript support with proper type inference
- **Rich metadata** - Preserves annotations, descriptions, and validation rules
- **Easy integration** - Drop-in replacement for other TMCP adapters
- **Native JSON Schema** - Uses Effect's built-in JSON Schema generation
