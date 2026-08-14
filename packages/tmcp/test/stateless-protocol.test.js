/**
 * Tests for the per-request (stateless, 2026-07-28) protocol support:
 * classification, method policy, server/discover, result decoration,
 * error model and schema loosening.
 */
import { describe, expect, it, vi } from 'vitest';
import { JsonSchemaAdapter } from '../src/adapter.js';
import {
	McpServer,
	HEADER_MISMATCH,
	MISSING_REQUIRED_CLIENT_CAPABILITY,
	UNSUPPORTED_PROTOCOL_VERSION,
	McpError,
	getPerRequestProtocolVersions,
} from '../src/index.js';
import { isPerRequestMethodAllowed } from '../src/method-policy.js';
import { is_method_allowed } from '../src/validation/method-policy.js';

const MODERN = '2026-07-28';
const PV = 'io.modelcontextprotocol/protocolVersion';
const CC = 'io.modelcontextprotocol/clientCapabilities';
const CI = 'io.modelcontextprotocol/clientInfo';
const SI = 'io.modelcontextprotocol/serverInfo';

/**
 * @template T
 * @typedef {{ '~standard': { validate: (input: unknown) => Promise<{ value: T }>, vendor: 'mock', version: 1, types?: { input: T, output: T } }}} MockSchema
 */

/**
 * Mock adapter for testing
 * @augments {JsonSchemaAdapter<MockSchema<any>>}
 */
class MockAdapter extends JsonSchemaAdapter {
	/**
	 * @returns {Promise<object>}
	 */
	async toJsonSchema() {
		return {
			type: 'object',
			properties: { test: { type: 'string' } },
			required: ['test'],
			'x-mcp-header': { name: 'X-Test' },
			$defs: { foo: { type: 'string' } },
		};
	}
}

const adapter = new MockAdapter();

const server_info = {
	name: 'test-server',
	version: '1.0.0',
};

/**
 * @param {Partial<import('../src/internal/internal.js').ServerOptions<MockSchema<any>>>} [options]
 * @returns {McpServer<MockSchema<any>, any>}
 */
function create_server(options = {}) {
	return new McpServer(server_info, {
		adapter,
		capabilities: {
			tools: { listChanged: true },
			prompts: { listChanged: true },
			resources: { subscribe: true, listChanged: true },
			logging: {},
		},
		...options,
	});
}

/**
 * Build a stateless request with valid per-request `_meta`.
 * @param {string} method
 * @param {Record<string, unknown>} [params]
 * @param {Record<string, unknown>} [meta_overrides]
 */
function stateless_request(method, params = {}, meta_overrides = {}) {
	return {
		jsonrpc: /** @type {const} */ ('2.0'),
		id: 1,
		method,
		params: {
			...params,
			_meta: {
				[PV]: MODERN,
				[CC]: {},
				...meta_overrides,
			},
		},
	};
}

describe('stateless protocol (2026-07-28)', () => {
	describe('classification', () => {
		it('rejects a request with protocolVersion but no clientCapabilities with -32602', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/list',
				params: { _meta: { [PV]: MODERN } },
			});
			expect(response.error.code).toBe(-32602);
		});

		it('rejects a request with clientCapabilities but no protocolVersion with -32602', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/list',
				params: { _meta: { [CC]: {} } },
			});
			expect(response.error.code).toBe(-32602);
		});

		it.each([
			['clientInfo', { [CI]: { name: 'c', version: '1' } }],
			['logLevel', { 'io.modelcontextprotocol/logLevel': 'info' }],
		])(
			'rejects a request with only %s reserved metadata with -32602 (never falls back to the session path)',
			async (_key, meta) => {
				const server = create_server();
				const response = await server.receive({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/list',
					params: { _meta: meta },
				});
				expect(response.error.code).toBe(-32602);
			},
		);

		it('rejects invalid clientCapabilities with -32602', async () => {
			const server = create_server();
			for (const invalid of [
				['not', 'an', 'object'],
				{ roots: { listChanged: 'yes' } },
			]) {
				const response = await server.receive(
					stateless_request('tools/list', {}, { [CC]: invalid }),
				);
				expect(response.error.code).toBe(-32602);
				expect(response.error.message).toContain('clientCapabilities');
			}
		});

		it('rejects invalid clientInfo with -32602', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request(
					'tools/list',
					{},
					{ [CI]: { name: 'no-version' } },
				),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('clientInfo');
		});

		it('rejects invalid logLevel with -32602', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request(
					'tools/list',
					{},
					{ 'io.modelcontextprotocol/logLevel': 'verbose' },
				),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('logLevel');
		});

		it('rejects an unsupported per-request version with -32022 and supported/requested data', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('tools/list', {}, { [PV]: '2025-11-25' }),
			);
			expect(response.error.code).toBe(UNSUPPORTED_PROTOCOL_VERSION);
			expect(response.error.data).toEqual({
				supported: [MODERN],
				requested: '2025-11-25',
			});
		});

		it('advertises only the known per-request versions through server/discover', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('server/discover'),
			);
			expect(response.result.supportedVersions).toEqual([MODERN]);
		});

		it('accepts a valid stateless request', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('tools/list'),
			);
			expect(response.result.tools).toEqual([]);
		});
	});

	describe('method policy', () => {
		it('reports every registered method without applying request policy', () => {
			const server = create_server();
			expect(server.hasMethod('tools/list')).toBe(true);
			expect(server.hasMethod('server/discover')).toBe(true);
			expect(server.hasMethod('ping')).toBe(true);
			expect(server.hasMethod('missing/method')).toBe(false);
		});

		it('keeps progress notifications on session-negotiated connections', () => {
			expect(is_method_allowed('notifications/progress', false)).toBe(
				true,
			);
			expect(is_method_allowed('notifications/progress', true)).toBe(
				false,
			);
		});

		it('exposes per-request method policy independently from registration', () => {
			expect(isPerRequestMethodAllowed('tools/list')).toBe(true);
			expect(isPerRequestMethodAllowed('server/discover')).toBe(true);
			expect(isPerRequestMethodAllowed('ping')).toBe(false);
		});

		it.each([
			[
				'initialize',
				{
					protocolVersion: MODERN,
					capabilities: {},
					clientInfo: { name: 'c', version: '1' },
				},
			],
			['ping', {}],
			['logging/setLevel', { level: 'info' }],
			['resources/subscribe', { uri: 'test://a' }],
			['resources/unsubscribe', { uri: 'test://a' }],
		])(
			'rejects %s for stateless requests with -32601',
			async (method, params) => {
				const server = create_server();
				const response = await server.receive(
					stateless_request(method, params),
				);
				expect(response.error.code).toBe(-32601);
			},
		);

		it('rejects server/discover for session-negotiated requests with -32601', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'server/discover',
			});
			expect(response.error.code).toBe(-32601);
		});
	});

	describe('server/discover', () => {
		it('emits a discover event with the request params', async () => {
			const server = create_server();
			const listener = vi.fn();
			server.on('discover', (discover_request) => {
				expect(discover_request._meta[PV]).toBe(MODERN);
				expect(discover_request._meta[CC]).toEqual({});
				listener(discover_request);
			});
			const discovery_request = stateless_request('server/discover');

			await server.receive(discovery_request);

			expect(listener).toHaveBeenCalledOnce();
			expect(listener).toHaveBeenCalledWith(discovery_request.params);
		});

		it('returns the DiscoverResult shape', async () => {
			const server = create_server({
				instructions: 'use it wisely',
				cache: { ttlMs: 60000, cacheScope: 'public' },
			});
			const response = await server.receive(
				stateless_request('server/discover'),
			);
			expect(response.result).toEqual({
				resultType: 'complete',
				supportedVersions: [MODERN],
				capabilities: {
					tools: {},
					prompts: {},
					resources: {},
					logging: {},
				},
				instructions: 'use it wisely',
				ttlMs: 60000,
				cacheScope: 'public',
				_meta: {
					[SI]: server_info,
				},
			});
		});

		it('strips subscription capabilities while keeping request-scoped logging', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('server/discover'),
			);
			expect(response.result.capabilities).toEqual({
				tools: {},
				prompts: {},
				resources: {},
				logging: {},
			});
			expect(response.result.serverInfo).toBeUndefined();
			expect(response.result.protocolVersions).toBeUndefined();
		});
	});

	describe('per-request logging', () => {
		it('uses only an explicit request logLevel and does not carry it across requests', async () => {
			const server = create_server({
				logging: { default: 'debug' },
			});
			server.tool(
				{ name: 'logger', description: 'logs messages' },
				() => {
					server.log('debug', 'debug message');
					server.log('error', 'error message');
					return { content: [{ type: 'text', text: 'logged' }] };
				},
			);
			const on_send = vi.fn();
			const off = server.on('send', on_send);

			await server.receive(
				stateless_request('tools/call', { name: 'logger' }),
				{ sessionInfo: { logLevel: 'debug' } },
			);
			expect(on_send).not.toHaveBeenCalled();

			await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'logger' },
					{ 'io.modelcontextprotocol/logLevel': 'warning' },
				),
			);
			expect(on_send).toHaveBeenCalledTimes(1);
			expect(on_send).toHaveBeenCalledWith({
				request: {
					jsonrpc: '2.0',
					method: 'notifications/message',
					params: { level: 'error', data: 'error message' },
				},
			});

			await server.receive(
				stateless_request('tools/call', { name: 'logger' }),
			);
			expect(on_send).toHaveBeenCalledTimes(1);
			off();
		});

		it('prefers the explicit request logLevel over a stricter transport session level', async () => {
			const server = create_server();
			server.tool(
				{ name: 'logger', description: 'logs messages' },
				() => {
					server.log('debug', 'debug message');
					return { content: [] };
				},
			);
			const on_send = vi.fn();
			const off = server.on('send', on_send);

			await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'logger' },
					{ 'io.modelcontextprotocol/logLevel': 'debug' },
				),
				{ sessionInfo: { logLevel: 'emergency' } },
			);

			expect(on_send).toHaveBeenCalledTimes(1);
			expect(on_send).toHaveBeenCalledWith({
				request: {
					jsonrpc: '2.0',
					method: 'notifications/message',
					params: { level: 'debug', data: 'debug message' },
				},
			});
			off();
		});

		it('keeps the session-negotiated default after a stateless request uses a different level', async () => {
			const server = create_server({
				logging: { default: 'debug' },
			});
			server.tool(
				{ name: 'logger', description: 'logs messages' },
				() => {
					server.log('debug', 'debug message');
					return { content: [] };
				},
			);
			const on_send = vi.fn();
			const off = server.on('send', on_send);

			await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'logger' },
					{ 'io.modelcontextprotocol/logLevel': 'error' },
				),
			);
			expect(on_send).not.toHaveBeenCalled();

			await server.receive({
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/call',
				params: { name: 'logger' },
			});
			expect(on_send).toHaveBeenCalledTimes(1);
			expect(on_send).toHaveBeenCalledWith({
				request: {
					jsonrpc: '2.0',
					method: 'notifications/message',
					params: { level: 'debug', data: 'debug message' },
				},
			});
			off();
		});
	});

	describe('result decoration', () => {
		it('adds resultType, serverInfo _meta and cache fields to cacheable methods (even empty results)', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('tools/list'),
			);
			expect(response.result.resultType).toBe('complete');
			expect(response.result.ttlMs).toBe(0);
			expect(response.result.cacheScope).toBe('private');
			expect(response.result._meta[SI]).toEqual(server_info);
		});

		it('supports per-method cache overrides', async () => {
			const server = create_server({
				cache: {
					ttlMs: 1000,
					methods: {
						'tools/list': { ttlMs: 5000, cacheScope: 'public' },
					},
				},
			});
			const tools = await server.receive(stateless_request('tools/list'));
			expect(tools.result.ttlMs).toBe(5000);
			expect(tools.result.cacheScope).toBe('public');
			const prompts = await server.receive(
				stateless_request('prompts/list'),
			);
			expect(prompts.result.ttlMs).toBe(1000);
			expect(prompts.result.cacheScope).toBe('private');
		});

		it('does not add cache fields to non-cacheable methods', async () => {
			const server = create_server();
			server.tool({ name: 'simple', description: 'a tool' }, () => ({
				content: [{ type: 'text', text: 'hi' }],
			}));
			const response = await server.receive(
				stateless_request('tools/call', { name: 'simple' }),
			);
			expect(response.result.resultType).toBe('complete');
			expect(response.result.ttlMs).toBeUndefined();
			expect(response.result.cacheScope).toBeUndefined();
		});

		it('preserves handler-provided resultType and application _meta keys', async () => {
			const server = create_server();
			server.tool({ name: 'custom', description: 'a tool' }, () => ({
				content: [{ type: 'text', text: 'hi' }],
				resultType: 'com.example/partial',
				_meta: { 'com.example/trace': 'abc' },
			}));
			const response = await server.receive(
				stateless_request('tools/call', { name: 'custom' }),
			);
			expect(response.result.resultType).toBe('com.example/partial');
			expect(response.result._meta).toEqual({
				'com.example/trace': 'abc',
				[SI]: server_info,
			});
		});

		it('overwrites a non-string handler-provided resultType with "complete"', async () => {
			const server = create_server();
			server.tool({ name: 'weird', description: 'a tool' }, () => ({
				content: [{ type: 'text', text: 'hi' }],
				resultType: /** @type {any} */ (42),
			}));
			const response = await server.receive(
				stateless_request('tools/call', { name: 'weird' }),
			);
			expect(response.result.resultType).toBe('complete');
		});

		it('always overwrites handler-provided cache fields with the configured policy', async () => {
			const server = create_server({
				cache: { ttlMs: 1000, cacheScope: 'private' },
			});
			server.resource(
				{
					name: 'sneaky',
					description: 'x',
					uri: 'test://sneaky',
				},
				() =>
					/** @type {any} */ ({
						contents: [{ uri: 'test://sneaky', text: 'hi' }],
						ttlMs: 999999,
						cacheScope: 'public',
					}),
			);
			const response = await server.receive(
				stateless_request('resources/read', { uri: 'test://sneaky' }),
			);
			expect(response.result.ttlMs).toBe(1000);
			expect(response.result.cacheScope).toBe('private');
		});

		it('decorates a null handler result into an object result', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('completion/complete', {
					ref: { type: 'ref/prompt', name: 'unknown' },
					argument: { name: 'a', value: 'b' },
				}),
			);
			expect(response.result).toBeTypeOf('object');
			expect(response.result.resultType).toBe('complete');
			expect(response.result._meta[SI]).toEqual(server_info);
		});

		it('does not decorate legacy responses', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/list',
			});
			expect(response.result.resultType).toBeUndefined();
			expect(response.result.ttlMs).toBeUndefined();
			expect(response.result._meta).toBeUndefined();
		});

		it('does not decorate error responses', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('prompts/get', { name: 'nope' }),
			);
			expect(response.error).toBeDefined();
			expect(response.error.code).toBe(-32602);
			expect(response.result).toBeUndefined();
		});
	});

	describe('session isolation', () => {
		it('exposes a transport cancellation signal through ctx', async () => {
			const server = create_server();
			const controller = new AbortController();
			/** @type {AbortSignal | undefined} */
			let seen;
			server.tool({ name: 'signal', description: 'signal' }, () => {
				seen = server.ctx.signal;
				return { content: [] };
			});
			await server.receive(
				stateless_request('tools/call', { name: 'signal' }),
				{ signal: controller.signal },
			);
			expect(seen).toBe(controller.signal);
		});

		it('does not leak legacy session capabilities into stateless requests', async () => {
			const server = create_server();
			server.tool({ name: 'probe', description: 'probe' }, () => ({
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							server.ctx.sessionInfo?.clientCapabilities ?? null,
						),
					},
				],
			}));

			// legacy session with elicitation capability provided by transport
			const legacy_session_info = {
				clientCapabilities: { elicitation: {}, sampling: {} },
				clientInfo: { name: 'legacy-client', version: '1.0.0' },
			};

			// a stateless request through the same server (with a stale
			// transport-provided sessionInfo) must only see its own _meta
			const response = await server.receive(
				stateless_request('tools/call', { name: 'probe' }),
				{
					sessionId: 'stale-session',
					sessionInfo: legacy_session_info,
				},
			);
			const seen = JSON.parse(response.result.content[0].text);
			expect(seen).toEqual({});
		});

		it('exposes ctx.protocolVersion and per-request clientInfo', async () => {
			const server = create_server();
			/** @type {any} */
			let seen;
			server.tool({ name: 'probe', description: 'probe' }, () => {
				seen = {
					protocolVersion: server.ctx.protocolVersion,
					clientInfo: server.ctx.sessionInfo?.clientInfo,
				};
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'probe' },
					{ [CI]: { name: 'modern-client', version: '2.0.0' } },
				),
			);
			expect(seen).toEqual({
				protocolVersion: MODERN,
				clientInfo: { name: 'modern-client', version: '2.0.0' },
			});
		});
	});

	describe('error model', () => {
		it('preserves McpError code and data on the wire', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'prompts/get',
				params: { name: 'missing' },
			});
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('not found');
		});

		it('returns -32602 for unknown resources in both profiles', async () => {
			const server = create_server();
			const legacy = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'resources/read',
				params: { uri: 'test://missing' },
			});
			expect(legacy.error.code).toBe(-32602);
			const stateless = await server.receive(
				stateless_request('resources/read', { uri: 'test://missing' }),
			);
			expect(stateless.error.code).toBe(-32602);
		});

		it('exports the modern error code constants', () => {
			expect(HEADER_MISMATCH).toBe(-32020);
			expect(MISSING_REQUIRED_CLIENT_CAPABILITY).toBe(-32021);
			expect(UNSUPPORTED_PROTOCOL_VERSION).toBe(-32022);
			const error = new McpError(-32020, 'nope', { some: 'data' });
			expect(error.code).toBe(-32020);
			expect(error.data).toEqual({ some: 'data' });
		});

		it('McpError instances pass instanceof checks', () => {
			expect(new McpError(-32602, 'nope') instanceof McpError).toBe(true);
		});

		it('returns -32602 for a malformed protocolVersion format on initialize', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: 'not-a-version',
					capabilities: {},
					clientInfo: { name: 'c', version: '1' },
				},
			});
			expect(response.error.code).toBe(-32602);
		});

		it('throws -32603 from the low-level request() method on a stateless request', async () => {
			const server = create_server();
			/** @type {any} */
			let caught;
			server.tool({ name: 'requester', description: 'x' }, async () => {
				try {
					await server.request({ method: 'roots/list' });
				} catch (error) {
					caught = error;
				}
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			await server.receive(
				stateless_request('tools/call', { name: 'requester' }),
			);
			expect(caught).toBeInstanceOf(McpError);
			expect(caught.code).toBe(-32603);
			expect(caught.message).toContain(
				'not supported for per-request protocol requests',
			);
		});

		it('raises -32021 with requiredCapabilities when elicitation capability is missing on a stateless request', async () => {
			const server = create_server();
			/** @type {any} */
			let caught;
			server.tool({ name: 'elicitor', description: 'x' }, async () => {
				try {
					await server.elicitation('gimme', {
						'~standard': {
							validate: vi.fn(),
							vendor: 'mock',
							version: 1,
						},
					});
				} catch (error) {
					caught = error;
				}
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			await server.receive(
				stateless_request('tools/call', { name: 'elicitor' }),
			);
			expect(caught.code).toBe(MISSING_REQUIRED_CLIENT_CAPABILITY);
			expect(caught.data).toEqual({
				requiredCapabilities: { elicitation: { form: {} } },
			});
		});

		it('raises -32021 for sampling and -32603 when the capability is declared on a stateless request', async () => {
			const server = create_server();
			/** @type {any[]} */
			const caught = [];
			server.tool({ name: 'sampler', description: 'x' }, async () => {
				try {
					await server.message({
						messages: [],
						maxTokens: 10,
					});
				} catch (error) {
					caught.push(error);
				}
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			await server.receive(
				stateless_request('tools/call', { name: 'sampler' }),
			);
			expect(caught[0].code).toBe(MISSING_REQUIRED_CLIENT_CAPABILITY);
			expect(caught[0].data).toEqual({
				requiredCapabilities: { sampling: {} },
			});

			await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'sampler' },
					{ [CC]: { sampling: {} } },
				),
			);
			expect(caught[1].code).toBe(-32603);
		});

		it('keeps -32601 for missing capabilities on legacy requests', async () => {
			const server = create_server();
			/** @type {any} */
			let caught;
			server.tool({ name: 'elicitor', description: 'x' }, async () => {
				try {
					await server.elicitation('gimme', {
						'~standard': {
							validate: vi.fn(),
							vendor: 'mock',
							version: 1,
						},
					});
				} catch (error) {
					caught = error;
				}
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			await server.receive(
				{
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'elicitor' },
				},
				{ sessionInfo: { clientCapabilities: {} } },
			);
			expect(caught.code).toBe(-32601);
		});
	});

	describe('schema loosening', () => {
		it('validates a tool call against its converted JSON Schema without executing it', async () => {
			const server = create_server();
			const validate = vi.fn(async () => {});
			const execute = vi.fn(() => ({ content: [] }));
			const enabled = vi.fn(() => true);
			/** @type {MockSchema<{ test: string }>} */
			const schema = {
				'~standard': {
					validate: vi.fn(async (input) => ({ value: input })),
					vendor: 'mock',
					version: 1,
				},
			};
			server.tool(
				{
					name: 'validated',
					description: 'validated',
					schema,
					enabled,
				},
				execute,
			);

			await expect(
				server.validateToolCall(
					'validated',
					{ test: 'value' },
					validate,
				),
			).resolves.toBe(true);
			expect(validate).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'object',
					properties: { test: { type: 'string' } },
				}),
				{ test: 'value' },
			);
			expect(schema['~standard'].validate).not.toHaveBeenCalled();
			expect(enabled).not.toHaveBeenCalled();
			expect(execute).not.toHaveBeenCalled();
		});

		it('awaits validators, propagates errors, and skips unknown tools', async () => {
			const server = create_server();
			server.tool(
				{ name: 'schema-less', description: 'schema-less' },
				() => ({
					content: [],
				}),
			);
			const gate = Promise.withResolvers();
			const pending = server.validateToolCall(
				'schema-less',
				{},
				async (schema) => {
					expect(schema).toEqual({ type: 'object', properties: {} });
					await gate.promise;
				},
			);
			let settled = false;
			void pending.then(() => {
				settled = true;
			});
			await Promise.resolve();
			expect(settled).toBe(false);
			gate.resolve(undefined);
			await expect(pending).resolves.toBe(true);

			const validator = vi.fn();
			await expect(
				server.validateToolCall('missing', {}, validator),
			).resolves.toBe(false);
			expect(validator).not.toHaveBeenCalled();

			const failure = new Error('validator failed');
			await expect(
				server.validateToolCall('schema-less', {}, () => {
					throw failure;
				}),
			).rejects.toBe(failure);
		});

		it('propagates tool schema adapter errors', async () => {
			const server = create_server();
			/** @type {MockSchema<{ test: string }>} */
			const schema = {
				'~standard': {
					validate: vi.fn(async (input) => ({ value: input })),
					vendor: 'mock',
					version: 1,
				},
			};
			server.tool(
				{ name: 'adapter-error', description: 'adapter error', schema },
				() => ({ content: [] }),
			);
			const failure = new Error('adapter failed');
			vi.spyOn(adapter, 'toJsonSchema').mockRejectedValueOnce(failure);

			await expect(
				server.validateToolCall('adapter-error', {}, vi.fn()),
			).rejects.toBe(failure);
		});

		it('accepts non-object structuredContent', async () => {
			const server = create_server();
			server.tool({ name: 'scalar', description: 'x' }, () => ({
				content: [],
				structuredContent: /** @type {any} */ (42),
			}));
			const response = await server.receive(
				stateless_request('tools/call', { name: 'scalar' }),
			);
			expect(response.result.structuredContent).toBe(42);
		});

		it('passes adapter output through, keeping unknown JSON Schema keywords', async () => {
			const server = create_server();
			/** @type {MockSchema<{ test: string }>} */
			const schema = {
				'~standard': {
					validate: vi
						.fn()
						.mockImplementation((input) =>
							Promise.resolve({ value: input }),
						),
					vendor: 'mock',
					version: 1,
				},
			};
			server.tool(
				{
					name: 'schemaful',
					description: 'x',
					schema,
				},
				(input) => ({
					content: [{ type: 'text', text: JSON.stringify(input) }],
				}),
			);
			const response = await server.receive(
				stateless_request('tools/list'),
			);
			expect(
				response.result.tools[0].inputSchema['x-mcp-header'],
			).toEqual({ name: 'X-Test' });
			expect(response.result.tools[0].inputSchema.$defs).toEqual({
				foo: { type: 'string' },
			});
		});
	});

	describe('capability schemas', () => {
		it('accepts legacy client capabilities on initialize', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {
						roots: { listChanged: true },
						sampling: {},
						elicitation: {},
					},
					clientInfo: { name: 'legacy', version: '1.0.0' },
				},
			});
			expect(response.result.protocolVersion).toBe('2025-06-18');
		});

		it('accepts modern client capabilities with elicitation sub-shapes and extensions', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {
						elicitation: { form: {}, url: {} },
						extensions: {
							'io.modelcontextprotocol/tasks': { version: 1 },
						},
					},
					clientInfo: { name: 'modern', version: '1.0.0' },
				},
			});
			expect(response.result.protocolVersion).toBe('2025-06-18');
		});
	});

	describe('version list consolidation', () => {
		it('exports a defensive copy of the per-request version list', () => {
			const versions = getPerRequestProtocolVersions();
			expect(versions).toEqual([MODERN]);
			versions.length = 0;
			expect(getPerRequestProtocolVersions()).toEqual([MODERN]);
		});

		it('no longer advertises 2024-10-07', async () => {
			const server = create_server();
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2024-10-07',
					capabilities: {},
					clientInfo: { name: 'old', version: '1.0.0' },
				},
			});
			// unsupported versions negotiate down to the latest supported one
			expect(response.result.protocolVersion).toBe('2025-06-18');
		});
	});
});
