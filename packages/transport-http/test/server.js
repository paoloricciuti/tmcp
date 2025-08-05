#!/usr/bin/env node

/**
 * Simple Node.js HTTP server with utilities to convert between
 * Node.js Request/Response and Web API Request/Response
 */

/**
 * @import { GenericSchema } from "valibot";
 */

import { createServer } from 'node:http';
import { createRequestListener } from '@remix-run/node-fetch-server';
import { McpServer } from 'tmcp';
import { HttpTransport } from '../src/index.js';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';

/**
 * @typedef {ConstructorParameters<typeof McpServer>[1]} ServerOptions
 */

const adapter = new ValibotJsonSchemaAdapter();

/**
 * @type {ServerOptions}
 */
const DEFAULT_OPTIONS = {
	adapter,
	capabilities: {
		completions: {},
		tools: {
			listChanged: true,
		},
		prompts: {
			listChanged: true,
		},
		resources: {
			listChanged: true,
		},
		logging: {},
	},
};

let mcp_server = new McpServer(
	{
		name: 'simple-server',
		version: '1.0.0',
		description: 'A simple server for testing HTTP transport',
	},
	DEFAULT_OPTIONS,
);

let transport = new HttpTransport(mcp_server);
/**
 * @type {Parameters<ConstructorParameters<typeof Promise<void>>[0]>[0]}
 */
let sse_connected_resolve;

/**
 * @param {Omit<ServerOptions, "adapter">} [options]
 */
export function new_server(options = DEFAULT_OPTIONS) {
	mcp_server = new McpServer(
		{
			name: 'simple-server',
			version: '1.0.0',
			description: 'A simple server for testing HTTP transport',
		},
		{
			adapter,
			...options,
		},
	);
	return {
		/**
		 *
		 * @param {(server: McpServer<GenericSchema>)=>void} cb
		 */
		setup(cb) {
			cb(mcp_server);
			transport = new HttpTransport(mcp_server);
			/**
			 * @type {Promise<void>}
			 */
			let sse_connected = new Promise((resolve) => {
				sse_connected_resolve = resolve;
			});
			return { mcp_server, sse_connected };
		},
	};
}

// Create the server
export const server = createServer(
	createRequestListener(async (request) => {
		const url = new URL(request.url);
		try {
			let response = await transport.respond(request);
			return (
				response ??
				new Response(null, {
					status: 404,
					statusText: 'Not Found',
				})
			);
		} finally {
			if (request.method === 'GET' && url.pathname === '/mcp') {
				console.log('SSE connection established');
				sse_connected_resolve?.();
			}
		}
	}),
);

if (import.meta.url === 'file://' + process.argv[1]) {
	const PORT = +(process.env.PORT || 3000);
	const HOST = process.env.HOST || 'localhost';

	server.listen(PORT, HOST, 0, () => {
		console.log(`server listening on http://${HOST}:${PORT}`);
	});

	process.on('SIGINT', () => {
		console.log('\n🛑 Shutting down server...');
		server.close(() => {
			console.log('✅ Server closed');
			process.exit(0);
		});
	});

	process.on('SIGTERM', () => {
		console.log('\n🛑 Shutting down server...');
		server.close(() => {
			console.log('✅ Server closed');
			process.exit(0);
		});
	});
	// If this file is run directly, start the server
	console.log('Starting server...');
}
