```ts
import { McpServer } from 'tmcp';
import { tool } from 'tmcp/utils';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { StdioTransport } from '@tmcp/transport-stdio';
import * as v from 'valibot';

export const server = new McpServer(
	{
		name: 'my-awesome-server',
		version: '1.0.0',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: {},
		},
	},
);

server.tool(
	{
		name: 'add',
		description: 'Adds two numbers',
		schema: v.object({
			first: v.number(),
			second: v.number(),
		}),
	},
	({ first, second }) => {
		return tool.text(`${first}+${second} is ${first + second}`);
	},
);

const stdio = new StdioTransport(server);
stdio.listen();
```
