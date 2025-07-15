import * as v from 'valibot';

/**
 * Supported MCP protocol versions in order of preference (newest first)
 */
const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

/**
 * Latest stable protocol version
 */
export const LATEST_PROTOCOL_VERSION = SUPPORTED_VERSIONS[0];

/**
 * Validate MCP protocol version format (YYYY-MM-DD)
 */
export const ProtocolVersionSchema = v.pipe(
	v.string(),
	v.regex(
		/^\d{4}-\d{2}-\d{2}$/,
		'Protocol version must be in YYYY-MM-DD format',
	),
);

/**
 * Validate that the protocol version is supported
 */
export const SupportedProtocolVersionSchema = v.pipe(
	ProtocolVersionSchema,
	v.check(
		(version) => SUPPORTED_VERSIONS.includes(version),
		'Unsupported protocol version',
	),
);

/**
 * Check if a protocol version is supported
 * @param {string} version - The protocol version to check
 * @returns {boolean} True if the version is supported
 */
export function is_supported_version(version) {
	return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Get the latest supported protocol version
 * @returns {string} The latest protocol version
 */
export function get_latest_version() {
	return LATEST_PROTOCOL_VERSION;
}

/**
 * Get all supported protocol versions
 * @returns {string[]} Array of supported protocol versions
 */
export function get_supported_versions() {
	return [...SUPPORTED_VERSIONS];
}

/**
 * Compare two protocol versions
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compare_versions(version1, version2) {
	// Parse versions as dates for comparison
	const date1 = new Date(version1);
	const date2 = new Date(version2);

	if (date1 < date2) return -1;
	if (date1 > date2) return 1;
	return 0;
}

/**
 * Check if a protocol version is newer than another
 * @param {string} version1 - Version to check
 * @param {string} version2 - Version to compare against
 * @returns {boolean} True if version1 is newer than version2
 */
export function is_newer_version(version1, version2) {
	return compare_versions(version1, version2) > 0;
}

/**
 * Check if a protocol version is older than another
 * @param {string} version1 - Version to check
 * @param {string} version2 - Version to compare against
 * @returns {boolean} True if version1 is older than version2
 */
export function is_older_version(version1, version2) {
	return compare_versions(version1, version2) < 0;
}

const feature_versions = {
	// 2025-06-18 features
	'elicitation/create': '2025-06-18',
	structured_tool_output: '2025-06-18',
	resource_links: '2025-06-18',
	oauth_resource_indicators: '2025-06-18',
	no_batching: '2025-06-18',
	protocol_version_headers: '2025-06-18',
	
	// 2025-03-26 features
	authorization: '2025-03-26',
	
	// 2024-11-05 features (initial MCP release)
	'sampling/createMessage': '2024-11-05',
	'roots/list': '2024-11-05',
	'notifications/roots/list_changed': '2024-11-05',
	'tools/list': '2024-11-05',
	'tools/call': '2024-11-05',
	'notifications/tools/list_changed': '2024-11-05',
	'resources/list': '2024-11-05',
	'resources/read': '2024-11-05',
	'resources/subscribe': '2024-11-05',
	'resources/templates/list': '2024-11-05',
	'notifications/resources/list_changed': '2024-11-05',
	'notifications/resources/updated': '2024-11-05',
	'prompts/list': '2024-11-05',
	'prompts/get': '2024-11-05',
	'notifications/prompts/list_changed': '2024-11-05',
	'completion/complete': '2024-11-05',
	initialize: '2024-11-05',
	ping: '2024-11-05',
	'notifications/initialized': '2024-11-05',
};

/**
 * Get the minimum version required for a feature
 * @param {string} feature - The feature name
 * @returns {string|null} The minimum version required, or null if unknown
 */
export function get_minimum_version_for_feature(feature) {
	return feature_versions[/** @type {never} */ (feature)] || null;
}

/**
 * Check if a feature is supported in a given protocol version
 * @param {string} feature - The feature name
 * @param {string} version - The protocol version to check
 * @returns {boolean} True if the feature is supported
 */
export function is_feature_supported(feature, version) {
	const min_version = get_minimum_version_for_feature(feature);
	if (!min_version) return false;

	return compare_versions(version, min_version) >= 0;
}

/**
 * Create a protocol version validation error
 * @param {string} version - The invalid version
 * @param {string} reason - The reason for the error
 * @returns {Error} The validation error
 */
export function create_version_error(version, reason) {
	return new Error(
		`Protocol version validation failed: ${reason}. Received: ${version}, Supported: ${SUPPORTED_VERSIONS.join(', ')}`,
	);
}

/**
 * Negotiate protocol version between client and server
 * According to MCP spec:
 * - If server supports client's version, return same version
 * - Otherwise, return server's latest supported version
 * @param {string} client_version - The protocol version requested by client
 * @returns {string} The negotiated protocol version
 */
export function negotiate_protocol_version(client_version) {
	// If server supports the client's version, use it
	if (is_supported_version(client_version)) {
		return client_version;
	}

	// Otherwise, return server's latest supported version
	return get_latest_version();
}

/**
 * Check if version negotiation should result in an error
 * @param {string} client_version - The protocol version requested by client
 * @returns {boolean} True if negotiation should fail
 */
export function should_version_negotiation_fail(client_version) {
	// Only fail if the client version format is completely invalid
	try {
		// Test basic format validation
		const date = new Date(client_version);
		const regex = /^\d{4}-\d{2}-\d{2}$/;
		return !regex.test(client_version) || isNaN(date.getTime());
	} catch {
		return true;
	}
}
