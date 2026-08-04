/**
 * Which request styles may call each method.
 *
 * Some clients first open a session with `initialize`; newer clients include
 * their version and capabilities on every request. This map lists methods
 * that only work with one of those styles.
 *
 * Methods not listed here work with both styles. Unknown methods still return
 * the normal "method not found" error.
 */

/**
 * @typedef {{ session: boolean, stateless: boolean }} MethodPolicy
 */

/**
 * @type {Record<string, MethodPolicy>}
 */
const method_policy = {
	// Requires an open client session.
	initialize: { session: true, stateless: false },
	'notifications/initialized': { session: true, stateless: false },
	'notifications/progress': { session: true, stateless: false },
	ping: { session: true, stateless: false },
	'logging/setLevel': { session: true, stateless: false },
	'resources/subscribe': { session: true, stateless: false },
	'resources/unsubscribe': { session: true, stateless: false },
	'notifications/roots/list_changed': { session: true, stateless: false },
	// Only available when version details are included in this request.
	'server/discover': { session: false, stateless: true },
	'subscriptions/listen': { session: false, stateless: true },
};

/**
 * Check whether the current request style can call this method.
 * @param {string} method
 * @param {boolean} stateless Whether the client included its version and capabilities in this request
 * @returns {boolean}
 */
export function is_method_allowed(method, stateless) {
	const policy = method_policy[method];
	if (!policy) return true;
	return stateless ? policy.stateless : policy.session;
}

/**
 * Check whether a method may be called with per-request protocol metadata.
 * @param {string} method
 * @returns {boolean}
 */
export function is_per_request_method_allowed(method) {
	return is_method_allowed(method, true);
}

/**
 * Methods whose responses tell the client how long they may be reused and
 * whether they may be shared.
 */
export const CACHEABLE_METHODS = new Set([
	'server/discover',
	'tools/list',
	'prompts/list',
	'resources/list',
	'resources/read',
	'resources/templates/list',
]);

/**
 * Methods that may ask the client for more input and continue when the client
 * retries. Only these methods accept `inputResponses` and `requestState` or
 * return `InputRequiredResult`. Other methods reject those fields so client
 * mistakes are visible.
 */
export const MRTR_METHODS = new Set([
	'tools/call',
	'prompts/get',
	'resources/read',
]);
