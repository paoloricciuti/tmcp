import process from 'node:process';
import { McpServer } from 'tmcp';
import { describe, expect, it, vi } from 'vitest';
import { StdioTransport } from '../src/index.js';

const PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
const LOG_LEVEL = 'io.modelcontextprotocol/logLevel';

describe('StdioTransport', () => {
	it('writes stateless log notifications before initialization', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: { tools: {}, logging: {} },
			},
		);
		new StdioTransport(server);
		server.tool({ name: 'logger', description: 'logs a message' }, () => {
			server.log('info', 'before initialize');
			return { content: [] };
		});
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);

		try {
			await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: {
					name: 'logger',
					_meta: {
						[PROTOCOL_VERSION]: '2026-07-28',
						[CLIENT_CAPABILITIES]: {},
						[LOG_LEVEL]: 'info',
					},
				},
			});

			expect(write).toHaveBeenCalledOnce();
			expect(write).toHaveBeenCalledWith(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'notifications/message',
					params: {
						level: 'info',
						data: 'before initialize',
					},
				}) + '\n',
			);
		} finally {
			write.mockRestore();
		}
	});
});
