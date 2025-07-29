/**
 * @file OAuth 2.1 authorization helper with clean fluent API
 */

// Main OAuth class (primary API)
export { OAuth } from './oauth.js';

// Provider implementations
export { ProxyOAuthServerProvider } from './proxy-provider.js';
export { SimpleProvider } from './simple-provider.js';

// Utilities
export { MemoryClientStore } from './memory-store.js';

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