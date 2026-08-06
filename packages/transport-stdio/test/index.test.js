import process from 'node:process';
import { InMemorySubscriptionManager } from '@tmcp/session-manager';
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

			await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
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

	it('keeps a modern listen open while handling changes, requests, and cancellation', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: { tools: { listChanged: true } },
			},
		);
		const transport = new StdioTransport(server);
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});
		const metadata = {
			[PROTOCOL_VERSION]: '2026-07-28',
			[CLIENT_CAPABILITIES]: {},
		};

		try {
			transport.listen();
			transport.listen();
			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'subscriptions/listen',
					params: {
						notifications: { toolsListChanged: true },
						_meta: metadata,
					},
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						method: 'notifications/subscriptions/acknowledged',
					}),
				),
			);
			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'subscriptions/listen',
					params: {
						notifications: { toolsListChanged: true },
						_meta: metadata,
					},
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						id: 1,
						error: expect.objectContaining({ code: -32602 }),
					}),
				),
			);

			server.changed('tools');
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						method: 'notifications/tools/list_changed',
					}),
				),
			);

			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 2,
					method: 'server/discover',
					params: { _meta: metadata },
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						id: 2,
						result: expect.anything(),
					}),
				),
			);

			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'notifications/cancelled',
					params: { requestId: 1, reason: 'unused' },
				}) + '\n',
			);
			await vi.waitFor(async () =>
				expect(transport.closeSubscription(1)).resolves.toBe(false),
			);
			expect(
				writes.some(
					(message) => message.id === 1 && 'result' in message,
				),
			).toBe(false);
		} finally {
			await transport.close();
			write.mockRestore();
		}
	});

	it('gracefully completes a modern subscription', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const transport = new StdioTransport(server);
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});

		try {
			transport.listen();
			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 3,
					method: 'subscriptions/listen',
					params: {
						notifications: {},
						_meta: {
							[PROTOCOL_VERSION]: '2026-07-28',
							[CLIENT_CAPABILITIES]: {},
						},
					},
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						method: 'notifications/subscriptions/acknowledged',
					}),
				),
			);

			await expect(transport.closeSubscription(3)).resolves.toBe(true);
			await vi.waitFor(() =>
				expect(writes).toContainEqual({
					jsonrpc: '2.0',
					id: 3,
					result: {
						resultType: 'complete',
						_meta: expect.objectContaining({
							'io.modelcontextprotocol/subscriptionId': 3,
						}),
					},
				}),
			);
		} finally {
			await transport.close();
			write.mockRestore();
		}
	});

	it('processes client responses while a legacy request is waiting for them', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool(
			{ name: 'round-trip', description: 'Request client data' },
			async () => {
				const result = await server.request({
					method: 'client/answer',
				});
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);
		const transport = new StdioTransport(server);
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});

		try {
			transport.listen();
			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 0,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: {},
						clientInfo: { name: 'test-client', version: '1.0.0' },
					},
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						id: 0,
						result: expect.anything(),
					}),
				),
			);

			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'round-trip', arguments: {} },
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({ method: 'client/answer' }),
				),
			);
			const client_request = writes.find(
				(message) => message.method === 'client/answer',
			);
			if (client_request?.id === undefined) {
				throw new Error('Expected a server-to-client request ID');
			}

			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: client_request.id,
					result: { answer: 'ok' },
				}) + '\n',
			);
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({
						id: 1,
						result: expect.objectContaining({
							content: [
								{
									type: 'text',
									text: JSON.stringify({ answer: 'ok' }),
								},
							],
						}),
					}),
				),
			);
		} finally {
			await transport.close();
			write.mockRestore();
		}
	});

	it('drains queued legacy work before closing', async () => {
		/** @type {(value?: void) => void} */
		let release = () => {};
		const pending = new Promise((resolve) => {
			release = resolve;
		});
		/** @type {(value?: void) => void} */
		let started = () => {};
		const execution = new Promise((resolve) => {
			started = resolve;
		});
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool(
			{ name: 'delayed', description: 'Wait before responding' },
			async () => {
				started();
				await pending;
				return { content: [] };
			},
		);
		const transport = new StdioTransport(server);
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});

		try {
			transport.listen();
			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 20,
					method: 'tools/call',
					params: { name: 'delayed', arguments: {} },
				}) + '\n',
			);
			await execution;
			const closing = transport.close();
			release();
			await closing;

			expect(writes).toContainEqual(
				expect.objectContaining({ id: 20, result: expect.anything() }),
			);
		} finally {
			release();
			await transport.close();
			write.mockRestore();
		}
	});

	it('finishes shutdown when subscription cleanup fails', async () => {
		const close_all = vi
			.spyOn(InMemorySubscriptionManager.prototype, 'closeAll')
			.mockRejectedValueOnce(new Error('cleanup failed'));
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new StdioTransport(server);

		try {
			await expect(transport.close()).resolves.toBeUndefined();
		} finally {
			close_all.mockRestore();
		}
	});
});
