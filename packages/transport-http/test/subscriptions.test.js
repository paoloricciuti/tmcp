import { InMemorySubscriptionManager } from '@tmcp/session-manager';
import { McpServer } from 'tmcp';
import { describe, expect, it, vi } from 'vitest';
import { HttpTransport } from '../src/index.js';

const PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
const SUBSCRIPTION_ID = 'io.modelcontextprotocol/subscriptionId';

/** @param {ReadableStreamDefaultReader<Uint8Array>} reader */
async function next_message(reader) {
	const { value, done } = await reader.read();
	if (done || !value) throw new Error('Expected an SSE message');
	const text = new TextDecoder().decode(value);
	const data = text
		.split('\n')
		.find((line) => line.startsWith('data: '))
		?.slice(6);
	if (!data) throw new Error(`Missing SSE data in ${JSON.stringify(text)}`);
	return JSON.parse(data);
}

/**
 * @param {HttpTransport} transport
 * @param {unknown} body
 * @param {string} [origin]
 */
function post(transport, body, origin = 'subscription-client') {
	return transport.respond(
		new Request('http://localhost/mcp', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'mcp-session-id': origin,
			},
			body: JSON.stringify(body),
		}),
	);
}

function metadata() {
	return {
		[PROTOCOL_VERSION]: '2026-07-28',
		[CLIENT_CAPABILITIES]: {},
	};
}

describe('HTTP per-request subscriptions', () => {
	it('acknowledges, delivers changes, and gracefully completes one POST stream', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: { tools: { listChanged: true } },
			},
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 1,
			method: 'subscriptions/listen',
			params: {
				notifications: { toolsListChanged: true },
				_meta: metadata(),
			},
		});
		if (!response?.body) throw new Error('Expected a subscription stream');
		const reader = response.body.getReader();

		await expect(next_message(reader)).resolves.toMatchObject({
			method: 'notifications/subscriptions/acknowledged',
			params: { _meta: { [SUBSCRIPTION_ID]: 1 } },
		});
		server.changed('tools');
		await expect(next_message(reader)).resolves.toMatchObject({
			method: 'notifications/tools/list_changed',
			params: { _meta: { [SUBSCRIPTION_ID]: 1 } },
		});

		await expect(transport.closeSubscription(response)).resolves.toBe(true);
		await expect(next_message(reader)).resolves.toMatchObject({
			id: 1,
			result: {
				resultType: 'complete',
				_meta: { [SUBSCRIPTION_ID]: 1 },
			},
		});
		await expect(reader.read()).resolves.toMatchObject({ done: true });
	});

	it('waits for registration when gracefully closed immediately', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const manager = new InMemorySubscriptionManager();
		const create = manager.create.bind(manager);
		/** @type {(value?: void) => void} */
		let release_create = () => {};
		const create_ready = new Promise((resolve) => {
			release_create = resolve;
		});
		vi.spyOn(manager, 'create').mockImplementation(
			async (subscription, callbacks) => {
				await create_ready;
				return create(subscription, callbacks);
			},
		);
		const transport = new HttpTransport(server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 2,
			method: 'subscriptions/listen',
			params: { notifications: {}, _meta: metadata() },
		});
		if (!response?.body) throw new Error('Expected a subscription stream');
		const reader = response.body.getReader();

		const closing = transport.closeSubscription(response);
		release_create();
		await expect(closing).resolves.toBe(true);
		await expect(next_message(reader)).resolves.toMatchObject({
			method: 'notifications/subscriptions/acknowledged',
		});
		await expect(next_message(reader)).resolves.toMatchObject({
			id: 2,
			result: {
				resultType: 'complete',
				_meta: { [SUBSCRIPTION_ID]: 2 },
			},
		});
	});

	it('advertises configured subscription capabilities with the default manager', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: {
					tools: { listChanged: true },
					resources: { listChanged: true, subscribe: true },
				},
			},
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 2,
			method: 'server/discover',
			params: { _meta: metadata() },
		});
		if (!response?.body) throw new Error('Expected a response stream');

		await expect(
			next_message(response.body.getReader()),
		).resolves.toMatchObject({
			id: 2,
			result: {
				capabilities: {
					tools: { listChanged: true },
					resources: { listChanged: true, subscribe: true },
				},
			},
		});
	});

	it('cancels manager state when the response body disconnects', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const manager = new InMemorySubscriptionManager();
		const create = vi.spyOn(manager, 'create');
		const close = vi.spyOn(manager, 'close');
		const transport = new HttpTransport(server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 9,
			method: 'subscriptions/listen',
			params: { notifications: {}, _meta: metadata() },
		});
		if (!response?.body) throw new Error('Expected a subscription stream');
		const reader = response.body.getReader();
		await next_message(reader);
		const origin = create.mock.calls[0][0].origin;
		expect(origin).not.toBe('subscription-client');

		await reader.cancel();
		await vi.waitFor(() =>
			expect(close).toHaveBeenCalledWith(9, origin, 'cancelled'),
		);
		await expect(transport.closeSubscription(response)).resolves.toBe(
			false,
		);
	});

	it('isolates reused request IDs from caller-provided session headers', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{
				adapter: undefined,
				capabilities: { tools: { listChanged: true } },
			},
		);
		const manager = new InMemorySubscriptionManager();
		const create = vi.spyOn(manager, 'create');
		const transport = new HttpTransport(server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const request = {
			jsonrpc: '2.0',
			id: 11,
			method: 'subscriptions/listen',
			params: {
				notifications: { toolsListChanged: true },
				_meta: metadata(),
			},
		};
		const first = await post(transport, request, 'shared-client-value');
		const second = await post(transport, request, 'shared-client-value');
		if (!first?.body || !second?.body) {
			throw new Error('Expected both subscription streams');
		}
		const first_reader = first.body.getReader();
		const second_reader = second.body.getReader();
		await Promise.all([
			next_message(first_reader),
			next_message(second_reader),
		]);
		const [first_origin, second_origin] = create.mock.calls.map(
			([subscription]) => subscription.origin,
		);
		expect(first_origin).not.toBe('shared-client-value');
		expect(second_origin).not.toBe('shared-client-value');
		expect(first_origin).not.toBe(second_origin);

		server.changed('tools');
		await Promise.all([
			expect(next_message(first_reader)).resolves.toMatchObject({
				method: 'notifications/tools/list_changed',
			}),
			expect(next_message(second_reader)).resolves.toMatchObject({
				method: 'notifications/tools/list_changed',
			}),
		]);
		await expect(transport.closeSubscription(first)).resolves.toBe(true);
		await next_message(first_reader);
		server.changed('tools');
		await expect(next_message(second_reader)).resolves.toMatchObject({
			method: 'notifications/tools/list_changed',
		});
		await expect(transport.closeSubscription(second)).resolves.toBe(true);
		await next_message(second_reader);
	});

	it('rejects batches without reserving their listen IDs', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const batched = await post(transport, [
			{
				jsonrpc: '2.0',
				id: 14,
				method: 'subscriptions/listen',
				params: { notifications: {}, _meta: metadata() },
			},
			{
				jsonrpc: '2.0',
				method: 'notifications/cancelled',
				params: { requestId: 14, reason: 'same batch' },
			},
		]);
		expect(batched?.status).toBe(400);
		await expect(batched?.json()).resolves.toMatchObject({
			id: null,
			error: {
				code: -32600,
				data: 'JSON-RPC batch requests are not supported',
			},
		});

		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 14,
			method: 'subscriptions/listen',
			params: { notifications: {}, _meta: metadata() },
		});
		if (!response?.body) throw new Error('Expected a subscription stream');
		const reader = response.body.getReader();
		await expect(next_message(reader)).resolves.toMatchObject({
			method: 'notifications/subscriptions/acknowledged',
		});
		await transport.closeSubscription(response);
		await next_message(reader);
	});

	it('closes only locally owned streams when transports share a manager', async () => {
		const manager = new InMemorySubscriptionManager();
		const first_server = new McpServer(
			{ name: 'first-replica', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const second_server = new McpServer(
			{ name: 'second-replica', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const first = new HttpTransport(first_server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const second = new HttpTransport(second_server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const first_response = await post(
			first,
			{
				jsonrpc: '2.0',
				id: 15,
				method: 'subscriptions/listen',
				params: { notifications: {}, _meta: metadata() },
			},
			'first-client',
		);
		const second_response = await post(
			second,
			{
				jsonrpc: '2.0',
				id: 15,
				method: 'subscriptions/listen',
				params: { notifications: {}, _meta: metadata() },
			},
			'second-client',
		);
		if (!first_response?.body || !second_response?.body) {
			throw new Error('Expected both subscription streams');
		}
		const first_reader = first_response.body.getReader();
		const second_reader = second_response.body.getReader();
		await Promise.all([
			next_message(first_reader),
			next_message(second_reader),
		]);

		await first.close();
		await expect(first_reader.read()).resolves.toMatchObject({
			done: true,
		});
		await expect(second.closeSubscription(second_response)).resolves.toBe(
			true,
		);
		await next_message(second_reader);
	});

	it('accepts JSON-RPC responses without emitting an undefined SSE message', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await post(transport, {
			jsonrpc: '2.0',
			id: 99,
			result: {},
		});

		expect(response?.status).toBe(202);
		expect(response?.body).toBeNull();
	});

	it('reports valid JSON primitives as invalid requests', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await post(transport, /** @type {any} */ (null));

		expect(response?.status).toBe(400);
		await expect(response?.json()).resolves.toMatchObject({
			error: {
				code: -32600,
				data: 'Expected a JSON-RPC message object',
			},
		});
	});

	it('reports malformed JSON-RPC objects as invalid requests', async () => {
		const server = new McpServer(
			{ name: 'http-subscriptions', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const missing_method = await post(transport, {
			jsonrpc: '2.0',
			id: 16,
		});
		const invalid_version = await post(transport, {
			jsonrpc: '1.0',
			id: 17,
			method: 'ping',
		});

		/** @type {Array<[Response | null, number]>} */
		const invalid_requests = [
			[missing_method, 16],
			[invalid_version, 17],
		];
		for (const [response, id] of invalid_requests) {
			expect(response?.status).toBe(400);
			await expect(response?.json()).resolves.toMatchObject({
				id,
				error: { code: -32600 },
			});
		}
	});
});
