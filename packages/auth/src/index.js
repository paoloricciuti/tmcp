/**
 * @file OAuth 2.1 authorization helper for MCP with Web Request support and valibot validation
 */

/**
 * @import { OAuthServerProvider as OAuthServerProviderType, OAuthRegisteredClientsStore as OAuthRegisteredClientsStoreType } from "./internal.js"
 * @import { OAuthProviderConfig as OAuthProviderConfigType } from "./oauth-provider.js"
 */

/**
 * @typedef {OAuthServerProviderType} OAuthServerProvider
 * @typedef {OAuthRegisteredClientsStoreType} OAuthRegisteredClientsStore
 * @typedef {OAuthProviderConfigType} OAuthProviderConfig
 */

// Main OAuth Provider
export { OAuthProvider } from './oauth-provider.js';

// Provider implementations
export { ProxyOAuthServerProvider } from './proxy-provider.js';

// Error classes
export {
	OAuthError,
	InvalidRequestError,
	InvalidClientError,
	InvalidGrantError,
	UnauthorizedClientError,
	UnsupportedGrantTypeError,
	InvalidScopeError,
	AccessDeniedError,
	ServerError,
	TemporarilyUnavailableError,
	UnsupportedResponseTypeError,
	UnsupportedTokenTypeError,
	InvalidTokenError,
	MethodNotAllowedError,
	TooManyRequestsError,
	InvalidClientMetadataError,
	InsufficientScopeError,
	CustomOAuthError,
	OAUTH_ERRORS,
} from './errors.js';

// Validation schemas
export {
	OAuthClientMetadataSchema,
	OAuthClientInformationFullSchema,
	OAuthTokensSchema,
	OAuthTokenRevocationRequestSchema,
	ClientAuthenticatedRequestSchema,
	ClientAuthorizationParamsSchema,
	RequestAuthorizationParamsSchema,
	TokenRequestSchema,
	AuthorizationCodeGrantSchema,
	RefreshTokenGrantSchema,
	OAuthErrorResponseSchema,
} from './schemas.js';

// Type definitions (JSDoc imports)
export {} from './types.js';
