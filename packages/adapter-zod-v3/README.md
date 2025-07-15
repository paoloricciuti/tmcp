# @tmcp/adapter-zod-v3

Zod v3 adapter for TMCP JSON Schema conversion.

## Installation

```bash
npm install @tmcp/adapter-zod-v3 zod tmcp
```

## Usage

```javascript
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod-v3';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();

// Define a Zod schema
const userSchema = z.object({
	name: z.string(),
	age: z.number(),
	email: z.string().email(),
});

// Convert to JSON Schema
const jsonSchema = await adapter.toJsonSchema(userSchema);
console.log(jsonSchema);
```

## Usage with TMCP Server

```javascript
import { McpServer } from 'tmcp';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod-v3';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(
	{
		name: 'my-server',
		version: '1.0.0',
		description: 'Server with Zod schemas',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

// Define a tool with Zod schema
server.tool(
	{
		name: 'create_user',
		description: 'Create a new user',
		schema: z.object({
			name: z.string(),
			age: z.number().positive(),
			email: z.string().email(),
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
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod-v3';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();

// Schema with custom descriptions and metadata
const userSchema = z.object({
	name: z.string().describe('Full name of the user'),
	age: z.number().positive().describe('Age in years'),
	email: z.string().email().describe('Valid email address'),
	preferences: z
		.object({
			theme: z.enum(['light', 'dark']).default('light'),
			notifications: z.boolean().default(true),
		})
		.optional(),
});

const jsonSchema = await adapter.toJsonSchema(userSchema);
```

### Complex Schemas

```javascript
import { z } from 'zod';

// Union types
const contactSchema = z.union([
	z.object({ type: z.literal('email'), value: z.string().email() }),
	z.object({ type: z.literal('phone'), value: z.string().regex(/^\+?\d+$/) }),
]);

// Arrays and nested objects
const companySchema = z.object({
	name: z.string(),
	employees: z.array(userSchema),
	contacts: z.array(contactSchema),
	founded: z.date().transform((date) => date.toISOString()),
});
```

## API

### `ZodJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides Zod-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts a Zod schema to JSON Schema format

## Dependencies

- `zod` - Peer dependency for schema validation and type definitions
- `tmcp` - Peer dependency for the base adapter
- `zod-to-json-schema` - For schema conversion

## Features

- **Full Zod support** - Supports all Zod schema types and transformations
- **Type safety** - Full TypeScript support with proper type inference
- **Rich metadata** - Preserves descriptions, defaults, and validation rules
- **Easy integration** - Drop-in replacement for other TMCP adapters
- **Battle-tested** - Uses the well-maintained `zod-to-json-schema` library
