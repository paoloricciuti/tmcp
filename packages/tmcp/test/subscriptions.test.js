import { describe, expect, it, vi } from 'vitest';
import { InMemorySubscriptionManager } from '../../session-manager/src/index.js';
import { McpServer } from '../src/index.js';

const PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
const SUBSCRIPTION_ID = 'io.modelcontextprotocol/subscriptionId';
const server_info = { name: 'subscriptions-test', version: '1.0.0' };

/**
 * @param {string | number} id
 * @param {Record<string, unknown>} notifications
 */
function listen_request(id, notifications) {
	return {
		jsonrpc: /** @type {const} */ ('2.0'),
		id,
		method: 'subscriptions/listen',
		params: {
			notifications,
			_meta: {
				[PROTOCOL_VERSION]: '2026-07-28',
				[CLIENT_CAPABILITIES]: {},
			},
		},
	};
}

function create_server() {
	return new McpServer(server_info, {
		adapter: undefined,
		capabilities: {
			tools: { listChanged: true },
			prompts: { listChanged: false },
			resources: { listChanged: true, subscribe: true },
		},
	});
}

/**
 * Model the transport side of the reused `broadcast` lifecycle.
 * @param {McpServer<any, any>} server
 * @param {InMemorySubscriptionManager} manager
 */
function publish_broadcasts(server, manager) {
	return server.on('broadcast', ({ request }) => {
		Promise.resolve(manager.send(request)).catch(() => {});
	});
}

/**
 * @param {string} origin
 * @param {InMemorySubscriptionManager} manager
 */
function subscription_context(origin, manager) {
	return { subscriptionOrigin: origin, subscriptionManager: manager };
}

describe('per-request subscriptions', () => {
	it('advertises notification capabilities only with a capable transport and rejects legacy listen', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();
		const request = {
			jsonrpc: /** @type {const} */ ('2.0'),
			id: 1,
			method: 'server/discover',
			params: {
				_meta: {
					[PROTOCOL_VERSION]: '2026-07-28',
					[CLIENT_CAPABILITIES]: {},
				},
			},
		};

		const unsupported = await server.receive(request);
		const supported = await server.receive(
			request,
			subscription_context('discovery', manager),
		);

		expect(unsupported.result.capabilities).toEqual({
			tools: {},
			prompts: {},
			resources: {},
		});
		expect(supported.result.capabilities).toEqual({
			tools: { listChanged: true },
			prompts: { listChanged: false },
			resources: { listChanged: true, subscribe: true },
		});

		const legacy = await server.receive({
			jsonrpc: '2.0',
			id: 2,
			method: 'subscriptions/listen',
			params: { notifications: {} },
		});
		expect(legacy.error.code).toBe(-32601);
	});

	it('requires both transport routing fields', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();

		const without_transport = await server.receive(listen_request(3, {}));
		const without_origin = await server.receive(listen_request(4, {}), {
			subscriptionManager: manager,
		});
		const invalid_origin = await server.receive(
			listen_request(5, {}),
			/** @type {any} */ ({
				subscriptionManager: manager,
				subscriptionOrigin: 42,
			}),
		);
		const invalid_discovery = await server.receive(
			{
				jsonrpc: '2.0',
				id: 6,
				method: 'server/discover',
				params: listen_request(6, {}).params,
			},
			/** @type {any} */ ({
				subscriptionManager: manager,
				subscriptionOrigin: 42,
			}),
		);

		expect(without_transport.error.code).toBe(-32603);
		expect(without_transport.error.message).toContain(
			'subscriptionManager',
		);
		expect(without_origin.error.code).toBe(-32603);
		expect(without_origin.error.message).toContain('subscriptionOrigin');
		expect(invalid_origin.error.code).toBe(-32603);
		expect(invalid_discovery.result.capabilities).toEqual({
			tools: {},
			prompts: {},
			resources: {},
		});
	});

	it('uses routed send for acknowledgement and completes through the transport manager', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();
		const origin = 'acknowledgement-client';
		server.resource(
			{
				name: 'one',
				description: 'resource one',
				uri: 'test://one',
			},
			() => ({ contents: [] }),
		);
		const sent = vi.fn();
		server.on('send', sent);

		const listen = server.receive(
			listen_request(7, {
				toolsListChanged: true,
				promptsListChanged: true,
				resourceSubscriptions: [
					'test://one',
					'test://one',
					'test://unknown',
				],
			}),
			subscription_context(origin, manager),
		);

		await vi.waitFor(() => expect(sent).toHaveBeenCalledOnce());
		expect(sent).toHaveBeenCalledWith({
			subscriptionId: 7,
			subscriptionOrigin: origin,
			request: {
				jsonrpc: '2.0',
				method: 'notifications/subscriptions/acknowledged',
				params: {
					notifications: {
						toolsListChanged: true,
						resourceSubscriptions: ['test://one'],
					},
					_meta: { [SUBSCRIPTION_ID]: 7 },
				},
			},
		});

		expect(await manager.close(7, origin, 'closed')).toBe(true);
		await expect(listen).resolves.toMatchObject({
			id: 7,
			result: {
				resultType: 'complete',
				_meta: {
					[SUBSCRIPTION_ID]: 7,
					'io.modelcontextprotocol/serverInfo': server_info,
				},
			},
		});
		expect(await manager.close(7, origin, 'closed')).toBe(false);
	});

	it('routes matching changes via broadcast while preserving legacy template behavior', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();
		publish_broadcasts(server, manager);
		server.resource(
			{
				name: 'one',
				description: 'resource one',
				uri: 'test://one',
			},
			() => ({ contents: [] }),
		);
		server.template(
			{
				name: 'dynamic',
				description: 'dynamic resource',
				uri: 'test://dynamic/{id}',
			},
			() => ({ contents: [] }),
		);
		/** @type {Array<Parameters<import('../src/internal/internal.js').McpEvents['send']>[0]>} */
		const messages = [];
		/** @type {Array<Parameters<import('../src/internal/internal.js').McpEvents['broadcast']>[0]>} */
		const broadcasts = [];
		server.on('send', (message) => messages.push(message));
		server.on('broadcast', (message) => broadcasts.push(message));

		const tools = server.receive(
			listen_request(1, { toolsListChanged: true }),
			subscription_context('tools', manager),
		);
		const resources = server.receive(
			listen_request(1, {
				resourcesListChanged: true,
				resourceSubscriptions: [
					'test://one',
					'test://dynamic/one',
					'test://dynamic/{id}',
				],
			}),
			subscription_context('resources', manager),
		);
		await vi.waitFor(() => expect(messages).toHaveLength(2));
		expect(
			messages.find(
				({ subscriptionOrigin }) => subscriptionOrigin === 'resources',
			),
		).toMatchObject({
			request: {
				params: {
					notifications: {
						resourceSubscriptions: [
							'test://one',
							'test://dynamic/one',
						],
					},
				},
			},
		});
		messages.length = 0;

		server.changed('tools');
		server.changed('resources');
		server.changed('resource', 'test://one');
		server.changed('resource', 'test://dynamic/one');
		await vi.waitFor(() => expect(messages).toHaveLength(4));
		expect(
			messages.map(({ subscriptionOrigin, request }) => [
				subscriptionOrigin,
				request.method,
			]),
		).toEqual([
			['tools', 'notifications/tools/list_changed'],
			['resources', 'notifications/resources/list_changed'],
			['resources', 'notifications/resources/updated'],
			['resources', 'notifications/resources/updated'],
		]);
		expect(broadcasts.at(-1)).toMatchObject({
			subscriptionOnly: true,
			request: {
				method: 'notifications/resources/updated',
				params: { uri: 'test://dynamic/one' },
			},
		});

		server.changed('resource', 'test://dynamic/{id}');
		expect(broadcasts.at(-1)).toEqual({
			request: {
				jsonrpc: '2.0',
				method: 'notifications/resources/updated',
				params: {
					uri: 'test://dynamic/{id}',
					title: 'dynamic',
				},
			},
		});

		await manager.close(1, 'tools', 'closed');
		await manager.close(1, 'resources', 'closed');
		await Promise.all([tools, resources]);
	});

	it('cancels only the matching origin and ignores malformed cancellation', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();
		const sent = vi.fn();
		server.on('send', sent);
		const first = server.receive(
			listen_request(3, {}),
			subscription_context('first', manager),
		);
		const second = server.receive(
			listen_request(3, {}),
			subscription_context('second', manager),
		);
		let first_settled = false;
		void first.then(() => {
			first_settled = true;
		});
		await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));

		await server.receive(
			{
				jsonrpc: '2.0',
				method: 'notifications/cancelled',
				params: { requestId: 3, reason: 42 },
			},
			subscription_context('first', manager),
		);
		await Promise.resolve();
		expect(first_settled).toBe(false);
		expect(await manager.close(3, 'missing', 'closed')).toBe(false);

		await server.receive(
			{
				jsonrpc: '2.0',
				method: 'notifications/cancelled',
				params: {
					requestId: 3,
					reason: 'client closed the stream',
					_meta: { [SUBSCRIPTION_ID]: false },
				},
			},
			subscription_context('first', manager),
		);
		await expect(first).resolves.toMatchObject({ id: 3 });
		expect(await manager.close(3, 'first', 'closed')).toBe(false);
		expect(await manager.close(3, 'second', 'closed')).toBe(true);
		await expect(second).resolves.toMatchObject({ id: 3 });
	});

	it('preserves request ID types, rejects duplicates, and ignores notification-form listen', async () => {
		const server = create_server();
		const manager = new InMemorySubscriptionManager();
		const create = vi.spyOn(manager, 'create');
		const sent = vi.fn();
		server.on('send', sent);
		const origin = 'typed-ids';
		const numeric = server.receive(
			listen_request(1, {}),
			subscription_context(origin, manager),
		);
		const string = server.receive(
			listen_request('1', {}),
			subscription_context(origin, manager),
		);
		await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));

		const duplicate = await server.receive(
			listen_request(1, {}),
			subscription_context(origin, manager),
		);
		expect(duplicate.error.code).toBe(-32602);

		const notification = {
			jsonrpc: /** @type {const} */ ('2.0'),
			method: 'subscriptions/listen',
			params: listen_request(99, {}).params,
		};
		expect(
			await server.receive(
				notification,
				subscription_context(origin, manager),
			),
		).toBeNull();
		expect(create).toHaveBeenCalledTimes(3);

		await manager.close(1, origin, 'closed');
		await manager.close('1', origin, 'closed');
		await Promise.all([numeric, string]);
	});

	it('keeps ordinary request notifications off subscription routing', async () => {
		const server = new McpServer(server_info, {
			adapter: undefined,
			capabilities: { logging: {}, tools: {} },
		});
		const manager = new InMemorySubscriptionManager();
		server.tool({ name: 'log', description: 'write a log message' }, () => {
			server.log('info', 'request log');
			return { content: [] };
		});
		/** @type {Array<Parameters<import('../src/internal/internal.js').McpEvents['send']>[0]>} */
		const sent = [];
		server.on('send', (message) => sent.push(message));
		const listen = server.receive(
			listen_request(5, {}),
			subscription_context('logging', manager),
		);
		await vi.waitFor(() => expect(sent).toHaveLength(1));

		await server.receive({
			jsonrpc: '2.0',
			id: 6,
			method: 'tools/call',
			params: {
				name: 'log',
				_meta: {
					[PROTOCOL_VERSION]: '2026-07-28',
					[CLIENT_CAPABILITIES]: {},
					'io.modelcontextprotocol/logLevel': 'info',
				},
			},
		});

		expect(sent).toHaveLength(2);
		expect(sent[1]).toMatchObject({
			request: { method: 'notifications/message' },
		});
		expect(sent[1].subscriptionId).toBeUndefined();
		await manager.close(5, 'logging', 'closed');
		await listen;
	});

	it('fans out across servers sharing a transport manager', async () => {
		const manager = new InMemorySubscriptionManager();
		const first_server = create_server();
		const second_server = create_server();
		publish_broadcasts(first_server, manager);
		publish_broadcasts(second_server, manager);
		const first_messages = vi.fn();
		const second_messages = vi.fn();
		first_server.on('send', first_messages);
		second_server.on('send', second_messages);

		const first = first_server.receive(
			listen_request(10, { toolsListChanged: true }),
			subscription_context('first-server', manager),
		);
		const second = second_server.receive(
			listen_request(10, { toolsListChanged: true }),
			subscription_context('second-server', manager),
		);
		await vi.waitFor(() => {
			expect(first_messages).toHaveBeenCalledOnce();
			expect(second_messages).toHaveBeenCalledOnce();
		});
		first_messages.mockClear();
		second_messages.mockClear();

		first_server.changed('tools');
		await vi.waitFor(() => {
			expect(first_messages).toHaveBeenCalledOnce();
			expect(second_messages).toHaveBeenCalledOnce();
		});

		await manager.closeAll(undefined, 'closed');
		await Promise.all([first, second]);
	});
});

describe('InMemorySubscriptionManager', () => {
	it('buffers notifications until acknowledgement and preserves FIFO delivery', async () => {
		const manager = new InMemorySubscriptionManager();
		/** @type {(value?: void) => void} */
		let acknowledge = () => {};
		const acknowledgement = new Promise((resolve) => {
			acknowledge = resolve;
		});
		/** @type {(value?: void) => void} */
		let release_first = () => {};
		const first_delivery = new Promise((resolve) => {
			release_first = resolve;
		});
		/** @type {string[]} */
		const order = [];
		const creation = manager.create(
			{
				id: 1,
				origin: 'fifo',
				filters: { toolsListChanged: true },
			},
			{
				acknowledge: async () => {
					order.push('acknowledging');
					await acknowledgement;
					order.push('acknowledged');
				},
				send: async (notification) => {
					const value = String(notification.params?.order);
					order.push(value);
					if (value === 'first') {
						await first_delivery;
					}
				},
				close: () => {},
			},
		);

		const first = manager.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
			params: { order: 'first' },
		});
		const second = manager.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
			params: { order: 'second' },
		});
		expect(order).toEqual(['acknowledging']);

		acknowledge();
		await vi.waitFor(() =>
			expect(order).toEqual(['acknowledging', 'acknowledged', 'first']),
		);
		release_first();
		await Promise.all([creation, first, second]);
		expect(order).toEqual([
			'acknowledging',
			'acknowledged',
			'first',
			'second',
		]);
		await manager.close(1, 'fifo', 'closed');
	});

	it('cleans up an acknowledgement failure and permits retry', async () => {
		const manager = new InMemorySubscriptionManager();
		const subscription = { id: 2, origin: 'retry', filters: {} };
		await expect(
			manager.create(subscription, {
				acknowledge: () => Promise.reject(new Error('write failed')),
				send: () => {},
				close: () => {},
			}),
		).rejects.toThrow('write failed');

		await expect(
			manager.create(subscription, {
				acknowledge: () => {},
				send: () => {},
				close: () => {},
			}),
		).resolves.toBe(true);
		await manager.close(2, 'retry', 'closed');
	});

	it('closes during acknowledgement without leaking the registration', async () => {
		const manager = new InMemorySubscriptionManager();
		/** @type {(value?: void) => void} */
		let acknowledge = () => {};
		const acknowledgement = new Promise((resolve) => {
			acknowledge = resolve;
		});
		const close = vi.fn();
		const creation = manager.create(
			{ id: 3, origin: 'closing-ack', filters: {} },
			{
				acknowledge: () => acknowledgement,
				send: () => {},
				close,
			},
		);

		const closing = manager.close(3, 'closing-ack', 'cancelled');
		expect(close).not.toHaveBeenCalled();
		acknowledge();
		await expect(closing).resolves.toBe(true);
		expect(close).toHaveBeenCalledWith('cancelled');
		await expect(creation).resolves.toBe(true);
		await expect(
			manager.create(
				{ id: 3, origin: 'closing-ack', filters: {} },
				{
					acknowledge: () => {},
					send: () => {},
					close: () => {},
				},
			),
		).resolves.toBe(true);
		await manager.close(3, 'closing-ack', 'closed');
	});

	it('keeps the key occupied until close dispatch completes', async () => {
		const manager = new InMemorySubscriptionManager();
		/** @type {(value?: void) => void} */
		let release_close = () => {};
		const closing = new Promise((resolve) => {
			release_close = resolve;
		});
		await manager.create(
			{ id: 4, origin: 'relisten', filters: {} },
			{
				acknowledge: () => {},
				send: () => {},
				close: () => closing,
			},
		);
		const close = manager.close(4, 'relisten', 'closed');
		await Promise.resolve();

		await expect(
			manager.create(
				{ id: 4, origin: 'relisten', filters: {} },
				{
					acknowledge: () => {},
					send: () => {},
					close: () => {},
				},
			),
		).resolves.toBe(false);
		release_close();
		await close;
		await expect(
			manager.create(
				{ id: 4, origin: 'relisten', filters: {} },
				{
					acknowledge: () => {},
					send: () => {},
					close: () => {},
				},
			),
		).resolves.toBe(true);
		await manager.close(4, 'relisten', 'closed');
	});

	it('skips queued delivery once close wins the race', async () => {
		const manager = new InMemorySubscriptionManager();
		const send = vi.fn();
		await manager.create(
			{
				id: 5,
				origin: 'send-close',
				filters: { toolsListChanged: true },
			},
			{ acknowledge: () => {}, send, close: () => {} },
		);
		const delivery = manager.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
			params: {},
		});
		await manager.close(5, 'send-close', 'closed');
		await delivery;
		expect(send).not.toHaveBeenCalled();
	});
});
