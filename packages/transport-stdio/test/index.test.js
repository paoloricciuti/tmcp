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

	it('aborts the signal of a legacy request on notifications/cancelled', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		/** @type {unknown} */
		let reason;
		server.tool(
			{ name: 'slow', description: 'Waits until cancelled' },
			async () => {
				const signal = server.ctx.signal;
				if (!signal)
					throw new Error('Expected a signal in the context');
				reason = await new Promise((resolve) => {
					if (signal.aborted) resolve(signal.reason);
					signal.addEventListener('abort', () =>
						resolve(signal.reason),
					);
				});
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
					expect.objectContaining({ id: 0 }),
				),
			);

			process.stdin.emit(
				'data',
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'slow', arguments: {} },
				}) +
					'\n' +
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'notifications/cancelled',
						params: { requestId: 1, reason: 'user cancelled' },
					}) +
					'\n',
			);
			await vi.waitFor(() => expect(reason).toBe('user cancelled'));
			await transport.close();
			expect(writes).not.toContainEqual(
				expect.objectContaining({ id: 1 }),
			);
		} finally {
			await transport.close();
			write.mockRestore();
		}
	});

	it.each([
		['a missing JSON-RPC version', { jsonrpc: undefined }],
		['an invalid JSON-RPC version', { jsonrpc: '1.0' }],
		['a request ID', { id: 1 }],
		['null metadata', { params: { requestId: 1, _meta: null } }],
		['array metadata', { params: { requestId: 1, _meta: [] } }],
		['an invalid reason', { params: { requestId: 1, reason: 42 } }],
	])('ignores cancellation notifications with %s', async (_, overrides) => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		/** @type {AbortSignal | undefined} */
		let signal;
		/** @type {(value?: void) => void} */
		let release = () => {};
		const pending = new Promise((resolve) => {
			release = resolve;
		});
		server.tool(
			{ name: 'slow', description: 'Waits before responding' },
			async () => {
				signal = server.ctx.signal;
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
		/** @param {unknown} message */
		const send = (message) =>
			process.stdin.emit('data', JSON.stringify(message) + '\n');

		try {
			transport.listen();
			send({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'slow', arguments: {} },
			});
			await vi.waitFor(() => expect(signal).toBeDefined());
			send({
				jsonrpc: '2.0',
				method: 'notifications/cancelled',
				params: { requestId: 1 },
				...overrides,
			});
			expect(signal?.aborted).toBe(false);

			release();
			await vi.waitFor(() =>
				expect(writes).toContainEqual({
					jsonrpc: '2.0',
					id: 1,
					result: { content: [] },
				}),
			);
		} finally {
			release();
			await transport.close();
			write.mockRestore();
		}
	});

	it('keeps a queued request cancellable when a client response reuses its id', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool(
			{ name: 'round-trip', description: 'Request client data' },
			async () => {
				await server.request({ method: 'client/answer' });
				return { content: [] };
			},
		);
		/** @type {unknown} */
		let reason;
		server.tool(
			{ name: 'slow', description: 'Waits until cancelled' },
			async () => {
				const signal = server.ctx.signal;
				if (!signal)
					throw new Error('Expected a signal in the context');
				reason = await new Promise((resolve) => {
					if (signal.aborted) resolve(signal.reason);
					signal.addEventListener('abort', () =>
						resolve(signal.reason),
					);
				});
				return { content: [] };
			},
		);
		const transport = new StdioTransport(server);
		/** @type {any[]} */
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});
		/** @param {unknown} message */
		const send = (message) =>
			process.stdin.emit('data', JSON.stringify(message) + '\n');

		try {
			transport.listen();
			send({
				jsonrpc: '2.0',
				id: 0,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test-client', version: '1.0.0' },
				},
			});
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 0 }),
				),
			);

			send({
				jsonrpc: '2.0',
				id: 'round-trip',
				method: 'tools/call',
				params: { name: 'round-trip', arguments: {} },
			});
			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({ method: 'client/answer' }),
				),
			);
			const shared_id = writes.find(
				(message) => message.method === 'client/answer',
			)?.id;
			if (shared_id === undefined) {
				throw new Error('Expected a server-to-client request ID');
			}

			// The queued request takes the id of the pending server request,
			// then the client answers that server request with the same id.
			send({
				jsonrpc: '2.0',
				id: shared_id,
				method: 'tools/call',
				params: { name: 'slow', arguments: {} },
			});
			send({ jsonrpc: '2.0', id: shared_id, result: {} });
			send({
				jsonrpc: '2.0',
				method: 'notifications/cancelled',
				params: { requestId: shared_id, reason: 'user cancelled' },
			});

			await vi.waitFor(() => expect(reason).toBe('user cancelled'));
		} finally {
			await transport.close();
			write.mockRestore();
		}
	});

	it('answers session requests while a slow tool call is running', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		/** @type {(value?: void) => void} */
		let release = () => {};
		const pending = new Promise((resolve) => {
			release = resolve;
		});
		let running = 0;
		let max_running = 0;
		server.tool(
			{ name: 'slow', description: 'Waits until released' },
			async () => {
				running++;
				max_running = Math.max(max_running, running);
				await pending;
				running--;
				return { content: [] };
			},
		);
		const transport = new StdioTransport(server);
		/** @type {any[]} */
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});
		/** @param {unknown[]} messages */
		const send = (...messages) =>
			process.stdin.emit(
				'data',
				messages.map((message) => JSON.stringify(message)).join('\n') +
					'\n',
			);

		try {
			transport.listen();
			// Everything in one chunk: the requests after `initialize` must wait
			// for it, then run concurrently.
			send(
				{
					jsonrpc: '2.0',
					id: 0,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: {},
						clientInfo: { name: 'test-client', version: '1.0.0' },
					},
				},
				{ jsonrpc: '2.0', method: 'notifications/initialized' },
				{
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'slow', arguments: {} },
				},
				{
					jsonrpc: '2.0',
					id: 2,
					method: 'tools/call',
					params: { name: 'slow', arguments: {} },
				},
				{ jsonrpc: '2.0', id: 3, method: 'ping' },
				{ jsonrpc: '2.0', id: 4, method: 'tools/list' },
			);

			await vi.waitFor(() => {
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 3, result: {} }),
				);
				expect(writes).toContainEqual(
					expect.objectContaining({
						id: 4,
						result: expect.objectContaining({
							tools: expect.any(Array),
						}),
					}),
				);
				expect(max_running).toBe(2);
			});
			expect(writes[0]).toEqual(expect.objectContaining({ id: 0 }));
			expect(writes).not.toContainEqual(
				expect.objectContaining({ id: 1 }),
			);
			expect(writes).not.toContainEqual(
				expect.objectContaining({ id: 2 }),
			);

			release();
			await vi.waitFor(() => {
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 1, result: { content: [] } }),
				);
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 2, result: { content: [] } }),
				);
			});
		} finally {
			release();
			await transport.close();
			write.mockRestore();
		}
	});

	it.each([
		['succeeds', false],
		['fails', true],
	])('holds session requests until a slow initialize %s', async (_, fail) => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		/** @type {(value?: void) => void} */
		let release = () => {};
		const pending = new Promise((resolve) => {
			release = resolve;
		});
		/** @type {unknown[]} */
		const received = [];
		const receive = server.receive.bind(server);
		const spy = vi
			.spyOn(server, 'receive')
			.mockImplementation(async (message, ctx) => {
				received.push('id' in message ? message.id : message.method);
				if ('method' in message && message.method === 'initialize') {
					await pending;
					if (fail) throw new Error('initialize failed');
				}
				return receive(message, ctx);
			});
		const transport = new StdioTransport(server);
		/** @type {any[]} */
		const writes = [];
		const write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation((value) => {
				writes.push(JSON.parse(String(value)));
				return true;
			});
		/** @param {unknown[]} messages */
		const send = (...messages) =>
			process.stdin.emit(
				'data',
				messages.map((message) => JSON.stringify(message)).join('\n') +
					'\n',
			);

		try {
			transport.listen();
			send(
				{
					jsonrpc: '2.0',
					id: 0,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
				},
				{ jsonrpc: '2.0', id: 1, method: 'ping' },
			);
			// Arrives in a later chunk while initialize is still running.
			await new Promise((resolve) => setImmediate(resolve));
			send({ jsonrpc: '2.0', id: 2, method: 'ping' });
			await new Promise((resolve) => setImmediate(resolve));
			expect(received).toEqual([0]);
			expect(writes).toEqual([]);

			release();
			await vi.waitFor(() => {
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 1, result: {} }),
				);
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 2, result: {} }),
				);
			});
			expect(received).toEqual([0, 1, 2]);
			if (!fail) {
				expect(writes[0]).toEqual(expect.objectContaining({ id: 0 }));
			}
		} finally {
			release();
			await transport.close();
			spy.mockRestore();
			write.mockRestore();
		}
	});

	it('never runs a request cancelled while waiting for initialize', async () => {
		const server = new McpServer(
			{ name: 'test-server', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		const handler = vi.fn(() => ({ content: [] }));
		server.tool({ name: 'tool', description: 'A tool' }, handler);
		const transport = new StdioTransport(server);
		/** @type {any[]} */
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
				[
					{
						jsonrpc: '2.0',
						id: 0,
						method: 'initialize',
						params: {
							protocolVersion: '2025-06-18',
							capabilities: {},
							clientInfo: {
								name: 'test-client',
								version: '1.0.0',
							},
						},
					},
					{
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: { name: 'tool', arguments: {} },
					},
					{
						jsonrpc: '2.0',
						method: 'notifications/cancelled',
						params: { requestId: 1 },
					},
					{ jsonrpc: '2.0', id: 2, method: 'ping' },
				]
					.map((message) => JSON.stringify(message))
					.join('\n') + '\n',
			);

			await vi.waitFor(() =>
				expect(writes).toContainEqual(
					expect.objectContaining({ id: 2, result: {} }),
				),
			);
			expect(handler).not.toHaveBeenCalled();
			expect(writes).not.toContainEqual(
				expect.objectContaining({ id: 1 }),
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
