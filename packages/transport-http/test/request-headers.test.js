import { HEADER_MISMATCH, McpError } from 'tmcp';
import { describe, expect, it } from 'vitest';
import {
	validate_request_headers,
	validate_tool_parameter_headers,
} from '../src/request-headers.js';

const VERSION = 'io.modelcontextprotocol/protocolVersion';

/** @param {string} value */
function encoded(value) {
	return `=?base64?${Buffer.from(value).toString('base64')}?=`;
}

/**
 * @param {string} method
 * @param {Record<string, unknown>} [params]
 */
function message(method, params = {}) {
	return {
		jsonrpc: '2.0',
		id: 1,
		method,
		params: { ...params, _meta: { [VERSION]: '2026-07-28' } },
	};
}

describe('standard per-request headers', () => {
	it('accepts case-insensitive header names and exact values', () => {
		expect(() =>
			validate_request_headers(
				new Headers({
					'mcp-protocol-version': '2026-07-28',
					'MCP-METHOD': 'tools/list',
				}),
				message('tools/list'),
			),
		).not.toThrow();
	});

	it.each([
		[{}, message('tools/list')],
		[
			{ 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/get' },
			message('tools/list'),
		],
		[
			{
				'MCP-Protocol-Version': '2026-07-28',
				'Mcp-Method': 'tools/call',
			},
			message('tools/call', { name: 'weather' }),
		],
	])(
		'throws HeaderMismatch for missing or mismatched headers',
		(headers, body) => {
			expect(() =>
				validate_request_headers(new Headers(headers), body),
			).toThrow(expect.objectContaining({ code: HEADER_MISMATCH }));
		},
	);

	it.each(['Hello, 世界', ' padded ', 'line1\nline2', '=?base64?literal?='])(
		'decodes an encoded Mcp-Name value: %j',
		(name) => {
			expect(() =>
				validate_request_headers(
					new Headers({
						'MCP-Protocol-Version': '2026-07-28',
						'Mcp-Method': 'tools/call',
						'Mcp-Name': encoded(name),
					}),
					message('tools/call', { name }),
				),
			).not.toThrow();
		},
	);

	it.each([
		'=?base64?%%%?=',
		'=?base64?YQ=?=',
		'=?base64?YQ?=',
		'=?base64?Y Q==?=',
		'=?Base64?YQ==?=',
	])('rejects malformed or incorrectly cased encoded values: %s', (name) => {
		expect(() =>
			validate_request_headers(
				new Headers({
					'MCP-Protocol-Version': '2026-07-28',
					'Mcp-Method': 'tools/call',
					'Mcp-Name': name,
				}),
				message('tools/call', { name: 'a' }),
			),
		).toThrow(McpError);
	});
});

describe('tool parameter headers', () => {
	const schema = {
		type: 'object',
		properties: {
			region: { type: 'string', 'x-mcp-header': 'Region' },
			enabled: { type: 'boolean', 'x-mcp-header': 'Enabled' },
			count: { type: 'integer', 'x-mcp-header': 'Count' },
			nested: {
				type: 'object',
				properties: {
					label: { type: 'string', 'x-mcp-header': 'Label' },
				},
			},
		},
	};

	it('validates strings, booleans, numeric integers, and nested values', () => {
		expect(() =>
			validate_tool_parameter_headers(
				new Headers({
					'Mcp-Param-Region': 'west',
					'Mcp-Param-Enabled': 'false',
					'Mcp-Param-Count': '42.0',
					'Mcp-Param-Label': encoded('世界'),
				}),
				schema,
				{
					region: 'west',
					enabled: false,
					count: 42,
					nested: { label: '世界' },
				},
			),
		).not.toThrow();
	});

	it.each([
		['negative integer', -7],
		['maximum safe integer', Number.MAX_SAFE_INTEGER],
		['minimum safe integer', Number.MIN_SAFE_INTEGER],
	])('accepts a %s parameter header', (_name, count) => {
		expect(() =>
			validate_tool_parameter_headers(
				new Headers({ 'Mcp-Param-Count': String(count) }),
				schema,
				{ count },
			),
		).not.toThrow();
	});

	it.each([
		['missing', new Headers(), { region: 'west' }],
		[
			'mismatched',
			new Headers({ 'Mcp-Param-Region': 'east' }),
			{ region: 'west' },
		],
		[
			'non-lowercase boolean',
			new Headers({ 'Mcp-Param-Enabled': 'TRUE' }),
			{ enabled: true },
		],
		[
			'unsafe integer',
			new Headers({ 'Mcp-Param-Count': '9007199254740992' }),
			{ count: 9007199254740992 },
		],
		[
			'unsafe negative integer',
			new Headers({ 'Mcp-Param-Count': '-9007199254740992' }),
			{ count: -9007199254740992 },
		],
		[
			'present null',
			new Headers({ 'Mcp-Param-Region': 'null' }),
			{ region: null },
		],
	])('rejects a %s parameter header', (_name, headers, args) => {
		expect(() =>
			validate_tool_parameter_headers(headers, schema, args),
		).toThrow(expect.objectContaining({ code: HEADER_MISMATCH }));
	});

	it('allows omitted headers for missing and null values and ignores unknown headers', () => {
		expect(() =>
			validate_tool_parameter_headers(
				new Headers({ 'Mcp-Param-Unknown': 'anything' }),
				schema,
				{ region: null },
			),
		).not.toThrow();
	});

	it.each([
		['empty name', { type: 'string', 'x-mcp-header': '' }],
		['invalid token', { type: 'string', 'x-mcp-header': 'bad name' }],
		['unsupported number', { type: 'number', 'x-mcp-header': 'Number' }],
		[
			'array path',
			{
				type: 'array',
				items: { type: 'string', 'x-mcp-header': 'Item' },
			},
		],
		[
			'reference path',
			{
				$ref: '#/$defs/value',
				$defs: { value: { type: 'string', 'x-mcp-header': 'Ref' } },
			},
		],
		[
			'composition path',
			{
				oneOf: [{ type: 'string', 'x-mcp-header': 'Choice' }],
			},
		],
	])('rejects an annotation with an invalid %s', (_name, property) => {
		expect(() =>
			validate_tool_parameter_headers(
				new Headers(),
				{ type: 'object', properties: { value: property } },
				{},
			),
		).toThrow(TypeError);
	});

	it.each(['if', 'then', 'else'])(
		'rejects an annotation behind the %s conditional keyword',
		(keyword) => {
			expect(() =>
				validate_tool_parameter_headers(
					new Headers(),
					{
						type: 'object',
						[keyword]: {
							properties: {
								value: {
									type: 'string',
									'x-mcp-header': 'Conditional',
								},
							},
						},
					},
					{},
				),
			).toThrow(TypeError);
		},
	);

	it.each(['line1\nline2', 'line1\rline2', 'value\u0001'])(
		'rejects a raw control character in a recognized header: %j',
		(value) => {
			const headers = /** @type {Headers} */ (
				/** @type {unknown} */ ({
					/** @param {string} name */
					get: (name) =>
						name.toLowerCase() === 'mcp-param-region'
							? value
							: null,
				})
			);
			expect(() =>
				validate_tool_parameter_headers(headers, schema, {
					region: value,
				}),
			).toThrow(expect.objectContaining({ code: HEADER_MISMATCH }));
		},
	);

	it('rejects case-insensitively duplicated names', () => {
		expect(() =>
			validate_tool_parameter_headers(
				new Headers(),
				{
					type: 'object',
					properties: {
						first: { type: 'string', 'x-mcp-header': 'Tenant' },
						second: { type: 'string', 'x-mcp-header': 'tenant' },
					},
				},
				{},
			),
		).toThrow(TypeError);
	});
});
