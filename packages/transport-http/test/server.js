#!/usr/bin/env node

/**
 * Simple Node.js HTTP server with utilities to convert between
 * Node.js Request/Response and Web API Request/Response
 */

/**
 * @import { GenericSchema } from "valibot";
 */

import { createServer } from 'node:http';
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
			return mcp_server;
		},
	};
}

/**
 * Convert Node.js IncomingMessage to Web API Request
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Request>}
 */
async function to_request(req) {
	const url = `http://${req.headers.host}${req.url}`;

	// Collect body data if present
	let body = null;
	if (
		req.method === 'POST' ||
		req.method === 'PUT' ||
		req.method === 'PATCH'
	) {
		const chunks = [];
		for await (const chunk of req) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);
		body = buffer.length > 0 ? buffer : null;
	}

	// Convert headers
	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (Array.isArray(value)) {
			for (const v of value) {
				headers.append(key, v);
			}
		} else if (value !== undefined) {
			headers.set(key, value);
		}
	}

	return new Request(url, {
		method: req.method || 'GET',
		headers,
		body,
	});
}

/**
 * Copy Web API Response to Node.js ServerResponse
 * @param {Response} webResponse
 * @param {import('node:http').ServerResponse} res
 */
async function to_response(webResponse, res) {
	// Set status code
	res.statusCode = webResponse.status;

	// Copy headers
	for (const [key, value] of webResponse.headers.entries()) {
		res.setHeader(key, value);
	}

	// Handle body
	if (webResponse.body) {
		// Start the response immediately by sending headers
		res.flushHeaders();

		const reader = webResponse.body.getReader();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					res.end();
					break;
				}

				if (!res.write(value)) {
					await new Promise((resolve) => res.once('drain', resolve));
				}
			}
		} catch (error) {
			if (!res.headersSent) {
				res.statusCode = 500;
				res.end();
			} else {
				res.destroy();
			}
			throw error;
		} finally {
			reader.releaseLock();
		}
	} else {
		res.end();
	}
}

// Create the server
export const server = createServer(async (req, res) => {
	try {
		console.log(`${req.method} ${req.url}`);

		const request = await to_request(req);

		let response = await transport.respond(request);

		if (!response) {
			response = new Response(null, {
				status: 404,
			});
		}

		// Convert Web API Response back to Node.js response
		await to_response(response, res);
	} catch (error) {
		console.error('Server error:', error);

		if (!res.headersSent) {
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Internal Server Error');
		}
	}
});

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
