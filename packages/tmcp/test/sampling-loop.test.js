/**
 * @import { McpServer } from "../src/index.js"
 */
import { describe, expect, it, vi } from 'vitest';
import { defineTool } from '../src/tool.js';
import { BreakLoopError, sampling, tool } from '../src/utils/index.js';

/**
 * @typedef {Object} MockServerMessage
 * @property {import('../src/index.js').CreateMessageResult<true>} response
 */

/**
 * Creates a mock server with a configurable message function
 * @param {Array<import('../src/index.js').CreateMessageResult<true>>} responses - Array of responses to return in sequence
 * @returns {McpServer<any, any>}
 */
function create_mock_server(responses) {
	let call_index = 0;
	return /** @type {McpServer<any, any>} */ (
		/** @type {unknown} */ ({
			message: vi.fn().mockImplementation(() => {
				const response = responses[call_index];
				call_index++;
				return Promise.resolve(response);
			}),
		})
	);
}

/**
 * Creates a mock server with a configurable message function
 * @param {import('../src/index.js').CreateMessageResult<true>} response - Response to return for every message call
 * @returns {McpServer<any, any>}
 */
function create_same_answer_mock_server(response) {
	return /** @type {McpServer<any, any>} */ (
		/** @type {unknown} */ ({
			message: vi.fn().mockImplementation(() => {
				return Promise.resolve(response);
			}),
		})
	);
}

describe('sampling.loop', () => {
	describe('basic flow', () => {
		it('should return immediately when LLM responds with endTurn', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Hello!' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Hi' } },
				],
				tools: [],
			});

			expect(result.response.stopReason).toBe('endTurn');
			expect(result.response.content).toEqual([
				{ type: 'text', text: 'Hello!' },
			]);
			expect(result.transcript).toHaveLength(2); // initial message + assistant response
			expect(mock_server.message).toHaveBeenCalledTimes(1);
		});

		it('should execute tool and continue loop when LLM requests tool use', async () => {
			const tool_fn = vi.fn().mockReturnValue(tool.text('Tool result'));

			const test_tool = defineTool(
				{
					name: 'test-tool',
					description: 'A test tool',
				},
				tool_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'tool-call-1',
							name: 'test-tool',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done!' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Use the tool' },
					},
				],
				tools: [test_tool],
			});

			expect(tool_fn).toHaveBeenCalledTimes(1);
			expect(result.response.stopReason).toBe('endTurn');
			expect(mock_server.message).toHaveBeenCalledTimes(2);
			// Transcript: initial message, assistant tool_use, user tool_result, assistant final
			expect(result.transcript).toHaveLength(4);
		});

		it('should pass tool input to the tool execute function', async () => {
			const tool_fn = vi.fn().mockReturnValue(tool.text('Result'));

			const test_tool = defineTool(
				{
					name: 'greet',
					description: 'Greets a person',
				},
				tool_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'tool-call-1',
							name: 'greet',
							input: { name: 'Alice' },
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Greeted!' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Greet Alice' },
					},
				],
				tools: [test_tool],
			});

			expect(tool_fn).toHaveBeenCalledWith({ name: 'Alice' });
		});
	});

	describe('multiple tool calls', () => {
		it('should handle multiple sequential tool calls', async () => {
			const tool_a_fn = vi.fn().mockReturnValue(tool.text('Result A'));
			const tool_b_fn = vi.fn().mockReturnValue(tool.text('Result B'));

			const tool_a = defineTool(
				{ name: 'tool-a', description: 'Tool A' },
				tool_a_fn,
			);
			const tool_b = defineTool(
				{ name: 'tool-b', description: 'Tool B' },
				tool_b_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-1',
							name: 'tool-a',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-2',
							name: 'tool-b',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'All done!' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Do both' },
					},
				],
				tools: [tool_a, tool_b],
			});

			expect(tool_a_fn).toHaveBeenCalledTimes(1);
			expect(tool_b_fn).toHaveBeenCalledTimes(1);
			expect(result.transcript).toHaveLength(6);
		});

		it('should handle parallel tool calls in a single response', async () => {
			const tool_a_fn = vi.fn().mockReturnValue(tool.text('Result A'));
			const tool_b_fn = vi.fn().mockReturnValue(tool.text('Result B'));

			const tool_a = defineTool(
				{ name: 'tool-a', description: 'Tool A' },
				tool_a_fn,
			);
			const tool_b = defineTool(
				{ name: 'tool-b', description: 'Tool B' },
				tool_b_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-1',
							name: 'tool-a',
							input: {},
						},
						{
							type: 'tool_use',
							id: 'call-2',
							name: 'tool-b',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Both done!' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{
						role: 'user',
						content: { type: 'text', text: 'Do both at once' },
					},
				],
				tools: [tool_a, tool_b],
			});

			expect(tool_a_fn).toHaveBeenCalledTimes(1);
			expect(tool_b_fn).toHaveBeenCalledTimes(1);
			expect(mock_server.message).toHaveBeenCalledTimes(2);
		});
	});

	describe('error handling', () => {
		it('should handle tool not found', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-1',
							name: 'non-existent-tool',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Sorry about that' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [],
			});

			// Check that the tool result indicates an error
			const tool_result_message = result.transcript.find(
				(m) =>
					m.role === 'user' &&
					Array.isArray(m.content) &&
					m.content.some(
						(c) => c.type === 'tool_result' && c.isError,
					),
			);
			expect(tool_result_message).toBeDefined();
		});

		it('should handle tool execution error', async () => {
			const tool_fn = vi.fn().mockImplementation(() => {
				throw new Error('Tool failed!');
			});

			const test_tool = defineTool(
				{ name: 'failing-tool', description: 'A failing tool' },
				tool_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-1',
							name: 'failing-tool',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Error handled' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [test_tool],
			});

			// Check that the tool result contains the error message
			const tool_result_message = result.transcript.find(
				(m) =>
					m.role === 'user' &&
					Array.isArray(m.content) &&
					m.content.some(
						(c) =>
							c.type === 'tool_result' &&
							c.isError &&
							c.content?.some(
								(t) =>
									t.type === 'text' &&
									t.text === 'Tool failed!',
							),
					),
			);
			expect(tool_result_message).toBeDefined();
		});

		it('should throw on maxTokens stop reason', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Partial...' }],
					model: 'test-model',
					stopReason: 'maxTokens',
				},
			]);

			await expect(
				sampling.loop({
					server: mock_server,
					initialMessages: [
						{
							role: 'user',
							content: { type: 'text', text: 'Test' },
						},
					],
					tools: [],
				}),
			).rejects.toThrow('LLM response hit max tokens limit');
		});

		it('should throw on unsupported stop reason', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Something' }],
					model: 'test-model',
					stopReason: /** @type {any} */ ('unknownReason'),
				},
			]);

			await expect(
				sampling.loop({
					server: mock_server,
					initialMessages: [
						{
							role: 'user',
							content: { type: 'text', text: 'Test' },
						},
					],
					tools: [],
				}),
			).rejects.toThrow('Unsupported stop reason: unknownReason');
		});
	});

	describe('BreakLoopError', () => {
		it('should propagate BreakLoopError from tool execution', async () => {
			const tool_fn = vi.fn().mockImplementation(() => {
				throw new BreakLoopError('Early exit');
			});

			const test_tool = defineTool(
				{ name: 'break-tool', description: 'A tool that breaks' },
				tool_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'call-1',
							name: 'break-tool',
							input: {},
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
			]);

			await expect(
				sampling.loop({
					server: mock_server,
					initialMessages: [
						{
							role: 'user',
							content: { type: 'text', text: 'Break!' },
						},
					],
					tools: [test_tool],
				}),
			).rejects.toThrow(BreakLoopError);
		});
	});

	describe('options', () => {
		it('should respect maxIterations option', async () => {
			const tool_fn = vi.fn().mockReturnValue(tool.text('Result'));

			const test_tool = defineTool(
				{ name: 'loop-tool', description: 'A tool' },
				tool_fn,
			);

			// Server always returns tool use, forcing an infinite loop
			const mock_server = create_same_answer_mock_server({
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						id: 'call-1',
						name: 'loop-tool',
						input: {},
					},
				],
				model: 'test-model',
				stopReason: 'toolUse',
			});

			await expect(
				sampling.loop({
					server: mock_server,
					initialMessages: [
						{
							role: 'user',
							content: { type: 'text', text: 'Loop forever' },
						},
					],
					tools: [test_tool],
					maxIterations: 3,
				}),
			).rejects.toThrow('Tool loop exceeded maximum iterations (3)');

			// Should have been called 3 times (once per iteration)
			expect(mock_server.message).toHaveBeenCalledTimes(3);
		});

		it('should pass maxTokens to server.message', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [],
				maxTokens: 1000,
			});

			expect(mock_server.message).toHaveBeenCalledWith(
				expect.objectContaining({
					maxTokens: 1000,
				}),
			);
		});

		it('should pass systemPrompt to server.message', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [],
				systemPrompt: 'You are a helpful assistant.',
			});

			expect(mock_server.message).toHaveBeenCalledWith(
				expect.objectContaining({
					systemPrompt: 'You are a helpful assistant.',
				}),
			);
		});

		it('should pass tools to server.message', async () => {
			const test_tool = defineTool(
				{ name: 'my-tool', description: 'My tool' },
				() => tool.text('Result'),
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [test_tool],
			});

			expect(mock_server.message).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: [test_tool],
				}),
			);
		});

		it('should use auto as default toolChoice', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [],
			});

			expect(mock_server.message).toHaveBeenCalledWith(
				expect.objectContaining({
					toolChoice: { mode: 'auto' },
				}),
			);
		});

		it('should respect defaultToolChoice option', async () => {
			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Done' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			await sampling.loop({
				server: mock_server,
				initialMessages: [
					{ role: 'user', content: { type: 'text', text: 'Test' } },
				],
				tools: [],
				defaultToolChoice: 'required',
			});

			expect(mock_server.message).toHaveBeenCalledWith(
				expect.objectContaining({
					toolChoice: { mode: 'required' },
				}),
			);
		});

		it('should force none toolChoice on last iteration', async () => {
			const tool_fn = vi.fn().mockReturnValue(tool.text('Result'));

			const test_tool = defineTool(
				{ name: 'loop-tool', description: 'A tool' },
				tool_fn,
			);

			const mock_server = create_same_answer_mock_server({
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						id: 'call-1',
						name: 'loop-tool',
						input: {},
					},
				],
				model: 'test-model',
				stopReason: 'toolUse',
			});

			try {
				await sampling.loop({
					server: mock_server,
					initialMessages: [
						{
							role: 'user',
							content: { type: 'text', text: 'Test' },
						},
					],
					tools: [test_tool],
					maxIterations: 2,
				});
			} catch {
				// Expected to throw due to exceeding max iterations
			}

			const mock_calls = /** @type {ReturnType<typeof vi.fn>} */ (
				mock_server.message
			).mock.calls;

			// The last call should have toolChoice: { mode: 'none' }
			const last_call = mock_calls[mock_calls.length - 1];
			expect(last_call[0].toolChoice).toEqual({ mode: 'none' });
			expect(last_call[0].tools).toBeUndefined();
		});
	});

	describe('transcript', () => {
		it('should build correct transcript with tool calls', async () => {
			const tool_fn = vi.fn().mockReturnValue(tool.text('42'));

			const calculator = defineTool(
				{ name: 'calculator', description: 'Calculates things' },
				tool_fn,
			);

			const mock_server = create_mock_server([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'calc-1',
							name: 'calculator',
							input: { expression: '6 * 7' },
						},
					],
					model: 'test-model',
					stopReason: 'toolUse',
				},
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'The answer is 42' }],
					model: 'test-model',
					stopReason: 'endTurn',
				},
			]);

			const result = await sampling.loop({
				server: mock_server,
				initialMessages: [
					{
						role: 'user',
						content: { type: 'text', text: 'What is 6 * 7?' },
					},
				],
				tools: [calculator],
			});

			expect(result.transcript).toEqual([
				// Initial user message
				{
					role: 'user',
					content: { type: 'text', text: 'What is 6 * 7?' },
				},
				// Assistant tool use
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							id: 'calc-1',
							name: 'calculator',
							input: { expression: '6 * 7' },
						},
					],
				},
				// Tool result
				{
					role: 'user',
					content: [
						{
							type: 'tool_result',
							toolUseId: 'calc-1',
							content: [{ type: 'text', text: '42' }],
							isError: undefined,
						},
					],
				},
				// Final assistant response
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'The answer is 42' }],
				},
			]);
		});
	});
});
