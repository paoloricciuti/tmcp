/**
 * Declarative per-method protocol policy.
 *
 * Requests are classified once (in `McpServer.receive`) as either
 * session-negotiated (the classic `initialize` handshake) or per-request
 * (carrying the reserved `_meta` protocol keys, i.e. stateless). This map
 * describes which of those two request profiles each method is reachable
 * from, so that handlers themselves can stay profile-unaware.
 *
 * Methods not present in the map are allowed for both profiles (unknown
 * methods still get the standard "method not found" from the JSON-RPC
 * server).
 */

/**
 * @typedef {{ session: boolean, stateless: boolean }} MethodPolicy
 */

/**
 * @type {Record<string, MethodPolicy>}
 */
const method_policy = {
	// session-negotiated only
	initialize: { session: true, stateless: false },
	'notifications/initialized': { session: true, stateless: false },
	ping: { session: true, stateless: false },
	'logging/setLevel': { session: true, stateless: false },
	'resources/subscribe': { session: true, stateless: false },
	'resources/unsubscribe': { session: true, stateless: false },
	'notifications/roots/list_changed': { session: true, stateless: false },
	// per-request (stateless) only
	'server/discover': { session: false, stateless: true },
};

/**
 * Check whether a method is reachable for the given request profile.
 * @param {string} method
 * @param {boolean} stateless - Whether the current request carries per-request protocol metadata
 * @returns {boolean}
 */
export function is_method_allowed(method, stateless) {
	const policy = method_policy[method];
	if (!policy) return true;
	return stateless ? policy.stateless : policy.session;
}

/**
 * Methods whose results are `CacheableResult`s in the per-request protocol
 * and must carry `ttlMs` and `cacheScope` on the wire.
 */
export const CACHEABLE_METHODS = new Set([
	'server/discover',
	'tools/list',
	'prompts/list',
	'resources/list',
	'resources/read',
	'resources/templates/list',
]);
