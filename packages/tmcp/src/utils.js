/**
 * @import { ClientCapabilities, LoggingLevel, ClientInfo } from "./validation/index.js";
 * @import SqidsType from "sqids";
 */

/**
 * Serialized state object for persistence
 * @typedef {Object} SerializedState
 * @property {Record<string, ClientCapabilities>} clientCapabilities
 * @property {Record<string, ClientInfo>} clientInfo
 * @property {Record<string, string>} negotiatedProtocolVersions
 * @property {Record<string, LoggingLevel>} sessionLogLevels
 * @property {Object} subscriptions
 * @property {Record<string, string[]>} subscriptions.resource
 */

/**
 * Reserved key used for serializing undefined session IDs
 * @type {string}
 */
const UNDEFINED_SESSION_KEY = '__@tmcp/undefined-session-marker__';

/**
 * @type {SqidsType | undefined}
 */
let Sqids;

async function get_sqids() {
	if (!Sqids) {
		Sqids = new (await import('sqids')).default();
	}
	return Sqids;
}

/**
 * Encode a cursor for pagination
 * @param {number} offset
 */
export async function encode_cursor(offset) {
	return (await get_sqids()).encode([offset]);
}

/**
 * Decode a cursor from pagination
 * @param {string} cursor
 */
export async function decode_cursor(cursor) {
	const [decoded] = (await get_sqids()).decode(cursor);
	return decoded;
}

/**
 * @param {()=>boolean | Promise<boolean>} enabled
 */
export async function safe_enabled(enabled) {
	try {
		return await enabled();
	} catch {
		return false;
	}
}

/**
 * Convert Map with potentially undefined keys to plain object
 * @template T
 * @param {Map<string|undefined, T>} map
 * @returns {Record<string, T>}
 */
export function map_to_object(map) {
	const entries = [...map.entries()].map(([key, value]) => [
		key === undefined ? UNDEFINED_SESSION_KEY : key,
		value,
	]);
	return Object.fromEntries(entries);
}

/**
 * Convert Record<string, string[]> to Map<string, Set<string|undefined>>
 * @param {Record<string, string[]>} subscriptions_obj
 * @returns {Map<string, Set<string|undefined>>}
 */
export function object_to_subscriptions(subscriptions_obj) {
	const entries = Object.entries(subscriptions_obj).map(
		([uri, sessions_array]) =>
			/** @type {const} */ ([
				uri,
				new Set(
					sessions_array.map((session) =>
						session === UNDEFINED_SESSION_KEY ? undefined : session,
					),
				),
			]),
	);
	return new Map(entries);
}

/**
 * Convert subscriptions Map<string, Set<string|undefined>> to Record<string, string[]>
 * @param {Map<string, Set<string|undefined>>} subscriptions_map
 * @returns {Record<string, string[]>}
 */
export function subscriptions_to_object(subscriptions_map) {
	const entries = [...subscriptions_map.entries()].map(
		([uri, sessions_set]) => [
			uri,
			[...sessions_set].map((session) =>
				session === undefined ? UNDEFINED_SESSION_KEY : session,
			),
		],
	);
	return Object.fromEntries(entries);
}

/**
 * Convert plain object to Map with potentially undefined keys
 * @template T
 * @param {Record<string, T>} obj
 * @returns {Map<string|undefined, T>}
 */
export function object_to_map(obj) {
	const entries = Object.entries(obj).map(
		([key, value]) =>
			/** @type {const} */ ([
				key === UNDEFINED_SESSION_KEY ? undefined : key,
				value,
			]),
	);
	return new Map(entries);
}
