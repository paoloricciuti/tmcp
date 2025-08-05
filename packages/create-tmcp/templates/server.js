#!/usr/bin/env node

{{IMPORTS}}

const server = new McpServer(
	{
		name: 'example-server',
		version: '1.0.0',
		description: 'An example TMCP server',
	}{{ADAPTER_SETUP}}
);

{{EXAMPLE_TOOL}}

{{HTTP_TRANSPORTS_SETUP}}
{{SERVER_SETUP}}{{STDIO_SETUP}}