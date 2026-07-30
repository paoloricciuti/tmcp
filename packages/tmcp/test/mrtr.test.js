/**
 * Tests for Multi Round-Trip Requests (MRTR) on the per-request
 * (stateless, 2026-07-28) protocol: InputRequiredResult emission, keyed
 * replay, the `replayable` gate, requestState codec roundtrips, and
 * signal-swallowing detection.
 */
import { describe, expect, it, vi } from 'vitest';
import { JsonSchemaAdapter } from '../src/adapter.js';
import {
	McpServer,
	McpError,
	MISSING_REQUIRED_CLIENT_CAPABILITY,
	isInputRequired,
} from '../src/index.js';

const PER_REQUEST_VERSION = '2026-07-28';
const PV = 'io.modelcontextprotocol/protocolVersion';
const CC = 'io.modelcontextprotocol/clientCapabilities';
const SI = 'io.modelcontextprotocol/serverInfo';

/**
 * @template T
 * @typedef {{ '~standard': { validate: (input: unknown) => { value: T } | { issues: Array<{ message: string }> }, vendor: 'mock', version: 1, types?: { input: T, output: T } }}} MockSchema
 */

/**
 * A passthrough mock schema.
 * @returns {MockSchema<any>}
 */
function mock_schema() {
	return {
		'~standard': {
			validate: (input) => ({ value: input }),
			vendor: 'mock',
			version: 1,
		},
	};
}

/**
 * A schema that only accepts an object with a string `answer`.
 * @returns {MockSchema<{ answer: string }>}
 */
function answer_schema() {
	return {
		'~standard': {
			validate: (input) =>
				typeof input === 'object' &&
				input !== null &&
				typeof (/** @type {{ answer?: unknown }} */ (input).answer) ===
					'string'
					? { value: /** @type {{ answer: string }} */ (input) }
					: { issues: [{ message: 'answer must be a string' }] },
			vendor: 'mock',
			version: 1,
		},
	};
}

/**
 * Accepts a wire string and returns a number to prove replay validates the
 * original client response rather than the previous transformed output.
 * @returns {MockSchema<{ answer: number }>}
 */
function coercing_answer_schema() {
	return {
		'~standard': {
			validate: (input) => {
				const answer = /** @type {{ answer?: unknown } | null} */ (
					input
				)?.answer;
				return typeof answer === 'string' &&
					!Number.isNaN(Number(answer))
					? { value: { answer: Number(answer) } }
					: {
							issues: [
								{ message: 'answer must be a numeric string' },
							],
						};
			},
			vendor: 'mock',
			version: 1,
		},
	};
}

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
			properties: { answer: { type: 'string' } },
			required: ['answer'],
		};
	}
}

const adapter = new MockAdapter();

const server_info = { name: 'test-server', version: '1.0.0' };

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
			resources: { listChanged: true },
		},
		...options,
	});
}

/**
 * Build a stateless request with elicitation + sampling capabilities.
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
				[PV]: PER_REQUEST_VERSION,
				[CC]: { elicitation: {}, sampling: {} },
				...meta_overrides,
			},
		},
	};
}

const SAMPLING_RESULT = {
	model: 'mock-model',
	role: /** @type {const} */ ('assistant'),
	content: { type: /** @type {const} */ ('text'), text: 'sampled' },
};

describe('MRTR (multi round-trip requests)', () => {
	describe('InputRequiredResult emission', () => {
		it('emits an InputRequiredResult from a replayable tool calling elicitation()', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					const answer = await server.elicitation(
						'gimme',
						mock_schema(),
					);
					return {
						content: [
							{ type: 'text', text: String(answer.content) },
						],
					};
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);
			expect(response.error).toBeUndefined();
			expect(response.result.resultType).toBe('input_required');
			expect(response.result.inputRequests['1']).toEqual({
				method: 'elicitation/create',
				params: {
					message: 'gimme',
					requestedSchema: await adapter.toJsonSchema(),
				},
			});
			expect(response.result._meta[SI]).toEqual(server_info);
			// input-required results are never cacheable
			expect(response.result.ttlMs).toBeUndefined();
			expect(response.result.cacheScope).toBeUndefined();
			// no requestState was stored, so none is emitted
			expect(response.result.requestState).toBeUndefined();
		});

		it('emits a URL elicitation request when the client supports URL mode', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					await server.elicitation(
						'Authorize access',
						'https://example.com/authorize',
						{ key: 'authorization' },
					);
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'authorize' },
					{ [CC]: { elicitation: { url: {} } } },
				),
			);

			expect(response.error).toBeUndefined();
			expect(response.result.inputRequests.authorization).toEqual({
				method: 'elicitation/create',
				params: {
					mode: 'url',
					message: 'Authorize access',
					url: 'https://example.com/authorize',
				},
			});
		});

		it('emits an InputRequiredResult from a prompt calling message() (sampling)', async () => {
			const server = create_server();
			server.prompt(
				{ name: 'sampler', description: 'x', replayable: true },
				async () => {
					const result = await server.message({
						messages: [],
						maxTokens: 10,
					});
					return {
						messages: [
							{
								role: 'assistant',
								content: {
									type: 'text',
									text:
										result.content.type === 'text'
											? result.content.text
											: '',
								},
							},
						],
					};
				},
			);
			const response = await server.receive(
				stateless_request('prompts/get', { name: 'sampler' }),
			);
			expect(response.result.resultType).toBe('input_required');
			expect(response.result.inputRequests['1'].method).toBe(
				'sampling/createMessage',
			);
			expect(response.result.inputRequests['1'].params.maxTokens).toBe(
				10,
			);
		});

		it('emits an InputRequiredResult from a resource read (no cache fields)', async () => {
			const server = create_server({
				cache: { ttlMs: 5000, cacheScope: 'public' },
			});
			server.resource(
				{
					name: 'guarded',
					description: 'x',
					uri: 'test://guarded',
					replayable: true,
				},
				async (uri) => {
					await server.elicitation('unlock', mock_schema());
					return { contents: [{ uri, text: 'secret' }] };
				},
			);
			const response = await server.receive(
				stateless_request('resources/read', { uri: 'test://guarded' }),
			);
			expect(response.result.resultType).toBe('input_required');
			expect(response.result.ttlMs).toBeUndefined();
			expect(response.result.cacheScope).toBeUndefined();
		});

		it('emits an InputRequiredResult from a template-matched resource read', async () => {
			const server = create_server();
			server.template(
				{
					name: 'guarded-template',
					description: 'x',
					uri: 'test://guarded/{id}',
					replayable: true,
				},
				async (uri) => {
					await server.elicitation('unlock', mock_schema());
					return { contents: [{ uri, text: 'secret' }] };
				},
			);
			const response = await server.receive(
				stateless_request('resources/read', {
					uri: 'test://guarded/42',
				}),
			);
			expect(response.result.resultType).toBe('input_required');
			expect(response.result.inputRequests['1'].method).toBe(
				'elicitation/create',
			);
		});

		it('only ever emits elicitation/sampling input requests (roots are never input requests)', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await Promise.all([
						server.elicitation('a', mock_schema()),
						server.message({ messages: [], maxTokens: 1 }),
					]);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);
			const methods = Object.values(response.result.inputRequests).map(
				(/** @type {any} */ r) => r.method,
			);
			expect(methods.sort()).toEqual([
				'elicitation/create',
				'sampling/createMessage',
			]);
		});
	});

	describe('retry with inputResponses', () => {
		it('resolves the input call with the provided response and re-executes the handler from the top', async () => {
			const server = create_server();
			let executions = 0;
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					executions += 1;
					const answer = await server.elicitation(
						'gimme',
						mock_schema(),
					);
					return {
						content: [
							{
								type: 'text',
								text: /** @type {any} */ (answer.content)
									.answer,
							},
						],
					};
				},
			);
			const first = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);
			expect(first.result.resultType).toBe('input_required');
			expect(executions).toBe(1);

			const retry = await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					inputResponses: {
						1: { action: 'accept', content: { answer: '42' } },
					},
				}),
			);
			expect(retry.result.resultType).toBe('complete');
			expect(retry.result.content[0].text).toBe('42');
			// the handler re-executed from the top on the retry
			expect(executions).toBe(2);
		});

		it('resolves URL elicitation without form content', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					const answer = await server.elicitation(
						'Authorize access',
						'https://example.com/authorize',
					);
					return {
						content: [
							{
								type: 'text',
								text: `${answer.action}:${Object.hasOwn(answer, 'content')}`,
							},
						],
					};
				},
			);

			const response = await server.receive(
				stateless_request(
					'tools/call',
					{
						name: 'authorize',
						inputResponses: {
							1: {
								action: 'accept',
								content: { secret: 'must not pass through' },
							},
						},
					},
					{ [CC]: { elicitation: { url: {} } } },
				),
			);

			expect(response.error).toBeUndefined();
			expect(response.result.content[0].text).toBe('accept:false');
		});

		it('strips URL content before carrying the response in requestState', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					await server.elicitation(
						'Authorize access',
						'https://example.com/authorize',
						{ key: 'authorization' },
					);
					await server.message(
						{ messages: [], maxTokens: 5 },
						{ key: 'summary' },
					);
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request(
					'tools/call',
					{
						name: 'authorize',
						inputResponses: {
							authorization: {
								action: 'accept',
								content: { secret: 'must not be carried' },
							},
						},
					},
					{
						[CC]: { elicitation: { url: {} }, sampling: {} },
					},
				),
			);

			expect(response.result.inputRequests.summary.method).toBe(
				'sampling/createMessage',
			);
			expect(JSON.parse(response.result.requestState)).toEqual({
				version: 1,
				inputResponses: {
					authorization: { action: 'accept' },
				},
			});
		});

		it('handlers never see inputResponses/requestState in their params', async () => {
			const server = create_server();
			/** @type {any} */
			let seen_args;
			server.tool(
				{
					name: 'ask',
					description: 'x',
					replayable: true,
					schema: mock_schema(),
				},
				async (args) => {
					seen_args = args;
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					arguments: { foo: 'bar' },
					inputResponses: {},
					requestState: JSON.stringify({
						version: 1,
						inputResponses: {},
						state: 's',
					}),
				}),
			);
			expect(seen_args).toEqual({ foo: 'bar' });
		});

		it('ignores extra unrelated entries of any shape in inputResponses', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					const answer = await server.elicitation(
						'gimme',
						mock_schema(),
					);
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify(answer.content),
							},
						],
					};
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					inputResponses: {
						1: { action: 'accept', content: { answer: 'ok' } },
						unrelated: 42,
						'also-unrelated': SAMPLING_RESULT,
					},
				}),
			);
			expect(response.result.resultType).toBe('complete');
		});

		it('rejects an invalid response shape for a key with a structured -32602 error', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					inputResponses: { 1: { action: 'not-an-action' } },
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('key "1"');
		});

		it.each([
			['envelope', { action: 'invalid' }],
			['content', { action: 'accept', content: { answer: 42 } }],
		])(
			'allows recovery from invalid elicitation %s with the same key',
			async (_kind, invalid_response) => {
				const server = create_server();
				server.tool(
					{ name: 'ask', description: 'x', replayable: true },
					async () => {
						try {
							await server.elicitation('gimme', answer_schema(), {
								key: 'answer',
							});
						} catch {
							await server.elicitation(
								'gimme again',
								answer_schema(),
								{ key: 'answer' },
							);
						}
						return { content: [] };
					},
				);

				const response = await server.receive(
					stateless_request('tools/call', {
						name: 'ask',
						inputResponses: { answer: invalid_response },
					}),
				);

				expect(response.error).toBeUndefined();
				expect(
					response.result.inputRequests.answer.params.message,
				).toBe('gimme again');
			},
		);

		it('rejects an invalid sampling response for a consumed key', async () => {
			const server = create_server();
			server.tool(
				{ name: 'sample', description: 'x', replayable: true },
				async () => {
					await server.message({ messages: [], maxTokens: 5 });
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'sample',
					inputResponses: { 1: { model: 'missing-fields' } },
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('key "1"');
		});

		it('allows recovery from an invalid sampling response with the same key', async () => {
			const server = create_server();
			server.tool(
				{ name: 'sample', description: 'x', replayable: true },
				async () => {
					try {
						await server.message(
							{ messages: [], maxTokens: 5 },
							{ key: 'sample' },
						);
					} catch {
						await server.message(
							{ messages: [], maxTokens: 10 },
							{ key: 'sample' },
						);
					}
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'sample',
					inputResponses: { sample: { model: 'missing-fields' } },
				}),
			);

			expect(response.error).toBeUndefined();
			expect(response.result.inputRequests.sample.params.maxTokens).toBe(
				10,
			);
		});

		it('rejects form elicitation when the client only supports URL mode', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'ask' },
					{ [CC]: { elicitation: { url: {} } } },
				),
			);
			expect(response.error.code).toBe(
				MISSING_REQUIRED_CLIENT_CAPABILITY,
			);
			expect(response.error.data).toEqual({
				requiredCapabilities: { elicitation: { form: {} } },
			});
		});

		it('rejects URL elicitation when the client only supports form mode', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					await server.elicitation(
						'Authorize access',
						'https://example.com/authorize',
					);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'authorize' },
					{ [CC]: { elicitation: { form: {} } } },
				),
			);

			expect(response.error.code).toBe(
				MISSING_REQUIRED_CLIENT_CAPABILITY,
			);
			expect(response.error.data).toEqual({
				requiredCapabilities: { elicitation: { url: {} } },
			});
		});

		it('rejects an invalid URL elicitation request', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					await server.elicitation('Authorize access', 'not-a-url');
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'authorize' },
					{ [CC]: { elicitation: { url: {} } } },
				),
			);

			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('not a valid URL');
		});

		it('allows a handler to recover from failed input preparation', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					try {
						await server.elicitation(
							'Authorize access',
							'not-a-url',
							{ key: 'authorization' },
						);
					} catch {
						return {
							content: [{ type: 'text', text: 'fallback' }],
						};
					}
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'authorize' },
					{ [CC]: { elicitation: { url: {} } } },
				),
			);

			expect(response.error).toBeUndefined();
			expect(response.result.content[0].text).toBe('fallback');
		});

		it('releases the key after failed input preparation', async () => {
			const server = create_server();
			server.tool(
				{ name: 'authorize', description: 'x', replayable: true },
				async () => {
					try {
						await server.elicitation(
							'Authorize access',
							'not-a-url',
							{ key: 'authorization' },
						);
					} catch {
						await server.elicitation(
							'Authorize access',
							'https://example.com/authorize',
							{ key: 'authorization' },
						);
					}
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'authorize' },
					{ [CC]: { elicitation: { url: {} } } },
				),
			);

			expect(response.error).toBeUndefined();
			expect(response.result.inputRequests.authorization.params).toEqual({
				mode: 'url',
				message: 'Authorize access',
				url: 'https://example.com/authorize',
			});
		});

		it('accepts published enum schemas and primitive defaults', async () => {
			const requested_schema = {
				type: 'object',
				properties: {
					string: { type: 'string', default: 'red' },
					number: { type: 'number', default: 1 },
					boolean: { type: 'boolean', default: true },
					untitled_single: {
						type: 'string',
						enum: ['red', 'blue'],
						default: 'red',
					},
					legacy_single: {
						type: 'string',
						enum: ['red', 'blue'],
						enumNames: ['Red', 'Blue'],
						default: 'blue',
					},
					untitled_multi: {
						type: 'array',
						minItems: 1,
						maxItems: 2,
						items: { type: 'string', enum: ['red', 'blue'] },
						default: ['red'],
					},
					titled_multi: {
						type: 'array',
						items: {
							anyOf: [
								{ const: 'red', title: 'Red' },
								{ const: 'blue', title: 'Blue' },
							],
						},
						default: ['blue'],
					},
					titled_single: {
						type: 'string',
						oneOf: [
							{ const: 'red', title: 'Red' },
							{ const: 'blue', title: 'Blue' },
						],
						default: 'red',
					},
				},
			};
			class EnumAdapter extends MockAdapter {
				/** @returns {Promise<object>} */
				async toJsonSchema() {
					return requested_schema;
				}
			}
			const server = create_server({ adapter: new EnumAdapter() });
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('Choose colors', mock_schema());
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);

			expect(response.error).toBeUndefined();
			expect(
				response.result.inputRequests['1'].params.requestedSchema,
			).toEqual(requested_schema);
		});

		it('strips adapter-specific keywords from outgoing form schemas', async () => {
			class AdapterWithExtraKeywords extends MockAdapter {
				/** @returns {Promise<object>} */
				async toJsonSchema() {
					return {
						type: 'object',
						properties: {
							email: {
								type: 'string',
								format: 'email',
								pattern: '^[^@]+@[^@]+$',
							},
							count: {
								type: 'number',
								exclusiveMinimum: 0,
							},
						},
						additionalProperties: false,
					};
				}
			}
			const server = create_server({
				adapter: new AdapterWithExtraKeywords(),
			});
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('Provide details', mock_schema());
					return { content: [] };
				},
			);

			const response = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);

			expect(
				response.result.inputRequests['1'].params.requestedSchema,
			).toEqual({
				type: 'object',
				properties: {
					email: { type: 'string', format: 'email' },
					count: { type: 'number' },
				},
			});
		});

		it('rejects adapter output that is not a valid form elicitation schema', async () => {
			class NestedAdapter extends MockAdapter {
				/** @returns {Promise<object>} */
				async toJsonSchema() {
					return {
						type: 'object',
						properties: {
							nested: {
								type: 'object',
								properties: { value: { type: 'string' } },
							},
						},
					};
				}
			}
			const server = create_server({ adapter: new NestedAdapter() });
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'ask' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'Invalid elicitation schema',
			);
		});

		it('rejects a non-object inputResponses map with -32602', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				() => ({ content: [] }),
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					inputResponses: ['nope'],
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('inputResponses');
		});

		it.each(['constructor', 'toString', '__proto__'])(
			'accepts the stable key %s without reading inherited properties',
			async (key) => {
				const server = create_server();
				server.tool(
					{ name: 'ask', description: 'x', replayable: true },
					async () => {
						const answer = await server.elicitation(
							'gimme',
							mock_schema(),
							{ key },
						);
						return {
							content: [
								{
									type: 'text',
									text: /** @type {any} */ (answer.content)
										.answer,
								},
							],
						};
					},
				);
				const input_responses = Object.fromEntries([
					[key, { action: 'accept', content: { answer: 'ok' } }],
				]);
				const response = await server.receive(
					stateless_request('tools/call', {
						name: 'ask',
						inputResponses: input_responses,
					}),
				);
				expect(response.result.content[0].text).toBe('ok');
			},
		);

		it.each(['decline', 'cancel'])(
			'accepts an elicitation %s response without content',
			async (action) => {
				const server = create_server();
				server.tool(
					{ name: 'ask', description: 'x', replayable: true },
					async () => {
						const answer = await server.elicitation(
							'gimme',
							answer_schema(),
						);
						return {
							content: [{ type: 'text', text: answer.action }],
						};
					},
				);
				const response = await server.receive(
					stateless_request('tools/call', {
						name: 'ask',
						inputResponses: { 1: { action } },
					}),
				);
				expect(response.result.content[0].text).toBe(action);
			},
		);

		it('reports invalid accepted elicitation content as -32602', async () => {
			const server = create_server();
			server.tool(
				{ name: 'ask', description: 'x', replayable: true },
				async () => {
					await server.elicitation('gimme', answer_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'ask',
					inputResponses: {
						1: { action: 'accept', content: { answer: 42 } },
					},
				}),
			);
			expect(response.error.code).toBe(-32602);
		});
	});

	describe('keys', () => {
		it('supports stable keys with conditional control flow across retries', async () => {
			const server = create_server();
			server.tool(
				{ name: 'branchy', description: 'x', replayable: true },
				async () => {
					// conditional flow: the confirmation is only requested
					// after the first answer arrives, so ordinal keys would
					// shift between attempts — stable keys keep identity
					const first = await server.elicitation(
						'first',
						mock_schema(),
						{ key: 'first' },
					);
					if (
						/** @type {any} */ (first.content)?.answer ===
						'dangerous'
					) {
						await server.elicitation('confirm', mock_schema(), {
							key: 'confirm',
						});
					}
					return { content: [{ type: 'text', text: 'done' }] };
				},
			);
			const first = await server.receive(
				stateless_request('tools/call', { name: 'branchy' }),
			);
			expect(Object.keys(first.result.inputRequests)).toEqual(['first']);

			const second = await server.receive(
				stateless_request('tools/call', {
					name: 'branchy',
					inputResponses: {
						first: {
							action: 'accept',
							content: { answer: 'dangerous' },
						},
					},
				}),
			);
			expect(second.result.resultType).toBe('input_required');
			expect(Object.keys(second.result.inputRequests)).toEqual([
				'confirm',
			]);
			expect(second.result.requestState).toBeTypeOf('string');

			const third = await server.receive(
				stateless_request('tools/call', {
					name: 'branchy',
					requestState: second.result.requestState,
					inputResponses: {
						confirm: { action: 'accept', content: {} },
					},
				}),
			);
			expect(third.result.resultType).toBe('complete');
			expect(third.result.content[0].text).toBe('done');
		});

		it('revalidates carried elicitation responses from their original wire value', async () => {
			const server = create_server();
			/** @type {number[]} */
			const seen_answers = [];
			server.tool(
				{ name: 'coercing', description: 'x', replayable: true },
				async () => {
					const first = await server.elicitation(
						'first',
						coercing_answer_schema(),
						{ key: 'first' },
					);
					seen_answers.push(first.content?.answer ?? 0);
					await server.elicitation('confirm', mock_schema(), {
						key: 'confirm',
					});
					return { content: [{ type: 'text', text: 'done' }] };
				},
			);

			const first = await server.receive(
				stateless_request('tools/call', { name: 'coercing' }),
			);
			const second = await server.receive(
				stateless_request('tools/call', {
					name: 'coercing',
					inputResponses: {
						first: {
							action: 'accept',
							content: { answer: '42' },
						},
					},
				}),
			);
			const third = await server.receive(
				stateless_request('tools/call', {
					name: 'coercing',
					requestState: second.result.requestState,
					inputResponses: {
						confirm: { action: 'accept', content: {} },
					},
				}),
			);

			expect(first.result.resultType).toBe('input_required');
			expect(second.result.resultType).toBe('input_required');
			expect(third.result.resultType).toBe('complete');
			expect(seen_answers).toEqual([42, 42]);
		});

		it('rejects duplicate explicit keys within one attempt', async () => {
			const server = create_server();
			server.tool(
				{ name: 'dupe', description: 'x', replayable: true },
				async () => {
					await server.elicitation('a', mock_schema(), {
						key: 'same',
					});
					await server.elicitation('b', mock_schema(), {
						key: 'same',
					});
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'dupe',
					inputResponses: {
						same: { action: 'accept', content: {} },
					},
				}),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'Duplicate input request key "same"',
			);
		});

		it('rejects simultaneous unanswered input calls with the same key', async () => {
			const server = create_server();
			server.tool(
				{ name: 'dupe', description: 'x', replayable: true },
				async () => {
					await Promise.all([
						server.elicitation('a', mock_schema(), { key: 'same' }),
						server.message(
							{ messages: [], maxTokens: 5 },
							{ key: 'same' },
						),
					]);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'dupe' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'Duplicate input request key "same"',
			);
		});
	});

	describe('replayable gate', () => {
		it('fails a stateless input call on a registration without the flag, naming the flag', async () => {
			const server = create_server();
			server.tool({ name: 'unsafe', description: 'x' }, async () => {
				await server.elicitation('gimme', mock_schema());
				return { content: [] };
			});
			const response = await server.receive(
				stateless_request('tools/call', { name: 'unsafe' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain('tool "unsafe"');
			expect(response.error.message).toContain('replayable: true');
			expect(response.error.message).toContain('FROM THE TOP');
		});

		it('keeps the awaitable JSON-RPC path for the same registration on session requests', async () => {
			const server = create_server();
			server.tool({ name: 'unsafe', description: 'x' }, async () => {
				const answer = await server.elicitation('gimme', mock_schema());
				return {
					content: [
						{
							type: 'text',
							text: /** @type {any} */ (answer.content).answer,
						},
					],
				};
			});
			server.on('send', ({ request }) => {
				expect(request.method).toBe('elicitation/create');
				server.receive({
					jsonrpc: '2.0',
					id: /** @type {number} */ (request.id),
					result: {
						action: 'accept',
						content: { answer: 'session' },
					},
				});
			});
			const response = await server.receive(
				{
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'unsafe' },
				},
				{ sessionInfo: { clientCapabilities: { elicitation: {} } } },
			);
			expect(response.result.content[0].text).toBe('session');
		});

		it('missing capability takes precedence over the gate (-32021)', async () => {
			const server = create_server();
			server.tool({ name: 'unsafe', description: 'x' }, async () => {
				await server.elicitation('gimme', mock_schema());
				return { content: [] };
			});
			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'unsafe' },
					{ [CC]: {} },
				),
			);
			expect(response.error.code).toBe(
				MISSING_REQUIRED_CLIENT_CAPABILITY,
			);
			expect(response.error.data).toEqual({
				requiredCapabilities: { elicitation: { form: {} } },
			});
		});
	});

	describe('requestState', () => {
		it('roundtrips request state with the default JSON codec', async () => {
			const server = create_server();
			/** @type {unknown[]} */
			const seen_states = [];
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				async () => {
					seen_states.push(server.ctx.requestState);
					server.setRequestState({ step: 1 });
					await server.elicitation('gimme', mock_schema());
					return { content: [{ type: 'text', text: 'done' }] };
				},
			);
			const first = await server.receive(
				stateless_request('tools/call', { name: 'stateful' }),
			);
			expect(JSON.parse(first.result.requestState)).toEqual({
				version: 1,
				inputResponses: {},
				state: { step: 1 },
			});
			const retry = await server.receive(
				stateless_request('tools/call', {
					name: 'stateful',
					requestState: first.result.requestState,
					inputResponses: {
						1: { action: 'accept', content: {} },
					},
				}),
			);
			expect(retry.result.resultType).toBe('complete');
			expect(seen_states).toEqual([undefined, { step: 1 }]);
		});

		it('uses a custom codec when provided', async () => {
			/** @type {string[]} */
			const calls = [];
			const server = create_server({
				requestStateCodec: {
					encode: (state) => {
						calls.push('encode');
						return `custom:${JSON.stringify(state)}`;
					},
					decode: async (encoded) => {
						calls.push('decode');
						return JSON.parse(encoded.slice('custom:'.length));
					},
				},
			});
			/** @type {unknown} */
			let seen_state;
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				async () => {
					seen_state = server.ctx.requestState;
					server.setRequestState('hello');
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const first = await server.receive(
				stateless_request('tools/call', { name: 'stateful' }),
			);
			expect(
				JSON.parse(first.result.requestState.slice('custom:'.length)),
			).toEqual({
				version: 1,
				inputResponses: {},
				state: 'hello',
			});
			await server.receive(
				stateless_request('tools/call', {
					name: 'stateful',
					requestState: first.result.requestState,
				}),
			);
			expect(seen_state).toBe('hello');
			// the retry ends input-required again (no responses attached),
			// so it re-encodes after decoding
			expect(calls.slice(0, 2)).toEqual(['encode', 'decode']);
		});

		it('rejects oversized incoming requestState with -32602', async () => {
			const server = create_server();
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				() => ({ content: [] }),
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'stateful',
					requestState: 'x'.repeat(262145),
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('maximum accepted');
		});

		it('rejects undecodable requestState with -32602', async () => {
			const server = create_server();
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				() => ({ content: [] }),
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'stateful',
					requestState: 'not-json',
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('requestState');
		});

		it('distinguishes malformed tmcp state from codec failures', async () => {
			const server = create_server();
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				() => ({ content: [] }),
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'stateful',
					requestState: JSON.stringify({
						version: 2,
						inputResponses: {},
					}),
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain(
				'expected state previously returned by tmcp',
			);
			expect(response.error.message).not.toContain('codec failed');
		});

		it('reports requestState encoding failures', async () => {
			const server = create_server({
				requestStateCodec: {
					encode: () => {
						throw new Error('encode failed');
					},
					decode: JSON.parse,
				},
			});
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				async () => {
					server.setRequestState('state');
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'stateful' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain('encode failed');
		});

		it('rejects oversized encoded outgoing requestState', async () => {
			const server = create_server({
				requestStateCodec: {
					encode: () => 'x'.repeat(262145),
					decode: JSON.parse,
				},
			});
			server.tool(
				{ name: 'stateful', description: 'x', replayable: true },
				async () => {
					server.setRequestState('state');
					await server.elicitation('gimme', mock_schema());
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'stateful' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain('at most 262144');
		});

		it('setRequestState is a no-op on session-negotiated requests', async () => {
			const server = create_server();
			server.tool({ name: 'session-tool', description: 'x' }, () => {
				server.setRequestState({ some: 'state' });
				expect(server.ctx.requestState).toBeUndefined();
				return { content: [{ type: 'text', text: 'ok' }] };
			});
			const response = await server.receive({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'session-tool' },
			});
			expect(response.result.content[0].text).toBe('ok');
			expect(response.result.requestState).toBeUndefined();
		});
	});

	describe('signal handling', () => {
		it('does not log an expected input-required suspension', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			try {
				const server = create_server();
				server.tool(
					{ name: 'ask', description: 'x', replayable: true },
					async () => {
						await server.elicitation('gimme', mock_schema());
						return { content: [] };
					},
				);
				const response = await server.receive(
					stateless_request('tools/call', { name: 'ask' }),
				);
				expect(response.result.resultType).toBe('input_required');
				expect(warn).not.toHaveBeenCalled();
			} finally {
				warn.mockRestore();
			}
		});

		it('detects a swallowed signal and tells the author to rethrow', async () => {
			const server = create_server();
			server.tool(
				{ name: 'swallower', description: 'x', replayable: true },
				async () => {
					try {
						await server.elicitation('gimme', mock_schema());
					} catch {
						// broad catch: swallows the internal signal
					}
					return { content: [{ type: 'text', text: 'oops' }] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'swallower' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain('swallowed');
			expect(response.error.message).toContain('isInputRequired');
		});

		it('explains that an input call may not have been awaited', async () => {
			const server = create_server();
			server.tool(
				{ name: 'floating', description: 'x', replayable: true },
				() => {
					void server
						.elicitation('gimme', mock_schema())
						.catch(() => {});
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'floating' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain('not awaited');
		});

		it('isInputRequired lets authors rethrow selectively', async () => {
			const server = create_server();
			server.tool(
				{ name: 'careful', description: 'x', replayable: true },
				async () => {
					try {
						await server.elicitation('gimme', mock_schema());
					} catch (error) {
						if (isInputRequired(error)) throw error;
						return {
							content: [{ type: 'text', text: 'fallback' }],
						};
					}
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'careful' }),
			);
			expect(response.result.resultType).toBe('input_required');
			expect(isInputRequired(new Error('nope'))).toBe(false);
			expect(
				isInputRequired(new McpError(-32603, 'Input required')),
			).toBe(false);
		});

		it('handler errors unrelated to the signal pass through unchanged', async () => {
			const server = create_server();
			server.prompt(
				{ name: 'thrower', description: 'x', replayable: true },
				async () => {
					try {
						await server.elicitation('gimme', mock_schema());
					} catch {
						throw new McpError(-32000, 'application error');
					}
					return { messages: [] };
				},
			);
			const response = await server.receive(
				stateless_request('prompts/get', { name: 'thrower' }),
			);
			expect(response.error.code).toBe(-32000);
			expect(response.error.message).toContain('application error');
		});

		it('does not replace a handler error with a pending schema conversion failure', async () => {
			class FailingAdapter extends MockAdapter {
				/** @returns {Promise<object>} */
				async toJsonSchema() {
					throw new Error('schema conversion failed');
				}
			}
			const server = create_server({ adapter: new FailingAdapter() });
			server.tool(
				{ name: 'thrower', description: 'x', replayable: true },
				() => {
					void server
						.elicitation('gimme', mock_schema())
						.catch(() => {});
					throw new McpError(-32000, 'handler failed');
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'thrower' }),
			);
			expect(response.error.code).toBe(-32000);
			expect(response.error.message).toContain('handler failed');
		});

		it('reports schema conversion failure while preparing an input-required result', async () => {
			class FailingAdapter extends MockAdapter {
				/** @returns {Promise<object>} */
				async toJsonSchema() {
					await new Promise((resolve) => setTimeout(resolve, 10));
					throw new Error('schema conversion failed');
				}
			}
			const server = create_server({ adapter: new FailingAdapter() });
			server.tool(
				{ name: 'double', description: 'x', replayable: true },
				async () => {
					await Promise.all([
						server.elicitation('first', mock_schema(), {
							key: 'a',
						}),
						server.message(
							{ messages: [], maxTokens: 5 },
							{ key: 'b' },
						),
					]);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'double' }),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'Failed to prepare an input request: schema conversion failed',
			);
		});

		it('batches concurrent input calls (Promise.all) into one InputRequiredResult without unhandled rejections', async () => {
			/** @type {unknown[]} */
			const unhandled = [];
			/**
			 * @param {unknown} reason
			 */
			const on_unhandled = (reason) => {
				unhandled.push(reason);
			};
			process.on('unhandledRejection', on_unhandled);
			try {
				const server = create_server();
				server.tool(
					{ name: 'double', description: 'x', replayable: true },
					async () => {
						const [a, b] = await Promise.all([
							server.elicitation('first', mock_schema(), {
								key: 'a',
							}),
							server.message(
								{ messages: [], maxTokens: 5 },
								{ key: 'b' },
							),
						]);
						return {
							content: [
								{
									type: 'text',
									text: `${JSON.stringify(a.content)}|${/** @type {any} */ (b.content).text}`,
								},
							],
						};
					},
				);
				const first = await server.receive(
					stateless_request('tools/call', { name: 'double' }),
				);
				expect(first.result.resultType).toBe('input_required');
				expect(Object.keys(first.result.inputRequests).sort()).toEqual([
					'a',
					'b',
				]);

				const retry = await server.receive(
					stateless_request('tools/call', {
						name: 'double',
						inputResponses: {
							a: { action: 'accept', content: { answer: 'A' } },
							b: SAMPLING_RESULT,
						},
					}),
				);
				expect(retry.result.resultType).toBe('complete');
				expect(retry.result.content[0].text).toBe(
					'{"answer":"A"}|sampled',
				);
				// give the event loop a tick to surface any unhandled rejection
				await new Promise((resolve) => setTimeout(resolve, 0));
				expect(unhandled).toEqual([]);
			} finally {
				process.off('unhandledRejection', on_unhandled);
			}
		});

		it('waits for delayed input preparation before batching concurrent calls', async () => {
			class DelayedAdapter extends MockAdapter {
				async toJsonSchema() {
					await new Promise((resolve) => setTimeout(resolve, 10));
					return super.toJsonSchema();
				}
			}
			const server = create_server({ adapter: new DelayedAdapter() });
			server.tool(
				{ name: 'double', description: 'x', replayable: true },
				async () => {
					await Promise.all([
						server.elicitation('first', mock_schema(), {
							key: 'a',
						}),
						server.message(
							{ messages: [], maxTokens: 5 },
							{ key: 'b' },
						),
					]);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', { name: 'double' }),
			);
			expect(Object.keys(response.result.inputRequests).sort()).toEqual([
				'a',
				'b',
			]);
		});

		it('isolates simultaneous receive calls on one server', async () => {
			const server = create_server();
			for (const name of ['first', 'second']) {
				server.tool(
					{ name, description: 'x', replayable: true },
					async () => {
						await server.elicitation(name, mock_schema(), {
							key: name,
						});
						return { content: [] };
					},
				);
			}
			const [first, second] = await Promise.all([
				server.receive(
					stateless_request('tools/call', { name: 'first' }),
				),
				server.receive(
					stateless_request('tools/call', { name: 'second' }),
				),
			]);
			expect(Object.keys(first.result.inputRequests)).toEqual(['first']);
			expect(Object.keys(second.result.inputRequests)).toEqual([
				'second',
			]);
		});
	});

	describe('method policy', () => {
		it('returns method-not-found before validating MRTR-only params', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('unknown/method', {
					inputResponses: {},
				}),
			);
			expect(response.error.code).toBe(-32601);
			expect(response.error.message).toContain(
				'Method unknown/method not found',
			);
		});

		it('rejects inputResponses/requestState on non-MRTR methods with -32602', async () => {
			const server = create_server();
			for (const params of [
				{ inputResponses: {} },
				{ requestState: '"s"' },
			]) {
				const response = await server.receive(
					stateless_request('tools/list', params),
				);
				expect(response.error.code).toBe(-32602);
				expect(response.error.message).toContain(
					'multi round-trip methods',
				);
			}
		});

		it('non-MRTR methods never emit input-required results', async () => {
			const server = create_server();
			const response = await server.receive(
				stateless_request('tools/list'),
			);
			expect(response.result.resultType).toBe('complete');
		});

		it('rejects input calls from stateless completion callbacks instead of opening a session channel', async () => {
			const server = create_server();
			server.prompt(
				{
					name: 'completable',
					description: 'x',
					schema: mock_schema(),
					complete: {
						answer: async () => {
							await server.elicitation('gimme', mock_schema());
							return { completion: { values: [] } };
						},
					},
				},
				() => ({ messages: [] }),
			);
			const response = await server.receive(
				stateless_request('completion/complete', {
					ref: { type: 'ref/prompt', name: 'completable' },
					argument: { name: 'answer', value: 'a' },
				}),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'only available inside tools/call, prompts/get, and resources/read',
			);
		});

		it('rejects roots access during stateless execution', async () => {
			const server = create_server();
			server.tool(
				{ name: 'roots', description: 'x', replayable: true },
				async () => {
					await server.refreshRoots();
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request(
					'tools/call',
					{ name: 'roots' },
					{ [CC]: { roots: {} } },
				),
			);
			expect(response.error.code).toBe(-32603);
			expect(response.error.message).toContain(
				'roots are deprecated in protocol version 2026-07-28',
			);
		});

		it.each([{ inputResponses: {} }, { requestState: 'state' }])(
			'rejects MRTR-only params on session-negotiated requests',
			async (params) => {
				const server = create_server();
				server.tool({ name: 'plain', description: 'x' }, () => ({
					content: [],
				}));
				const response = await server.receive({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'plain', ...params },
				});
				expect(response.error.code).toBe(-32602);
				expect(response.error.message).toContain(
					'only supported by per-request (stateless)',
				);
			},
		);

		it('preserves an invalid consumed response error when another input is unanswered', async () => {
			const server = create_server();
			server.tool(
				{ name: 'mixed', description: 'x', replayable: true },
				async () => {
					await Promise.all([
						server.elicitation('invalid', mock_schema(), {
							key: 'invalid',
						}),
						server.message(
							{ messages: [], maxTokens: 5 },
							{ key: 'unanswered' },
						),
					]);
					return { content: [] };
				},
			);
			const response = await server.receive(
				stateless_request('tools/call', {
					name: 'mixed',
					inputResponses: {
						invalid: { action: 'not-an-action' },
					},
				}),
			);
			expect(response.error.code).toBe(-32602);
			expect(response.error.message).toContain('key "invalid"');
		});
	});
});
