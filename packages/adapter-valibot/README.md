# @tmcpkit/adapter-valibot

Valibot adapter for TMCP JSON Schema conversion.

## Installation

```bash
npm install @tmcpkit/adapter-valibot valibot tmcp
```

## Usage

```javascript
import { ValibotJsonSchemaAdapter } from '@tmcpkit/adapter-valibot';
import * as v from 'valibot';

const adapter = new ValibotJsonSchemaAdapter();

// Define a Valibot schema
const userSchema = v.object({
	name: v.string(),
	age: v.number(),
	email: v.pipe(v.string(), v.email()),
});

// Convert to JSON Schema
const jsonSchema = adapter.toJsonSchema(userSchema);
console.log(jsonSchema);
```

## API

### `ValibotJsonSchemaAdapter`

A class that extends the base `JsonSchemaAdapter` from TMCP and provides Valibot-specific schema conversion.

#### Methods

- `toJsonSchema(schema)` - Converts a Valibot schema to JSON Schema format

## Dependencies

- `valibot` - Peer dependency for schema validation
- `tmcp` - Peer dependency for the base adapter
- `@valibot/to-json-schema` - For schema conversion
