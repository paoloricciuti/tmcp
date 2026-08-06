import { HEADER_MISMATCH, McpError } from 'tmcp';

const ENCODED_PREFIX = '=?base64?';
const ENCODED_SUFFIX = '?=';
const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const PLAIN_HEADER_VALUE = /^[\t\x20-\x7e]*$/;
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** @param {string} message */
function header_mismatch(message) {
	throw new McpError(HEADER_MISMATCH, `Header mismatch: ${message}`);
}

/**
 * Decode an MCP mirrored header value and reject unsafe plain values or a
 * malformed Base64 sentinel.
 * @param {string} value
 * @param {string} name
 */
function decode_value(value, name) {
	if (value.startsWith(ENCODED_PREFIX) && value.endsWith(ENCODED_SUFFIX)) {
		const encoded = value.slice(
			ENCODED_PREFIX.length,
			-ENCODED_SUFFIX.length,
		);
		try {
			const decoded = atob(encoded);
			if (btoa(decoded) !== encoded) {
				throw new TypeError('Non-canonical Base64');
			}
			const bytes = Uint8Array.from(decoded, (character) =>
				character.charCodeAt(0),
			);
			return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		} catch {
			header_mismatch(`${name} contains malformed Base64`);
		}
	}
	if (!PLAIN_HEADER_VALUE.test(value) || value.trim() !== value) {
		header_mismatch(`${name} contains an invalid plain header value`);
	}
	return value;
}

/**
 * @param {Headers} headers
 * @param {string} name
 */
function required_header(headers, name) {
	const value = headers.get(name);
	if (value === null) header_mismatch(`${name} is required`);
	return /** @type {string} */ (value);
}

/**
 * Validate the standard headers mirrored from a per-request JSON-RPC
 * request or notification.
 * @param {Headers} headers
 * @param {Record<string, any>} message
 */
export function validate_request_headers(headers, message) {
	const protocol_version = required_header(headers, 'MCP-Protocol-Version');
	const body_version =
		message.params?._meta?.['io.modelcontextprotocol/protocolVersion'];
	if (protocol_version !== body_version) {
		header_mismatch(
			`MCP-Protocol-Version does not match the request protocol version`,
		);
	}

	const method = required_header(headers, 'Mcp-Method');
	if (method !== message.method) {
		header_mismatch(`Mcp-Method does not match the request method`);
	}

	const name_field =
		message.method === 'resources/read'
			? 'uri'
			: message.method === 'tools/call' ||
				  message.method === 'prompts/get'
				? 'name'
				: undefined;
	if (name_field === undefined) return;
	const name = required_header(headers, 'Mcp-Name');
	const decoded_name = decode_value(name, 'Mcp-Name');
	if (
		typeof message.params?.[name_field] !== 'string' ||
		decoded_name !== message.params[name_field]
	) {
		header_mismatch(`Mcp-Name does not match params.${name_field}`);
	}
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} [seen]
 * @returns {boolean}
 */
function contains_annotation(value, seen = new WeakSet()) {
	if (typeof value !== 'object' || value === null) return false;
	if (seen.has(value)) return false;
	seen.add(value);
	if (Object.hasOwn(value, 'x-mcp-header')) return true;
	return Object.values(value).some((child) =>
		contains_annotation(child, seen),
	);
}

/**
 * @typedef {{ name: string, path: string[], type: 'string' | 'boolean' | 'integer' }} ParameterHeader
 */

/**
 * @param {Record<string, unknown>} schema
 * @returns {ParameterHeader[]}
 */
function parameter_headers(schema) {
	/** @type {ParameterHeader[]} */
	const annotations = [];
	const names = new Set();

	/**
	 * @param {unknown} value
	 * @param {string[]} path
	 */
	function visit(value, path) {
		if (
			typeof value !== 'object' ||
			value === null ||
			Array.isArray(value)
		) {
			return;
		}
		const node = /** @type {Record<string, unknown>} */ (value);
		if (Object.hasOwn(node, 'x-mcp-header')) {
			if (path.length === 0) {
				throw new TypeError(
					'Invalid x-mcp-header annotation: annotations must be attached to a property',
				);
			}
			const name = node['x-mcp-header'];
			const type = node.type;
			if (typeof name !== 'string' || !HTTP_TOKEN.test(name)) {
				throw new TypeError(
					'Invalid x-mcp-header annotation: expected a non-empty HTTP token',
				);
			}
			if (type !== 'string' && type !== 'boolean' && type !== 'integer') {
				throw new TypeError(
					`Invalid x-mcp-header annotation ${JSON.stringify(name)}: expected a string, boolean, or integer property`,
				);
			}
			const normalized_name = name.toLowerCase();
			if (names.has(normalized_name)) {
				throw new TypeError(
					`Invalid x-mcp-header annotation: duplicate name ${JSON.stringify(name)}`,
				);
			}
			names.add(normalized_name);
			annotations.push({ name, path, type });
		}

		const properties = node.properties;
		if (
			typeof properties === 'object' &&
			properties !== null &&
			!Array.isArray(properties)
		) {
			for (const [key, child] of Object.entries(properties)) {
				visit(child, [...path, key]);
			}
		}

		for (const [key, child] of Object.entries(node)) {
			if (key === 'properties' || key === 'x-mcp-header') continue;
			if (contains_annotation(child)) {
				throw new TypeError(
					'Invalid x-mcp-header annotation: annotations must be reachable only through properties',
				);
			}
		}
	}

	visit(schema, []);
	return annotations;
}

/**
 * @param {Record<string, unknown>} args
 * @param {string[]} path
 */
function value_at_path(args, path) {
	/** @type {unknown} */
	let value = args;
	for (const key of path) {
		if (
			typeof value !== 'object' ||
			value === null ||
			Array.isArray(value) ||
			!Object.hasOwn(value, key)
		) {
			return { present: false, value: undefined };
		}
		value = /** @type {Record<string, unknown>} */ (value)[key];
	}
	return { present: true, value };
}

/**
 * Validate recognized `Mcp-Param-*` headers against annotated tool
 * parameters.
 * @param {Headers} headers
 * @param {Record<string, unknown>} input_schema
 * @param {Record<string, unknown>} args
 */
export function validate_tool_parameter_headers(headers, input_schema, args) {
	for (const annotation of parameter_headers(input_schema)) {
		const header_name = `Mcp-Param-${annotation.name}`;
		const header = headers.get(header_name);
		const body = value_at_path(args, annotation.path);
		if (!body.present || body.value === null) {
			if (header !== null) {
				header_mismatch(`${header_name} must be omitted`);
			}
			continue;
		}
		if (header === null) header_mismatch(`${header_name} is required`);
		const decoded = decode_value(
			/** @type {string} */ (header),
			header_name,
		);

		let matches = false;
		if (annotation.type === 'string') {
			matches = typeof body.value === 'string' && decoded === body.value;
		} else if (annotation.type === 'boolean') {
			matches =
				typeof body.value === 'boolean' &&
				decoded === (body.value ? 'true' : 'false');
		} else if (
			Number.isSafeInteger(body.value) &&
			JSON_NUMBER.test(decoded)
		) {
			const number = Number(decoded);
			matches = Number.isSafeInteger(number) && number === body.value;
		}
		if (!matches) {
			header_mismatch(`${header_name} does not match the tool arguments`);
		}
	}
}
