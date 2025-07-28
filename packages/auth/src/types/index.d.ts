declare module '@tmcp/auth' {
    /**
     * @import { TokenPayload, AuthorizationServerMetadata, ProtectedResourceMetadata, ClientRegistrationRequest, ClientRegistrationResponse } from './types.js';
     */
    /**
     * Abstract base class for OAuth 2.1 helpers that can be extended by users
     * to provide custom OAuth implementations for MCP authorization.
     *
     * This class defines the interface that transport layers will use to handle
     * OAuth 2.1 authorization according to the MCP specification.
     *
     * @abstract
     */
    export abstract class OAuthProvider {
        /**
         * Validates an access token and returns the token payload.
         * This method should validate the token signature, expiration, audience, etc.
         *
         * @param token - The Bearer token to validate
         * @param resource_id - The resource identifier for audience validation
         * @returns The validated token payload
         * @abstract
         */
        abstract validate(token: string, resource_id: string): Promise<TokenPayload>;
        /**
         * Returns OAuth 2.0 Authorization Server Metadata per RFC8414.
         * This endpoint should be available at /.well-known/oauth-authorization-server
         *
         * @param request - The HTTP request for metadata
         * @returns Authorization server metadata
         * @abstract
         */
        abstract getAuthorizationMetadata(request: Request): Promise<AuthorizationServerMetadata>;
        /**
         * Returns OAuth 2.0 Protected Resource Metadata per RFC9728.
         * This endpoint should be available at /.well-known/oauth-protected-resource
         *
         * @param request - The HTTP request for metadata
         * @returns Protected resource metadata
         * @abstract
         */
        abstract getResourceMetadata(request: Request): Promise<ProtectedResourceMetadata>;
        /**
         * Handles dynamic client registration per RFC7591.
         * This method should register a new OAuth client and return the client credentials.
         *
         * @param request - The HTTP request containing client registration data
         * @returns Client registration response
         * @abstract
         */
        abstract register(request: Request): Promise<ClientRegistrationResponse>;
        /**
         * Handles OAuth 2.1 authorization requests.
         * This method should validate the authorization request and either redirect
         * to the authorization page or return an error.
         *
         * @param request - The HTTP authorization request
         * @returns HTTP response (usually a redirect)
         * @abstract
         */
        abstract authorize(request: Request): Promise<Response>;
        /**
         * Handles OAuth 2.1 token requests.
         * This method should validate the token request and return access tokens.
         *
         * @param request - The HTTP token request
         * @returns HTTP response with token or error
         * @abstract
         */
        abstract token(request: Request): Promise<Response>;
        /**
         * Routes an OAuth request to the appropriate handler method.
         * This is called by transport layers when should_handle returns true.
         *
         * @param request - The HTTP request to handle
         * @returns HTTP response
         */
        respond(request: Request): Promise<Response | null>;
        #private;
    }
    /**
     * Complete OAuth 2.1 implementation with MCP specification compliance.
     * This class provides a full-featured OAuth 2.1 authorization server and resource server
     * that can be used out of the box or extended for custom implementations
     *
     */
    export class DefaultOAuthProvider extends OAuthProvider implements OAuthProvider {
        /**
         * @param config - OAuth configuration
         */
        constructor(config: OAuthConfig);
        /**
         * Returns OAuth 2.0 Authorization Server Metadata per RFC8414.
         * @returns Authorization server metadata
         */
        getAuthorizationMetadata(): Promise<AuthorizationServerMetadata>;
        /**
         * Returns OAuth 2.0 Protected Resource Metadata per RFC9728.
         * @returns Protected resource metadata
         */
        getResourceMetadata(): Promise<ProtectedResourceMetadata>;
        #private;
    }
    /**
     * Token payload returned after successful token validation
     */
    export type TokenPayload = {
        /**
         * - Subject identifier (user ID)
         */
        sub: string;
        /**
         * - Space-separated list of scopes
         */
        scope?: string | undefined;
        /**
         * - Audience(s) for the token
         */
        aud?: string[] | undefined;
        /**
         * - Token issuer
         */
        iss?: string | undefined;
        /**
         * - Expiration time (Unix timestamp)
         */
        exp?: number | undefined;
        /**
         * - Issued at time (Unix timestamp)
         */
        iat?: number | undefined;
        /**
         * - Client identifier
         */
        client_id?: string | undefined;
        /**
         * - Additional token claims
         */
        claims?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * OAuth 2.0 Authorization Server Metadata per RFC8414
     */
    export type AuthorizationServerMetadata = {
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
        token_endpoint?: string | undefined;
        /**
         * - Dynamic client registration endpoint
         */
        registration_endpoint?: string | undefined;
        /**
         * - JSON Web Key Set URI
         */
        jwks_uri?: string | undefined;
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
         * - Request URI registration requirement
         */
        require_request_uri_registration?: boolean | undefined;
        /**
         * - Additional metadata fields
         */
        additionalMetadata?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * OAuth 2.0 Protected Resource Metadata per RFC9728
     */
    export type ProtectedResourceMetadata = {
        /**
         * - Protected resource identifier
         */
        resource: string;
        /**
         * - List of authorization server issuer identifiers
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
         * - mTLS token binding support
         */
        tls_client_certificate_bound_access_tokens?: boolean | undefined;
        /**
         * - Additional metadata fields
         */
        additionalMetadata?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * Dynamic client registration request per RFC7591
     */
    export type ClientRegistrationRequest = {
        /**
         * - Redirect URIs for the client
         */
        redirect_uris?: string[] | undefined;
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
         * - Sector identifier URI for pairwise identifiers
         */
        sector_identifier_uri?: string | undefined;
        /**
         * - Subject identifier type (public, pairwise)
         */
        subject_type?: string | undefined;
        /**
         * - Token endpoint authentication method
         */
        token_endpoint_auth_method?: string | undefined;
        /**
         * - Scope values the client requests
         */
        scope?: string[] | undefined;
        /**
         * - Additional registration fields
         */
        additionalFields?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * Dynamic client registration response per RFC7591
     */
    export type ClientRegistrationResponse = {
        /**
         * - Unique client identifier
         */
        client_id: string;
        /**
         * - Client secret (for confidential clients)
         */
        client_secret?: string | undefined;
        /**
         * - Time client identifier was issued
         */
        client_id_issued_at?: number | undefined;
        /**
         * - Time client secret expires (0 = never)
         */
        client_secret_expires_at?: number | undefined;
        /**
         * - Registered redirect URIs
         */
        redirect_uris?: string[] | undefined;
        /**
         * - Registered response types
         */
        response_types?: string[] | undefined;
        /**
         * - Registered grant types
         */
        grant_types?: string[] | undefined;
        /**
         * - Application type
         */
        application_type?: string | undefined;
        /**
         * - Contact information
         */
        contacts?: string[] | undefined;
        /**
         * - Client name
         */
        client_name?: string | undefined;
        /**
         * - Logo URI
         */
        logo_uri?: string | undefined;
        /**
         * - Client information URI
         */
        client_uri?: string | undefined;
        /**
         * - Privacy policy URI
         */
        policy_uri?: string | undefined;
        /**
         * - Terms of service URI
         */
        tos_uri?: string | undefined;
        /**
         * - Client JWKS URI
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
         * - Token endpoint auth method
         */
        token_endpoint_auth_method?: string | undefined;
        /**
         * - Registration access token
         */
        registration_access_token?: string | undefined;
        /**
         * - Registration client URI
         */
        registration_client_uri?: string | undefined;
        /**
         * - Additional response fields
         */
        additionalFields?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * OAuth 2.1 configuration for DefaultOAuthHelper
     */
    export type OAuthConfig = {
        /**
         * - OAuth issuer identifier
         */
        issuer: string;
        /**
         * - MCP resource identifier
         */
        resourceId: string;
        /**
         * - Authorization endpoint URL
         */
        authorizationEndpoint: string;
        /**
         * - Token endpoint URL
         */
        tokenEndpoint: string;
        /**
         * - Pre-registered client ID
         */
        clientId?: string | undefined;
        /**
         * - Client secret (for confidential clients)
         */
        clientSecret?: string | undefined;
        /**
         * - JWKS endpoint for token validation
         */
        jwksUri?: string | undefined;
        /**
         * - Supported scopes
         */
        scopes?: string[] | undefined;
        /**
         * - Token expiry in seconds (default: 3600)
         */
        tokenExpiry?: number | undefined;
        /**
         * - Enable dynamic client registration
         */
        enableDynamicRegistration?: boolean | undefined;
        /**
         * - Allowed redirect URIs for registration
         */
        allowedRedirectUris?: string[] | undefined;
        /**
         * - Dynamic client registration endpoint
         */
        registrationEndpoint?: string | undefined;
        /**
         * - Additional configuration
         */
        additionalConfig?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * OAuth error response
     */
    export type OAuthError = {
        /**
         * - Error code
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
     * Authorization request parameters
     */
    export type AuthorizationRequest = {
        /**
         * - OAuth response type (usually 'code')
         */
        response_type: string;
        /**
         * - Client identifier
         */
        client_id: string;
        /**
         * - Redirect URI
         */
        redirect_uri?: string | undefined;
        /**
         * - Requested scopes
         */
        scope?: string | undefined;
        /**
         * - State parameter for CSRF protection
         */
        state?: string | undefined;
        /**
         * - PKCE code challenge
         */
        code_challenge?: string | undefined;
        /**
         * - PKCE challenge method
         */
        code_challenge_method?: string | undefined;
        /**
         * - MCP resource parameter
         */
        resource?: string | undefined;
        /**
         * - Additional parameters
         */
        additionalParams?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * Token request parameters
     */
    export type TokenRequest = {
        /**
         * - Grant type (usually 'authorization_code')
         */
        grant_type: string;
        /**
         * - Authorization code
         */
        code?: string | undefined;
        /**
         * - Redirect URI
         */
        redirect_uri?: string | undefined;
        /**
         * - Client identifier
         */
        client_id?: string | undefined;
        /**
         * - Client secret
         */
        client_secret?: string | undefined;
        /**
         * - PKCE code verifier
         */
        code_verifier?: string | undefined;
        /**
         * - MCP resource parameter
         */
        resource?: string | undefined;
        /**
         * - Additional parameters
         */
        additionalParams?: {
            [x: string]: any;
        } | undefined;
    };
    /**
     * Token response
     */
    export type TokenResponse = {
        /**
         * - Access token
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
         * - Additional response fields
         */
        additionalFields?: {
            [x: string]: any;
        } | undefined;
    };
    export {};
}
//# sourceMappingURL=index.d.ts.map
