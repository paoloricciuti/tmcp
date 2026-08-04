import { McpServer } from 'tmcp';
import { describe, expect, it } from 'vitest';
import { HttpTransport } from '../src/index.js';

const PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
const LOG_LEVEL = 'io.modelcontextprotocol/logLevel';

/**
 * @param {string} name
 * @param {string} session_id
 */
function tool_request(name, session_id) {
	return new Request('http://localhost/mcp', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'mcp-session-id': session_id,
			'MCP-Protocol-Version': '2026-07-28',
			'Mcp-Method': 'tools/call',
			'Mcp-Name': name,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: {
				name,
				_meta: {
					[PROTOCOL_VERSION]: '2026-07-28',
					[CLIENT_CAPABILITIES]: {},
					[LOG_LEVEL]: 'info',
				},
			},
		}),
	});
}

/**
 * @param {string} body
 */
function event_messages(body) {
	return body
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => JSON.parse(line.slice(6)));
}

describe('HttpTransport stateless logging', () => {
	it('routes concurrent log notifications to their originating response streams', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: { tools: {}, logging: {} },
			},
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const slow_gate = Promise.withResolvers();
		const slow_started = Promise.withResolvers();

		server.tool({ name: 'slow', description: 'slow logger' }, async () => {
			slow_started.resolve(undefined);
			await slow_gate.promise;
			server.log('info', 'slow');
			return { content: [] };
		});
		server.tool({ name: 'fast', description: 'fast logger' }, () => {
			server.log('info', 'fast');
			return { content: [] };
		});

		const slow_response = await transport.respond(
			tool_request('slow', 'slow-session'),
		);
		await slow_started.promise;
		const fast_response = await transport.respond(
			tool_request('fast', 'fast-session'),
		);
		slow_gate.resolve(undefined);

		const [slow_body, fast_body] = await Promise.all([
			slow_response?.text(),
			fast_response?.text(),
		]);
		const slow_messages = event_messages(slow_body ?? '');
		const fast_messages = event_messages(fast_body ?? '');

		expect(slow_messages).toContainEqual({
			jsonrpc: '2.0',
			method: 'notifications/message',
			params: { level: 'info', data: 'slow' },
		});
		expect(slow_messages).not.toContainEqual(
			expect.objectContaining({
				method: 'notifications/message',
				params: expect.objectContaining({ data: 'fast' }),
			}),
		);
		expect(fast_messages).toContainEqual({
			jsonrpc: '2.0',
			method: 'notifications/message',
			params: { level: 'info', data: 'fast' },
		});
		expect(fast_messages).not.toContainEqual(
			expect.objectContaining({
				method: 'notifications/message',
				params: expect.objectContaining({ data: 'slow' }),
			}),
		);
	});
});
