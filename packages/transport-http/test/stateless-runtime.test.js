import { InMemorySubscriptionManager } from '@tmcp/session-manager';
import { McpServer } from 'tmcp';
import { JsonSchemaAdapter } from 'tmcp/adapter';
import { describe, expect, it, vi } from 'vitest';
import { HttpTransport } from '../src/index.js';

const PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';

/**
 * @typedef {{ '~standard': { validate: (input: unknown) => Promise<{ value: unknown }>, vendor: 'test', version: 1 } }} HeaderSchema
 */

/** @augments {JsonSchemaAdapter<HeaderSchema>} */
class HeaderAdapter extends JsonSchemaAdapter {
	/** @returns {Promise<object>} */
	async toJsonSchema() {
		return {
			type: 'object',
			properties: {
				tenant: { type: 'string', 'x-mcp-header': 'Tenant' },
			},
		};
	}
}

function metadata() {
	return {
		[PROTOCOL_VERSION]: '2026-07-28',
		[CLIENT_CAPABILITIES]: {},
	};
}

/**
 * @param {Record<string, any>} body
 * @param {{ headers?: Record<string, string>, signal?: AbortSignal }} [options]
 */
function post_request(body, options = {}) {
	const headers = {
		'content-type': 'application/json',
		'MCP-Protocol-Version': '2026-07-28',
		'Mcp-Method': body.method,
		...(body.method === 'tools/call' || body.method === 'prompts/get'
			? { 'Mcp-Name': body.params?.name }
			: body.method === 'resources/read'
				? { 'Mcp-Name': body.params?.uri }
				: {}),
		...options.headers,
	};
	return new Request('http://localhost/mcp', {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
		signal: options.signal,
	});
}

/**
 * @param {string} method
 * @param {Record<string, unknown>} [params]
 */
function modern_message(method, params = {}) {
	return {
		jsonrpc: '2.0',
		id: 1,
		method,
		params: { ...params, _meta: metadata() },
	};
}

/** @param {Response} response */
async function event_messages(response) {
	return (await response.text())
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => JSON.parse(line.slice(6)));
}

describe('strict per-request HTTP runtime', () => {
	it('does not create, read, or return a session for modern requests', async () => {
		const get_session_id = vi.fn(() => 'created-session');
		const info = {
			getClientCapabilities: vi.fn(),
			getClientInfo: vi.fn(),
			getLogLevel: vi.fn(),
			getSubscriptions: vi.fn(),
			setClientCapabilities: vi.fn(),
			setClientInfo: vi.fn(),
			setLogLevel: vi.fn(),
			addSubscription: vi.fn(),
			delete: vi.fn(),
		};
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: {} },
		);
		const transport = new HttpTransport(server, {
			path: '/mcp',
			getSessionId: get_session_id,
			sessionManager: { info },
		});
		const response = await transport.respond(
			post_request(modern_message('server/discover'), {
				headers: { 'Mcp-Session-Id': 'stale-session' },
			}),
		);

		expect(response?.status).toBe(200);
		expect(response?.headers.has('mcp-session-id')).toBe(false);
		expect(get_session_id).not.toHaveBeenCalled();
		expect(info.getClientCapabilities).not.toHaveBeenCalled();
		expect(info.getClientInfo).not.toHaveBeenCalled();
		expect(info.getLogLevel).not.toHaveBeenCalled();
		await response?.text();
	});

	it('does not downgrade incomplete modern metadata to a legacy session', async () => {
		const get_session_id = vi.fn(() => 'created-session');
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		const transport = new HttpTransport(server, {
			path: '/mcp',
			getSessionId: get_session_id,
		});
		const response = await transport.respond(
			new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'Mcp-Method': 'tools/list',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/list',
					params: { _meta: { [CLIENT_CAPABILITIES]: {} } },
				}),
			}),
		);

		expect(response?.status).toBe(400);
		await expect(response?.json()).resolves.toMatchObject({
			error: { code: -32020 },
		});
		expect(response?.headers.has('mcp-session-id')).toBe(false);
		expect(get_session_id).not.toHaveBeenCalled();
	});

	it.each(['GET', 'DELETE'])(
		'returns 405 for modern %s without creating a session',
		async (method) => {
			const get_session_id = vi.fn(() => 'created-session');
			const server = new McpServer(
				{ name: 'strict-http', version: '1.0.0' },
				{ adapter: undefined },
			);
			const transport = new HttpTransport(server, {
				path: '/mcp',
				getSessionId: get_session_id,
			});
			const response = await transport.respond(
				new Request('http://localhost/mcp', {
					method,
					headers: { 'MCP-Protocol-Version': '2026-07-28' },
				}),
			);

			expect(response?.status).toBe(405);
			expect(response?.headers.get('allow')).toBe('POST, OPTIONS');
			expect(get_session_id).not.toHaveBeenCalled();
		},
	);

	it('isolates concurrent legacy and modern calls on the same transport', async () => {
		const get_session_id = vi.fn(() => 'legacy-session');
		const both_started = Promise.withResolvers();
		const release = Promise.withResolvers();
		/** @type {Array<{ session_id: string | undefined, protocol_version: string | undefined }>} */
		const contexts = [];
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool({ name: 'probe', description: 'probe' }, async () => {
			contexts.push({
				session_id: server.ctx.sessionId,
				protocol_version: server.ctx.protocolVersion,
			});
			if (contexts.length === 2) both_started.resolve(undefined);
			await release.promise;
			return { content: [] };
		});
		const transport = new HttpTransport(server, {
			path: '/mcp',
			getSessionId: get_session_id,
		});
		const [legacy, modern] = await Promise.all([
			transport.respond(
				new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: { name: 'probe' },
					}),
				}),
			),
			transport.respond(
				post_request(modern_message('tools/call', { name: 'probe' }), {
					headers: { 'Mcp-Session-Id': 'legacy-session' },
				}),
			),
		]);
		await both_started.promise;

		expect(legacy?.headers.get('mcp-session-id')).toBe('legacy-session');
		expect(modern?.headers.has('mcp-session-id')).toBe(false);
		expect(get_session_id).toHaveBeenCalledOnce();
		expect(contexts).toEqual(
			expect.arrayContaining([
				{ session_id: 'legacy-session', protocol_version: undefined },
				{ session_id: undefined, protocol_version: '2026-07-28' },
			]),
		);
		release.resolve(undefined);
		await Promise.all([legacy?.text(), modern?.text()]);
	});

	it('accepts modern notifications with HTTP 202 after header validation', async () => {
		const manager = new InMemorySubscriptionManager();
		const close = vi.spyOn(manager, 'close');
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, {
			path: '/mcp',
			subscriptionManager: manager,
		});
		const notification = {
			jsonrpc: '2.0',
			method: 'notifications/cancelled',
			params: { requestId: 12, _meta: metadata() },
		};
		const response = await transport.respond(post_request(notification));

		expect(response?.status).toBe(202);
		expect(response?.body).toBeNull();
		expect(response?.headers.has('mcp-session-id')).toBe(false);
		await vi.waitFor(() =>
			expect(close).toHaveBeenCalledWith(
				12,
				expect.any(String),
				'cancelled',
			),
		);
	});

	it('rejects a modern notification with missing mirrored headers', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await transport.respond(
			new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'MCP-Protocol-Version': '2026-07-28',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'notifications/cancelled',
					params: { requestId: 12, _meta: metadata() },
				}),
			}),
		);

		expect(response?.status).toBe(400);
		await expect(response?.json()).resolves.toMatchObject({
			id: null,
			error: { code: -32020 },
		});
	});

	it.each([
		['unsupported content type', 'text/plain', '{}', 415],
		['malformed JSON', 'application/json', '{', 400],
	])(
		'does not mint a session for modern %s errors',
		async (_name, content_type, body, status) => {
			const get_session_id = vi.fn(() => 'created-session');
			const server = new McpServer(
				{ name: 'strict-http', version: '1.0.0' },
				{ adapter: undefined },
			);
			const transport = new HttpTransport(server, {
				path: '/mcp',
				getSessionId: get_session_id,
			});
			const response = await transport.respond(
				new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': content_type,
						'MCP-Protocol-Version': '2026-07-28',
					},
					body,
				}),
			);

			expect(response?.status).toBe(status);
			expect(response?.headers.has('mcp-session-id')).toBe(false);
			expect(get_session_id).not.toHaveBeenCalled();
		},
	);

	it('returns unsupported versions as HTTP 400 before opening SSE', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const body = modern_message('tools/list');
		body.params._meta[PROTOCOL_VERSION] = '2027-01-01';
		const response = await transport.respond(
			post_request(body, {
				headers: { 'MCP-Protocol-Version': '2027-01-01' },
			}),
		);

		expect(response?.status).toBe(400);
		expect(response?.headers.get('content-type')).toBe('application/json');
		await expect(response?.json()).resolves.toMatchObject({
			id: 1,
			error: {
				code: -32022,
				data: { requested: '2027-01-01', supported: ['2026-07-28'] },
			},
		});
	});

	it('returns unknown or disallowed methods as HTTP 404', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		for (const method of ['example/missing', 'ping']) {
			const response = await transport.respond(
				post_request(modern_message(method)),
			);
			expect(response?.status).toBe(404);
			await expect(response?.json()).resolves.toMatchObject({
				error: { code: -32601 },
			});
		}
	});

	it('rejects JSON-RPC responses on the modern path', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined },
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await transport.respond(
			post_request(
				{ jsonrpc: '2.0', id: 1, result: {} },
				{ headers: { 'Mcp-Method': 'server/discover' } },
			),
		);

		expect(response?.status).toBe(400);
		await expect(response?.json()).resolves.toMatchObject({
			id: 1,
			error: { code: -32600 },
		});
	});

	it('keeps logs before the final result and disables proxy buffering', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {}, logging: {} } },
		);
		server.tool({ name: 'logger', description: 'logger' }, () => {
			server.log('info', 'before result');
			return { content: [] };
		});
		const transport = new HttpTransport(server, { path: '/mcp' });
		const request = modern_message('tools/call', { name: 'logger' });
		/** @type {Record<string, unknown>} */ (request.params._meta)[
			'io.modelcontextprotocol/logLevel'
		] = 'info';
		const response = await transport.respond(post_request(request));

		expect(response?.headers.get('x-accel-buffering')).toBe('no');
		const messages = await event_messages(
			/** @type {Response} */ (response),
		);
		expect(messages.map((message) => message.method ?? 'response')).toEqual(
			['notifications/message', 'response'],
		);
	});

	it('sends progress before the final result on the request SSE stream', async () => {
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool({ name: 'worker', description: 'worker' }, () => {
			server.progress(1, 2, 'Halfway');
			return { content: [] };
		});
		const transport = new HttpTransport(server, { path: '/mcp' });
		const request = modern_message('tools/call', { name: 'worker' });
		/** @type {Record<string, unknown>} */ (
			request.params._meta
		).progressToken = 'progress-1';
		const response = await transport.respond(post_request(request));
		const messages = await event_messages(
			/** @type {Response} */ (response),
		);

		expect(messages).toHaveLength(2);
		expect(messages[0]).toMatchObject({
			method: 'notifications/progress',
			params: {
				progress: 1,
				total: 2,
				message: 'Halfway',
				progressToken: 'progress-1',
			},
		});
		expect(messages[1]).toMatchObject({ id: 1, result: {} });
	});

	it('validates annotated tool parameter headers before running the handler', async () => {
		const execute = vi.fn(() => ({ content: [] }));
		const server = /** @type {McpServer<HeaderSchema, undefined>} */ (
			new McpServer(
				{ name: 'strict-http', version: '1.0.0' },
				{
					adapter: /** @type {any} */ (new HeaderAdapter()),
					capabilities: { tools: {} },
				},
			)
		);
		server.tool(
			/** @type {any} */ ({
				name: 'tenant-tool',
				description: 'tenant tool',
				schema: {
					'~standard': {
						validate: async (/** @type {unknown} */ input) => ({
							value: input,
						}),
						vendor: /** @type {const} */ ('test'),
						version: /** @type {const} */ (1),
					},
				},
			}),
			execute,
		);
		const transport = new HttpTransport(server, { path: '/mcp' });
		/** @param {Record<string, string>} headers */
		const call = (headers) =>
			transport.respond(
				post_request(
					modern_message('tools/call', {
						name: 'tenant-tool',
						arguments: { tenant: 'acme' },
					}),
					{ headers },
				),
			);
		const valid = await call({
			'Mcp-Param-Tenant': 'acme',
		});
		expect(valid?.status).toBe(200);
		await valid?.text();
		expect(execute).toHaveBeenCalledOnce();

		const invalid = await call({
			'Mcp-Param-Tenant': 'other',
		});
		expect(invalid?.status).toBe(400);
		await expect(invalid?.json()).resolves.toMatchObject({
			error: { code: -32020 },
		});
		expect(execute).toHaveBeenCalledOnce();
	});

	it('does not dispatch a request that was already cancelled', async () => {
		const execute = vi.fn(() => ({ content: [] }));
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool({ name: 'cancelled', description: 'cancelled' }, execute);
		const transport = new HttpTransport(server, { path: '/mcp' });
		const controller = new AbortController();
		controller.abort();
		const response = await transport.respond(
			post_request(modern_message('tools/call', { name: 'cancelled' }), {
				signal: controller.signal,
			}),
		);

		expect(response?.status).toBe(200);
		await expect(response?.text()).resolves.toBe('');
		expect(execute).not.toHaveBeenCalled();
	});

	it('exposes incoming request cancellation and stops response output', async () => {
		const started = Promise.withResolvers();
		const release = Promise.withResolvers();
		/** @type {AbortSignal | undefined} */
		let signal;
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool({ name: 'slow', description: 'slow' }, async () => {
			signal = server.ctx.signal;
			started.resolve(undefined);
			await release.promise;
			return { content: [] };
		});
		const transport = new HttpTransport(server, { path: '/mcp' });
		const controller = new AbortController();
		const response = await transport.respond(
			post_request(modern_message('tools/call', { name: 'slow' }), {
				signal: controller.signal,
			}),
		);
		await started.promise;
		controller.abort();

		expect(signal?.aborted).toBe(true);
		await expect(response?.text()).resolves.toBe('');
		release.resolve(undefined);
	});

	it('aborts handler context when the SSE response is cancelled', async () => {
		const started = Promise.withResolvers();
		const release = Promise.withResolvers();
		/** @type {AbortSignal | undefined} */
		let signal;
		const server = new McpServer(
			{ name: 'strict-http', version: '1.0.0' },
			{ adapter: undefined, capabilities: { tools: {} } },
		);
		server.tool({ name: 'slow', description: 'slow' }, async () => {
			signal = server.ctx.signal;
			started.resolve(undefined);
			await release.promise;
			return { content: [] };
		});
		const transport = new HttpTransport(server, { path: '/mcp' });
		const response = await transport.respond(
			post_request(modern_message('tools/call', { name: 'slow' })),
		);
		await started.promise;
		await response?.body?.cancel();

		expect(signal?.aborted).toBe(true);
		release.resolve(undefined);
	});
});
