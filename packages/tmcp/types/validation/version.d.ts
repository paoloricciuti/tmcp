/**
 * Check if a protocol version is supported
 * @param version - The protocol version to check
 * @returns True if the version is supported
 */
export function is_supported_version(version: string): boolean;
/**
 * Get the latest supported protocol version
 * @returns The latest protocol version
 */
export function get_latest_version(): string;
/**
 * Get all supported protocol versions
 * @returns Array of supported protocol versions
 */
export function get_supported_versions(): string[];
/**
 * Compare two protocol versions
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compare_versions(version1: string, version2: string): number;
/**
 * Check if a protocol version is newer than another
 * @param version1 - Version to check
 * @param version2 - Version to compare against
 * @returns True if version1 is newer than version2
 */
export function is_newer_version(version1: string, version2: string): boolean;
/**
 * Check if a protocol version is older than another
 * @param version1 - Version to check
 * @param version2 - Version to compare against
 * @returns True if version1 is older than version2
 */
export function is_older_version(version1: string, version2: string): boolean;
/**
 * Get the minimum version required for a feature
 * @deprecated Use the declarative per-method policy in
 * `validation/method-policy.js` instead. This minimum-version mechanism cannot
 * express methods that were removed in later protocol revisions.
 * @param feature - The feature name
 * @returns The minimum version required, or null if unknown
 */
export function get_minimum_version_for_feature(feature: string): string | null;
/**
 * Check if a feature is supported in a given protocol version
 * @deprecated Use the declarative per-method policy in
 * `validation/method-policy.js` instead.
 * @param feature - The feature name
 * @param version - The protocol version to check
 * @returns True if the feature is supported
 */
export function is_feature_supported(feature: string, version: string): boolean;
/**
 * Create a protocol version validation error
 * @param version - The invalid version
 * @param reason - The reason for the error
 * @returns The validation error
 */
export function create_version_error(version: string, reason: string): Error;
/**
 * Negotiate protocol version between client and server
 * According to MCP spec:
 * - If server supports client's version, return same version
 * - Otherwise, return server's latest supported version
 * @param client_version - The protocol version requested by client
 * @returns The negotiated protocol version
 */
export function negotiate_protocol_version(client_version: string): string;
/**
 * Check if version negotiation should result in an error
 * @param client_version - The protocol version requested by client
 * @returns True if negotiation should fail
 */
export function should_version_negotiation_fail(client_version: string): boolean;
/**
 * Supported MCP protocol versions in order of preference (newest first).
 *
 * This is the single source of truth for the session-negotiated (legacy
 * `initialize`) protocol versions. Note: `2024-10-07` was previously listed in
 * `validation/index.js` but was never actually negotiable, so it has been
 * deliberately dropped.
 */
export const SUPPORTED_VERSIONS: string[];
/**
 * Latest stable protocol version
 */
export const LATEST_PROTOCOL_VERSION: string;
/**
 * The modern, per-request-metadata protocol version.
 *
 * Pinned to the upstream MCP specification tag `2026-07-28`
 * (modelcontextprotocol/modelcontextprotocol commit
 * `5f5440bb26a62e2cf3440b92da5a667efa03b267`).
 */
export const MODERN_PROTOCOL_VERSION: "2026-07-28";
/**
 * Protocol versions that tmcp knows how to serve through per-request
 * `_meta` protocol handling (as opposed to legacy `initialize` negotiation).
 */
export const KNOWN_PER_REQUEST_PROTOCOL_VERSIONS: string[];
/**
 * Validate MCP protocol version format (YYYY-MM-DD)
 */
export const ProtocolVersionSchema: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.RegexAction<string, "Protocol version must be in YYYY-MM-DD format">]>;
/**
 * Validate that the protocol version is supported
 */
export const SupportedProtocolVersionSchema: v.SchemaWithPipe<readonly [v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.RegexAction<string, "Protocol version must be in YYYY-MM-DD format">]>, v.CheckAction<string, "Unsupported protocol version">]>;
import * as v from 'valibot';
//# sourceMappingURL=version.d.ts.map