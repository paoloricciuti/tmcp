/**
 * Check if a protocol version is supported
 * @param {string} version - The protocol version to check
 * @returns {boolean} True if the version is supported
 */
export function is_supported_version(version: string): boolean;
/**
 * Get the latest supported protocol version
 * @returns {string} The latest protocol version
 */
export function get_latest_version(): string;
/**
 * Get all supported protocol versions
 * @returns {string[]} Array of supported protocol versions
 */
export function get_supported_versions(): string[];
/**
 * Compare two protocol versions
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compare_versions(version1: string, version2: string): number;
/**
 * Check if a protocol version is newer than another
 * @param {string} version1 - Version to check
 * @param {string} version2 - Version to compare against
 * @returns {boolean} True if version1 is newer than version2
 */
export function is_newer_version(version1: string, version2: string): boolean;
/**
 * Check if a protocol version is older than another
 * @param {string} version1 - Version to check
 * @param {string} version2 - Version to compare against
 * @returns {boolean} True if version1 is older than version2
 */
export function is_older_version(version1: string, version2: string): boolean;
/**
 * Get the minimum version required for a feature
 * @param {string} feature - The feature name
 * @returns {string|null} The minimum version required, or null if unknown
 */
export function get_minimum_version_for_feature(feature: string): string | null;
/**
 * Check if a feature is supported in a given protocol version
 * @param {string} feature - The feature name
 * @param {string} version - The protocol version to check
 * @returns {boolean} True if the feature is supported
 */
export function is_feature_supported(feature: string, version: string): boolean;
/**
 * Create a protocol version validation error
 * @param {string} version - The invalid version
 * @param {string} reason - The reason for the error
 * @returns {Error} The validation error
 */
export function create_version_error(version: string, reason: string): Error;
/**
 * Negotiate protocol version between client and server
 * According to MCP spec:
 * - If server supports client's version, return same version
 * - Otherwise, return server's latest supported version
 * @param {string} client_version - The protocol version requested by client
 * @returns {string} The negotiated protocol version
 */
export function negotiate_protocol_version(client_version: string): string;
/**
 * Check if version negotiation should result in an error
 * @param {string} client_version - The protocol version requested by client
 * @returns {boolean} True if negotiation should fail
 */
export function should_version_negotiation_fail(client_version: string): boolean;
/**
 * Latest stable protocol version
 */
export const LATEST_PROTOCOL_VERSION: string;
/**
 * Validate MCP protocol version format (YYYY-MM-DD)
 */
export const ProtocolVersionSchema: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.RegexAction<string, "Protocol version must be in YYYY-MM-DD format">]>;
/**
 * Validate that the protocol version is supported
 */
export const SupportedProtocolVersionSchema: v.SchemaWithPipe<readonly [v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.RegexAction<string, "Protocol version must be in YYYY-MM-DD format">]>, v.CheckAction<string, "Unsupported protocol version">]>;
import * as v from 'valibot';
