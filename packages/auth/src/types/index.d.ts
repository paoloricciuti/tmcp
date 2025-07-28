declare module '@tmcp/auth' {
    import * as v from 'valibot';
    /**
     * Main OAuth Provider class that handles OAuth 2.1 requests using Web Request/Response APIs
     */
    export class OAuthProvider {
        /**
         * @param config - OAuth provider configuration
         */
        constructor(config: OAuthProviderConfig);
        /**
         * Routes an OAuth request to the appropriate handler method.
         * Returns null if the request is not for this provider.
         *
         * @param request - The HTTP request to handle
         * @returns HTTP response or null if not handled
         */
        respond(request: Request): Promise<Response | null>;
        #private;
    }
    type OAuthProviderConfig = {
        /**
         * - OAuth server provider implementation
         */
        provider: OAuthServerProvider;
        /**
         * - Issuer URL (must be HTTPS except localhost)
         */
        issuerUrl: URL;
        /**
         * - Base URL if different from issuer
         */
        baseUrl?: URL | undefined;
        /**
         * - Documentation URL
         */
        serviceDocumentationUrl?: URL | undefined;
        /**
         * - Supported scopes
         */
        scopesSupported?: string[] | undefined;
        /**
         * - Human-readable resource name
         */
        resourceName?: string | undefined;
        /**
         * - Client secret expiry (default: 30 days)
         */
        clientSecretExpirySeconds?: number | undefined;
        /**
         * - Generate client IDs (default: true)
         */
        clientIdGeneration?: boolean | undefined;
        /**
         * - Rate limits per endpoint
         */
        rateLimits?: Record<string, RateLimitConfig> | undefined;
    };
    /**
     * Implements an OAuth server that proxies requests to another OAuth server.
     *
     */
    export class ProxyOAuthServerProvider implements OAuthServerProvider {
        /**
         * @param options - Proxy configuration
         */
        constructor(options: ProxyOptions);
        skipLocalPkceValidation: boolean;
        get clientStore(): OAuthRegisteredClientsStore;
        authorize(client: OAuthClientInformationFull, params: AuthorizationParams): Promise<Response>;
        challengeForAuthorizationCode(_client: OAuthClientInformationFull, _authorization_code: string): Promise<string>;
        exchangeAuthorizationCode(client: OAuthClientInformationFull, authorization_code: string, code_verifier?: string, redirect_uri?: string, resource?: URL): Promise<OAuthTokens>;
        exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[], resource?: URL): Promise<OAuthTokens>;
        verifyAccessToken(token: string): Promise<AuthInfo>;
        revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void>;
        #private;
    }
    type ProxyEndpoints = {
        /**
         * - Authorization endpoint URL
         */
        authorizationUrl: string;
        /**
         * - Token endpoint URL
         */
        tokenUrl: string;
        /**
         * - Token revocation endpoint URL
         */
        revocationUrl?: string | undefined;
        /**
         * - Client registration endpoint URL
         */
        registrationUrl?: string | undefined;
    };
    type ProxyOptions = {
        /**
         * - Individual endpoint URLs for proxying OAuth operations
         */
        endpoints: ProxyEndpoints;
        /**
         * - Function to verify access tokens and return auth info
         */
        verifyAccessToken: (arg0: string) => Promise<AuthInfo>;
        /**
         * - Function to fetch client information
         */
        getClient: (arg0: string) => Promise<OAuthClientInformationFull | undefined>;
        /**
         * - Custom fetch implementation
         */
        fetch?: typeof fetch | undefined;
    };
    /**
     * Convenience function to create a Bearer auth middleware-like function
     * @param options - Bearer auth configuration
     * @returns Authentication function
     */
    export function createBearerAuth(options: BearerAuthOptions): (arg0: Request) => Promise<BearerAuthResult>;
    /**
     * Bearer token authentication helper for Web Request/Response APIs
     */
    export class BearerAuth {
        /**
         * @param options - Bearer auth configuration
         */
        constructor(options: BearerAuthOptions);
        /**
         * Authenticates a request with Bearer token
         * @param request - The HTTP request to authenticate
         * @returns Authentication result
         */
        authenticate(request: Request): Promise<BearerAuthResult>;
        #private;
    }
    type BearerAuthOptions = {
        /**
         * - A provider used to verify tokens
         */
        verifier: OAuthTokenVerifier;
        /**
         * - Optional scopes that the token must have
         */
        requiredScopes?: string[] | undefined;
        /**
         * - Optional resource metadata URL to include in WWW-Authenticate header
         */
        resourceMetadataUrl?: string | undefined;
    };
    type BearerAuthResult = {
        /**
         * - Whether authentication was successful
         */
        success: boolean;
        /**
         * - Auth info if successful
         */
        authInfo?: AuthInfo | undefined;
        /**
         * - Error response if unsuccessful
         */
        errorResponse?: Response | undefined;
    };
    /**
     * Base class for all OAuth errors
     */
    export class OAuthError extends Error {
        static errorCode: string;
        /**
         * @param message - Error message
         * @param errorUri - Optional error URI
         */
        constructor(message: string, errorUri?: string);
        errorUri: string | undefined;
        /**
         * Get the error code for this error type
         * */
        get errorCode(): string;
        /**
         * Converts the error to a standard OAuth error response object
         * */
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
         * @param errorUri - Optional error URI
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
    type OAuthErrorResponse = {
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
    /**
     * Schema for OAuth client metadata during registration
     */
    export const OAuthClientMetadataSchema: v.ObjectSchema<{
        readonly redirect_uris: v.SchemaWithPipe<readonly [
            v.ArraySchema<v.SchemaWithPipe<readonly [
                v.StringSchema<undefined>,
                v.UrlAction<string, undefined>
            ]>, undefined>,
            v.MinLengthAction<string[], 1, "At least one redirect URI is required">
        ]>;
        readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        readonly application_type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.EmailAction<string, undefined>
        ]>, undefined>, undefined>;
        readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly sector_identifier_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly subject_type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly software_id: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly software_version: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Schema for full OAuth client information
     */
    export const OAuthClientInformationFullSchema: v.ObjectSchema<{
        readonly client_id: v.StringSchema<undefined>;
        readonly client_secret: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly client_id_issued_at: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        readonly client_secret_expires_at: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        readonly redirect_uris: v.ArraySchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
        readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.EmailAction<string, undefined>
        ]>, undefined>, undefined>;
        readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
        readonly software_id: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly software_version: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Schema for OAuth token response
     */
    export const OAuthTokensSchema: v.ObjectSchema<{
        readonly access_token: v.StringSchema<undefined>;
        readonly token_type: v.StringSchema<undefined>;
        readonly expires_in: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
        readonly refresh_token: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly id_token: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Schema for token revocation request
     */
    export const OAuthTokenRevocationRequestSchema: v.ObjectSchema<{
        readonly token: v.StringSchema<undefined>;
        readonly token_type_hint: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Schema for client authentication request
     */
    export const ClientAuthenticatedRequestSchema: v.ObjectSchema<{
        readonly client_id: v.StringSchema<undefined>;
        readonly client_secret: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Schema for authorization request parameters (client validation phase)
     */
    export const ClientAuthorizationParamsSchema: v.ObjectSchema<{
        readonly client_id: v.StringSchema<undefined>;
        readonly redirect_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
    }, undefined>;
    /**
     * Schema for authorization request parameters (request validation phase)
     */
    export const RequestAuthorizationParamsSchema: v.ObjectSchema<{
        readonly response_type: v.LiteralSchema<"code", undefined>;
        readonly code_challenge: v.StringSchema<undefined>;
        readonly code_challenge_method: v.LiteralSchema<"S256", undefined>;
        readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly state: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
    }, undefined>;
    /**
     * Schema for token request
     */
    export const TokenRequestSchema: v.ObjectSchema<{
        readonly grant_type: v.StringSchema<undefined>;
    }, undefined>;
    /**
     * Schema for authorization code grant
     */
    export const AuthorizationCodeGrantSchema: v.ObjectSchema<{
        readonly code: v.StringSchema<undefined>;
        readonly code_verifier: v.StringSchema<undefined>;
        readonly redirect_uri: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
    }, undefined>;
    /**
     * Schema for refresh token grant
     */
    export const RefreshTokenGrantSchema: v.ObjectSchema<{
        readonly refresh_token: v.StringSchema<undefined>;
        readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [
            v.StringSchema<undefined>,
            v.UrlAction<string, undefined>
        ]>, undefined>;
    }, undefined>;
    /**
     * Schema for OAuth error response
     */
    export const OAuthErrorResponseSchema: v.ObjectSchema<{
        readonly error: v.StringSchema<undefined>;
        readonly error_description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly error_uri: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly state: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    }, undefined>;
    /**
     * Implements an end-to-end OAuth server.
     */
    interface OAuthServerProvider {
        /**
         * A store used to read information about registered OAuth clients.
         */
        get clientStore(): OAuthRegisteredClientsStore;
        /**
         * Begins the authorization flow, which can either be implemented by this server itself or via redirection to a separate authorization server.
         *
         * This server must eventually issue a redirect with an authorization response or an error response to the given redirect URI. Per OAuth 2.1:
         * - In the successful case, the redirect MUST include the `code` and `state` (if present) query parameters.
         * - In the error case, the redirect MUST include the `error` query parameter, and MAY include an optional `error_description` query parameter.
         */
        authorize(client: OAuthClientInformationFull, params: AuthorizationParams): Promise<Response>;
        /**
         * Returns the `codeChallenge` that was used when the indicated authorization began.
         */
        challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string>;
        /**
         * Exchanges an authorization code for an access token.
         */
        exchangeAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string, codeVerifier?: string, redirectUri?: string, resource?: URL): Promise<OAuthTokens>;
        /**
         * Exchanges a refresh token for an access token.
         */
        exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[], resource?: URL): Promise<OAuthTokens>;
        /**
         * Verifies an access token and returns information about it.
         */
        verifyAccessToken(token: string): Promise<AuthInfo>;
        /**
         * Revokes an access or refresh token. If unimplemented, token revocation is not supported (not recommended).
         *
         * If the given token is invalid or already revoked, this method should do nothing.
         */
        revokeToken?(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void>;
        /**
         * Whether to skip local PKCE validation.
         *
         * If true, the server will not perform PKCE validation locally and will pass the code_verifier to the upstream server.
         *
         * NOTE: This should only be true if the upstream server is performing the actual PKCE validation.
         */
        skipLocalPkceValidation?: boolean;
    }
    /**
     * Stores information about registered OAuth clients for this server.
     */
    interface OAuthRegisteredClientsStore {
        /**
         * Returns information about a registered client, based on its ID.
         */
        getClient(clientId: string): OAuthClientInformationFull | undefined | Promise<OAuthClientInformationFull | undefined>;
        /**
         * Registers a new client with the server. The client ID and secret will be automatically generated by the library. A modified version of the client information can be returned to reflect specific values enforced by the server.
         *
         * NOTE: Implementations should NOT delete expired client secrets in-place. Auth middleware provided by this library will automatically check the `client_secret_expires_at` field and reject requests with expired secrets. Any custom logic for authenticating clients should check the `client_secret_expires_at` field as well.
         *
         * If unimplemented, dynamic client registration is unsupported.
         */
        registerClient?(client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">): OAuthClientInformationFull | Promise<OAuthClientInformationFull>;
    }
    /**
     * Slim implementation useful for token verification
     */
    interface OAuthTokenVerifier {
        /**
         * Verifies an access token and returns information about it.
         */
        verifyAccessToken(token: string): Promise<AuthInfo>;
    }
    type AuthInfo = {
        /**
         * - The access token
         */
        token: string;
        /**
         * - The client ID associated with this token
         */
        clientId: string;
        /**
         * - Scopes associated with this token
         */
        scopes: string[];
        /**
         * - When the token expires (in seconds since epoch)
         */
        expiresAt?: number | undefined;
        /**
         * - The RFC 8707 resource server identifier
         */
        resource?: URL | undefined;
        /**
         * - Additional data associated with the token
         */
        extra?: Record<string, unknown> | undefined;
    };
    type AuthorizationParams = {
        /**
         * - OAuth state parameter
         */
        state?: string | undefined;
        /**
         * - Requested scopes
         */
        scopes?: string[] | undefined;
        /**
         * - PKCE code challenge
         */
        codeChallenge: string;
        /**
         * - Redirect URI
         */
        redirectUri: string;
        /**
         * - Resource parameter
         */
        resource?: URL | undefined;
    };
    type OAuthTokens = {
        /**
         * - The access token
         */
        access_token: string;
        /**
         * - Token type (usually 'Bearer')
         */
        token_type: string;
        /**
         * - Token expiry in seconds
         */
        expires_in?: number | undefined;
        /**
         * - Refresh token
         */
        refresh_token?: string | undefined;
        /**
         * - Granted scopes
         */
        scope?: string | undefined;
        /**
         * - ID token (OpenID Connect)
         */
        id_token?: string | undefined;
    };
    type OAuthTokenRevocationRequest = {
        /**
         * - The token to revoke
         */
        token: string;
        /**
         * - Hint about token type
         */
        token_type_hint?: string | undefined;
    };
    type OAuthClientInformationFull = {
        /**
         * - Unique client identifier
         */
        client_id: string;
        /**
         * - Client secret (for confidential clients)
         */
        client_secret?: string | undefined;
        /**
         * - When client ID was issued
         */
        client_id_issued_at?: number | undefined;
        /**
         * - When client secret expires (0 = never)
         */
        client_secret_expires_at?: number | undefined;
        /**
         * - Registered redirect URIs
         */
        redirect_uris: string[];
        /**
         * - Token endpoint auth method
         */
        token_endpoint_auth_method?: string | undefined;
        /**
         * - Registered grant types
         */
        grant_types?: string[] | undefined;
        /**
         * - Registered response types
         */
        response_types?: string[] | undefined;
        /**
         * - Human-readable client name
         */
        client_name?: string | undefined;
        /**
         * - Client information URI
         */
        client_uri?: string | undefined;
        /**
         * - Client logo URI
         */
        logo_uri?: string | undefined;
        /**
         * - Client's registered scopes
         */
        scope?: string | undefined;
        /**
         * - Contact information
         */
        contacts?: string[] | undefined;
        /**
         * - Terms of service URI
         */
        tos_uri?: string | undefined;
        /**
         * - Privacy policy URI
         */
        policy_uri?: string | undefined;
        /**
         * - Client's JSON Web Key Set URI
         */
        jwks_uri?: string | undefined;
        /**
         * - Software identifier
         */
        software_id?: string | undefined;
        /**
         * - Software version
         */
        software_version?: string | undefined;
    };
    type RateLimitConfig = {
        /**
         * - Time window in milliseconds
         */
        windowMs: number;
        /**
         * - Maximum requests per window
         */
        max: number;
    };
    export {};
}
//# sourceMappingURL=index.d.ts.map
