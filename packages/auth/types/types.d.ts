export type AuthInfo = {
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
export type AuthorizationParams = {
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
export type OAuthTokens = {
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
export type OAuthTokenRevocationRequest = {
    /**
     * - The token to revoke
     */
    token: string;
    /**
     * - Hint about token type
     */
    token_type_hint?: string | undefined;
};
export type OAuthClientInformationFull = {
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
export type OAuthClientMetadata = {
    /**
     * - Redirect URIs for the client
     */
    redirect_uris: string[];
    /**
     * - Response types the client will use
     */
    response_types?: string[] | undefined;
    /**
     * - Grant types the client will use
     */
    grant_types?: string[] | undefined;
    /**
     * - Application type (web, native)
     */
    application_type?: string | undefined;
    /**
     * - Contact information for the client
     */
    contacts?: string[] | undefined;
    /**
     * - Human-readable client name
     */
    client_name?: string | undefined;
    /**
     * - URI to client logo
     */
    logo_uri?: string | undefined;
    /**
     * - URI to client information page
     */
    client_uri?: string | undefined;
    /**
     * - URI to privacy policy
     */
    policy_uri?: string | undefined;
    /**
     * - URI to terms of service
     */
    tos_uri?: string | undefined;
    /**
     * - URI to client's JSON Web Key Set
     */
    jwks_uri?: string | undefined;
    /**
     * - Sector identifier URI
     */
    sector_identifier_uri?: string | undefined;
    /**
     * - Subject identifier type
     */
    subject_type?: string | undefined;
    /**
     * - Token endpoint authentication method
     */
    token_endpoint_auth_method?: string | undefined;
    /**
     * - Scope values the client requests
     */
    scope?: string | undefined;
    /**
     * - Software identifier
     */
    software_id?: string | undefined;
    /**
     * - Software version
     */
    software_version?: string | undefined;
};
export type OAuthMetadata = {
    /**
     * - Authorization server issuer identifier
     */
    issuer: string;
    /**
     * - Authorization endpoint URL
     */
    authorization_endpoint: string;
    /**
     * - Token endpoint URL
     */
    token_endpoint: string;
    /**
     * - Dynamic client registration endpoint
     */
    registration_endpoint?: string | undefined;
    /**
     * - Token revocation endpoint
     */
    revocation_endpoint?: string | undefined;
    /**
     * - Supported response types
     */
    response_types_supported: string[];
    /**
     * - Supported grant types
     */
    grant_types_supported?: string[] | undefined;
    /**
     * - Supported scopes
     */
    scopes_supported?: string[] | undefined;
    /**
     * - Supported PKCE methods
     */
    code_challenge_methods_supported?: string[] | undefined;
    /**
     * - Supported auth methods
     */
    token_endpoint_auth_methods_supported?: string[] | undefined;
    /**
     * - Revocation auth methods
     */
    revocation_endpoint_auth_methods_supported?: string[] | undefined;
    /**
     * - Service documentation URL
     */
    service_documentation?: string | undefined;
    /**
     * - Client ID Metadata Document support
     */
    client_id_metadata_document_supported?: boolean | undefined;
};
export type OAuthProtectedResourceMetadata = {
    /**
     * - Protected resource identifier
     */
    resource: string;
    /**
     * - Authorization server issuer identifiers
     */
    authorization_servers?: string[] | undefined;
    /**
     * - Supported scopes for this resource
     */
    scopes_supported?: string[] | undefined;
    /**
     * - Supported bearer token methods
     */
    bearer_methods_supported?: string[] | undefined;
    /**
     * - Human-readable resource name
     */
    resource_name?: string | undefined;
    /**
     * - URL with resource documentation
     */
    resource_documentation?: string | undefined;
    /**
     * - JSON Web Key Set URI for token validation
     */
    jwks_uri?: string | undefined;
    /**
     * - mTLS token binding
     */
    tls_client_certificate_bound_access_tokens?: boolean | undefined;
};
export type RateLimitConfig = {
    /**
     * - Time window in milliseconds
     */
    windowMs: number;
    /**
     * - Maximum requests per window
     */
    max: number;
};
export type ExchangeAuthorizationCodeRequest = {
    /**
     * - Client information
     */
    client: OAuthClientInformationFull;
    /**
     * - Grant type
     */
    type: "authorization_code";
    /**
     * - Authorization code (for authorization_code grants)
     */
    code: string;
    /**
     * - PKCE code verifier (for authorization_code grants)
     */
    verifier?: string | undefined;
    /**
     * - Redirect URI (for authorization_code grants)
     */
    redirectUri?: string | undefined;
    /**
     * - Requested scopes
     */
    scopes?: string[] | undefined;
    /**
     * - Resource parameter
     */
    resource?: URL | undefined;
};
export type ExchangeRefreshTokenRequest = {
    /**
     * - Client information
     */
    client: OAuthClientInformationFull;
    /**
     * - Grant type
     */
    type: "refresh_token";
    /**
     * - Refresh token (for refresh_token grants)
     */
    refreshToken: string;
    /**
     * - Requested scopes
     */
    scopes?: string[] | undefined;
    /**
     * - Resource parameter
     */
    resource?: URL | undefined;
};
export type ExchangeRequest = ExchangeAuthorizationCodeRequest | ExchangeRefreshTokenRequest;
export type AuthorizeRequest = {
    /**
     * - Client information
     */
    client: OAuthClientInformationFull;
    /**
     * - Redirect URI
     */
    redirectUri: string;
    /**
     * - PKCE code challenge
     */
    codeChallenge?: string | undefined;
    /**
     * - OAuth state parameter
     */
    state?: string | undefined;
    /**
     * - Requested scopes
     */
    scopes?: string[] | undefined;
    /**
     * - Resource parameter
     */
    resource?: URL | undefined;
};
export type SimplifiedHandlers = {
    /**
     * - Handle authorization requests
     */
    authorize: (authorize_request: AuthorizeRequest, http_request: Request) => Promise<Response>;
    /**
     * - Handle token exchange
     */
    exchange: (request: ExchangeRequest, http_request: Request) => Promise<OAuthTokens>;
    /**
     * - Verify access tokens
     */
    verify: (token: string, http_request: Request) => Promise<AuthInfo>;
    /**
     * - Revoke tokens
     */
    revoke?: ((client: OAuthClientInformationFull, data: {
        token: string;
        tokenType?: string;
    }, http_request: Request) => Promise<void>) | undefined;
};
//# sourceMappingURL=types.d.ts.map