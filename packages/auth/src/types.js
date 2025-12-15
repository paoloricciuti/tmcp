/**
 * @typedef {Object} AuthInfo
 * @property {string} token - The access token
 * @property {string} clientId - The client ID associated with this token
 * @property {string[]} scopes - Scopes associated with this token
 * @property {number} [expiresAt] - When the token expires (in seconds since epoch)
 * @property {URL} [resource] - The RFC 8707 resource server identifier
 * @property {Record<string, unknown>} [extra] - Additional data associated with the token
 */

/**
 * @typedef {Object} AuthorizationParams
 * @property {string} [state] - OAuth state parameter
 * @property {string[]} [scopes] - Requested scopes
 * @property {string} codeChallenge - PKCE code challenge
 * @property {string} redirectUri - Redirect URI
 * @property {URL} [resource] - Resource parameter
 */

/**
 * @typedef {Object} OAuthTokens
 * @property {string} access_token - The access token
 * @property {string} token_type - Token type (usually 'Bearer')
 * @property {number} [expires_in] - Token expiry in seconds
 * @property {string} [refresh_token] - Refresh token
 * @property {string} [scope] - Granted scopes
 * @property {string} [id_token] - ID token (OpenID Connect)
 */

/**
 * @typedef {Object} OAuthTokenRevocationRequest
 * @property {string} token - The token to revoke
 * @property {string} [token_type_hint] - Hint about token type
 */

/**
 * @typedef {Object} OAuthClientInformationFull
 * @property {string} client_id - Unique client identifier
 * @property {string} [client_secret] - Client secret (for confidential clients)
 * @property {number} [client_id_issued_at] - When client ID was issued
 * @property {number} [client_secret_expires_at] - When client secret expires (0 = never)
 * @property {string[]} redirect_uris - Registered redirect URIs
 * @property {string} [token_endpoint_auth_method] - Token endpoint auth method
 * @property {string[]} [grant_types] - Registered grant types
 * @property {string[]} [response_types] - Registered response types
 * @property {string} [client_name] - Human-readable client name
 * @property {string} [client_uri] - Client information URI
 * @property {string} [logo_uri] - Client logo URI
 * @property {string} [scope] - Client's registered scopes
 * @property {string[]} [contacts] - Contact information
 * @property {string} [tos_uri] - Terms of service URI
 * @property {string} [policy_uri] - Privacy policy URI
 * @property {string} [jwks_uri] - Client's JSON Web Key Set URI
 * @property {string} [software_id] - Software identifier
 * @property {string} [software_version] - Software version
 */

/**
 * @typedef {Object} OAuthClientMetadata
 * @property {string[]} redirect_uris - Redirect URIs for the client
 * @property {string[]} [response_types] - Response types the client will use
 * @property {string[]} [grant_types] - Grant types the client will use
 * @property {string} [application_type] - Application type (web, native)
 * @property {string[]} [contacts] - Contact information for the client
 * @property {string} [client_name] - Human-readable client name
 * @property {string} [logo_uri] - URI to client logo
 * @property {string} [client_uri] - URI to client information page
 * @property {string} [policy_uri] - URI to privacy policy
 * @property {string} [tos_uri] - URI to terms of service
 * @property {string} [jwks_uri] - URI to client's JSON Web Key Set
 * @property {string} [sector_identifier_uri] - Sector identifier URI
 * @property {string} [subject_type] - Subject identifier type
 * @property {string} [token_endpoint_auth_method] - Token endpoint authentication method
 * @property {string} [scope] - Scope values the client requests
 * @property {string} [software_id] - Software identifier
 * @property {string} [software_version] - Software version
 */

/**
 * @typedef {Object} OAuthMetadata
 * @property {string} issuer - Authorization server issuer identifier
 * @property {string} authorization_endpoint - Authorization endpoint URL
 * @property {string} token_endpoint - Token endpoint URL
 * @property {string} [registration_endpoint] - Dynamic client registration endpoint
 * @property {string} [revocation_endpoint] - Token revocation endpoint
 * @property {string[]} response_types_supported - Supported response types
 * @property {string[]} [grant_types_supported] - Supported grant types
 * @property {string[]} [scopes_supported] - Supported scopes
 * @property {string[]} [code_challenge_methods_supported] - Supported PKCE methods
 * @property {string[]} [token_endpoint_auth_methods_supported] - Supported auth methods
 * @property {string[]} [revocation_endpoint_auth_methods_supported] - Revocation auth methods
 * @property {string} [service_documentation] - Service documentation URL
 */

/**
 * @typedef {Object} OAuthProtectedResourceMetadata
 * @property {string} resource - Protected resource identifier
 * @property {string[]} [authorization_servers] - Authorization server issuer identifiers
 * @property {string[]} [scopes_supported] - Supported scopes for this resource
 * @property {string[]} [bearer_methods_supported] - Supported bearer token methods
 * @property {string} [resource_name] - Human-readable resource name
 * @property {string} [resource_documentation] - URL with resource documentation
 * @property {string} [jwks_uri] - JSON Web Key Set URI for token validation
 * @property {boolean} [tls_client_certificate_bound_access_tokens] - mTLS token binding
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} max - Maximum requests per window
 */

export {};
