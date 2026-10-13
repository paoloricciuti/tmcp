/**
 * Base class for all OAuth errors
 */
export class OAuthError extends Error {
    static errorCode: string;
    /**
     * @param message - Error message
     * @param [errorUri] - Optional error URI
     */
    constructor(message: string, errorUri?: string);
    errorUri: string | undefined;
    /**
     * Get the error code for this error type
     */
    get errorCode(): string;
    /**
     * Converts the error to a standard OAuth error response object
     */
    toResponseObject(): OAuthErrorResponse;
}
/**
 * Invalid request error - The request is missing a required parameter,
 * includes an invalid parameter value, includes a parameter more than once,
 * or is otherwise malformed.
 */
export class InvalidRequestError extends OAuthError {
}
/**
 * Invalid client error - Client authentication failed (e.g., unknown client, no client
 * authentication included, or unsupported authentication method).
 */
export class InvalidClientError extends OAuthError {
}
/**
 * Invalid grant error - The provided authorization grant or refresh token is
 * invalid, expired, revoked, does not match the redirection URI used in the
 * authorization request, or was issued to another client.
 */
export class InvalidGrantError extends OAuthError {
}
/**
 * Unauthorized client error - The authenticated client is not authorized to use
 * this authorization grant type.
 */
export class UnauthorizedClientError extends OAuthError {
}
/**
 * Unsupported grant type error - The authorization grant type is not supported
 * by the authorization server.
 */
export class UnsupportedGrantTypeError extends OAuthError {
}
/**
 * Invalid scope error - The requested scope is invalid, unknown, malformed, or
 * exceeds the scope granted by the resource owner.
 */
export class InvalidScopeError extends OAuthError {
}
/**
 * Access denied error - The resource owner or authorization server denied the request.
 */
export class AccessDeniedError extends OAuthError {
}
/**
 * Server error - The authorization server encountered an unexpected condition
 * that prevented it from fulfilling the request.
 */
export class ServerError extends OAuthError {
}
/**
 * Temporarily unavailable error - The authorization server is currently unable to
 * handle the request due to a temporary overloading or maintenance of the server.
 */
export class TemporarilyUnavailableError extends OAuthError {
}
/**
 * Unsupported response type error - The authorization server does not support
 * obtaining an authorization code using this method.
 */
export class UnsupportedResponseTypeError extends OAuthError {
}
/**
 * Unsupported token type error - The authorization server does not support
 * the requested token type.
 */
export class UnsupportedTokenTypeError extends OAuthError {
}
/**
 * Invalid token error - The access token provided is expired, revoked, malformed,
 * or invalid for other reasons.
 */
export class InvalidTokenError extends OAuthError {
}
/**
 * Method not allowed error - The HTTP method used is not allowed for this endpoint.
 * (Custom, non-standard error)
 */
export class MethodNotAllowedError extends OAuthError {
}
/**
 * Too many requests error - Rate limit exceeded.
 * (Custom, non-standard error based on RFC 6585)
 */
export class TooManyRequestsError extends OAuthError {
}
/**
 * Invalid client metadata error - The client metadata is invalid.
 * (Custom error for dynamic client registration - RFC 7591)
 */
export class InvalidClientMetadataError extends OAuthError {
}
/**
 * Insufficient scope error - The request requires higher privileges than provided by the access token.
 */
export class InsufficientScopeError extends OAuthError {
}
/**
 * A utility class for defining one-off error codes
 */
export class CustomOAuthError extends OAuthError {
    /**
     * @param customErrorCode - Custom error code
     * @param message - Error message
     * @param [errorUri] - Optional error URI
     */
    constructor(customErrorCode: string, message: string, errorUri?: string);
    #private;
}
/**
 * A full list of all OAuthErrors, enabling parsing from error responses
 */
export const OAUTH_ERRORS: {
    [InvalidRequestError.errorCode]: typeof InvalidRequestError;
    [InvalidClientError.errorCode]: typeof InvalidClientError;
    [InvalidGrantError.errorCode]: typeof InvalidGrantError;
    [UnauthorizedClientError.errorCode]: typeof UnauthorizedClientError;
    [UnsupportedGrantTypeError.errorCode]: typeof UnsupportedGrantTypeError;
    [InvalidScopeError.errorCode]: typeof InvalidScopeError;
    [AccessDeniedError.errorCode]: typeof AccessDeniedError;
    [ServerError.errorCode]: typeof ServerError;
    [TemporarilyUnavailableError.errorCode]: typeof TemporarilyUnavailableError;
    [UnsupportedResponseTypeError.errorCode]: typeof UnsupportedResponseTypeError;
    [UnsupportedTokenTypeError.errorCode]: typeof UnsupportedTokenTypeError;
    [InvalidTokenError.errorCode]: typeof InvalidTokenError;
    [MethodNotAllowedError.errorCode]: typeof MethodNotAllowedError;
    [TooManyRequestsError.errorCode]: typeof TooManyRequestsError;
    [InvalidClientMetadataError.errorCode]: typeof InvalidClientMetadataError;
    [InsufficientScopeError.errorCode]: typeof InsufficientScopeError;
};
export type OAuthErrorResponse = {
    /**
     * - The error code
     */
    error: string;
    /**
     * - Human-readable error description
     */
    error_description?: string | undefined;
    /**
     * - URI with error information
     */
    error_uri?: string | undefined;
    /**
     * - State parameter from request
     */
    state?: string | undefined;
};
//# sourceMappingURL=errors.d.ts.map