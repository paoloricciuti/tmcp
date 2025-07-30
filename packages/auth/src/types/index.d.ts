declare module '@tmcp/auth' {
	import * as v from 'valibot';
	/**
	 * @template {"you need to call `build` for the provider to take effect" | "built"} [T='you need to call `build` for the provider to take effect']
	 * Main OAuth provider class - handles OAuth 2.1 requests with a clean fluent API
	 */
	export class OAuth<T extends "you need to call `build` for the provider to take effect" | "built" = "you need to call `build` for the provider to take effect"> {
		/**
		 * Create a new OAuth builder instance
		 * @param issuerUrl - The OAuth issuer URL
		 * */
		static create(issuerUrl: string): OAuth;
		/**
		 * Static method to create OAuth from issuer URL
		 * @param issuerUrl - The OAuth issuer URL
		 * */
		static issuer(issuerUrl: string): OAuth;
		/**
		 * Create a new OAuth instance
		 * @param issuerUrl - The OAuth issuer URL
		 */
		constructor(issuerUrl: string);
		/**
		 * Set supported scopes
		 * @param scopes - Supported scopes
		 * */
		scopes(...scopes: string[]): OAuth<T>;
		/**
		 * Set OAuth handlers
		 * @param handlers - OAuth handlers
		 * */
		handlers(handlers: SimplifiedHandlers): OAuth<T>;
		/**
		 * Use in-memory client store with optional initial clients
		 * @param clients - Initial clients
		 * */
		memory(clients?: OAuthClientInformationFull[]): OAuth<T>;
		/**
		 * Use custom client store
		 * @param store - Custom client store
		 * */
		clients(store: OAuthRegisteredClientsStore): OAuth<T>;
		/**
		 * Configure OAuth features
		 * @param features - Feature configuration
		 * */
		features(features: FeatureConfig): OAuth<T>;
		/**
		 * Enable PKCE (enabled by default)
		 * @param get_code_challenge - A function that retrieves the original code challenge for a given authorization code
		 * */
		pkce(get_code_challenge: FeatureConfig["pkce"]): OAuth<T>;
		/**
		 * Configure bearer token authentication
		 * @param configtrue] - Bearer config
		 * */
		bearer(config?: boolean | string[] | BearerConfig): OAuth<T>;
		/**
		 * Configure CORS
		 * @param configtrue] - CORS config
		 * */
		cors(config?: boolean | CorsConfig): OAuth<T>;
		/**
		 * Enable dynamic client registration
		 * @param enabledtrue] - Whether to enable registration
		 * */
		registration(enabled?: boolean): OAuth<T>;
		/**
		 * Configure rate limiting
		 * @param limits - Rate limits
		 * */
		rateLimit(limits: Record<string, {
			windowMs: number;
			max: number;
		}>): OAuth<T>;
		/**
		 * Build the OAuth provider (same as this instance since we're standalone now)
		 * */
		build(): OAuth<"built">;
		
		verify(request: Request): Promise<AuthInfo | null>;
		/**
		 * Handle HTTP requests for OAuth endpoints
		 * @param request - HTTP request
		 * */
		respond(request: Request): Promise<Response | null>;
		
		[BUILT]: T;
		#private;
	}
	type ExchangeAuthorizationCodeRequest = {
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
		verifier: string;
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
	type ExchangeRefreshTokenRequest = {
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
	type ExchangeRequest = ExchangeAuthorizationCodeRequest | ExchangeRefreshTokenRequest;
	type AuthorizeRequest = {
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
		codeChallenge: string;
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
	type SimplifiedHandlers = {
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
	type Methods = "GET" | "POST";
	type BearerConfig = {
		/**
		 * - Required scopes for bearer token
		 */
		scopes?: string[] | undefined;
		/**
		 * - Resource URL for bearer token
		 */
		resourceUrl?: string | undefined;
		/**
		 * - Paths that require bearer token
		 */
		paths?: Partial<Record<Methods, string[]>> | undefined;
	};
	type FeatureConfig = {
		/**
		 * - Enable PKCE (it's also a function to retrieve the original code challenge for a given authorization code)
		 */
		pkce?: ((client: OAuthClientInformationFull, code: string) => Promise<string> | undefined) | undefined;
		/**
		 * - Bearer token config
		 */
		bearer?: boolean | BearerConfig | undefined;
		/**
		 * - CORS config
		 */
		cors?: boolean | CorsConfig | undefined;
		/**
		 * - Dynamic client registration
		 */
		registration?: boolean | undefined;
		/**
		 * - Rate limiting config
		 */
		rateLimits?: Record<string, {
			windowMs: number;
			max: number;
		}> | undefined;
	};
	type CorsConfig = {
		/**
		 * - Allowed origins
		 */
		origin?: string | string[] | undefined;
		/**
		 * - Allowed methods
		 */
		methods?: string[] | undefined;
		/**
		 * - Allowed headers
		 */
		allowedHeaders?: string[] | undefined;
		/**
		 * - Exposed headers
		 */
		exposedHeaders?: string[] | undefined;
		/**
		 * - Allow credentials
		 */
		credentials?: boolean | undefined;
		/**
		 * - Preflight cache duration
		 */
		maxAge?: number | undefined;
	};









	const BUILT: unique symbol;
	/**
	 * Helper class that provides OAuth handlers for proxying to an upstream OAuth server.
	 * Can be used with the OAuth fluent API or built directly into a complete OAuth instance.
	 *
	 * @example
	 * // Direct build approach (recommended)
	 * const proxy = new ProxyOAuthServerProvider({
	 *   endpoints: {
	 *     authorizationUrl: 'https://upstream.example.com/authorize',
	 *     tokenUrl: 'https://upstream.example.com/token',
	 *   },
	 *   verify: async (token) => { ... },
	 *   getClient: async (clientId) => { ... }
	 * });
	 *
	 * const auth = proxy.build('https://proxy.example.com', {
	 *   cors: true,
	 *   bearer: ['read', 'write'],
	 *   scopes: ['read', 'write', 'admin']
	 * });
	 *
	 * @example
	 * // Manual fluent API approach
	 * const auth = OAuth
	 *   .issuer('https://proxy.example.com')
	 *   .clients(proxy.clientStore)
	 *   .handlers(proxy.handlers())
	 *   .cors(true)
	 *   .build();
	 */
	export class ProxyOAuthServerProvider {
		/**
		 * @param options - Proxy configuration
		 */
		constructor(options: ProxyOptions);
		/**
		 * Get a client store that proxies requests to the upstream server
		 * */
		get clientStore(): OAuthRegisteredClientsStore;
		/**
		 * Get OAuth handlers for use with the new OAuth API
		 * */
		handlers(): SimplifiedHandlers;
		/**
		 * Build a complete OAuth instance with this proxy's configuration
		 * @param issuer_url - The OAuth issuer URL for this proxy server
		 * @param {Object} options - Optional configuration
		 * */
		build(issuer_url: string, options?: {
			cors?: boolean | CorsConfig | undefined;
			bearer?: boolean | string[] | BearerConfig | undefined;
			scopes?: string[] | undefined;
			registration?: boolean | undefined;
			rateLimits?: Record<string, {
				windowMs: number;
				max: number;
			}> | undefined;
		}): OAuth<"built">;
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
		verify: (token: string) => Promise<AuthInfo>;
		/**
		 * - Function to fetch client information
		 */
		getClient: (client_id: string) => Promise<OAuthClientInformationFull | undefined>;
		/**
		 * - Custom fetch implementation
		 */
		fetch?: typeof fetch | undefined;
	};
	/**
	 * Simple OAuth provider implementation for development and testing
	 * Provides a purely callback-based OAuth server with no default storage - all callbacks must be explicitly provided
	 *
	 * @example
	 * // Create with Map-based storage callbacks
	 * const clientsMap = new Map();
	 * const codesMap = new Map();
	 * const tokensMap = new Map();
	 * const refreshTokensMap = new Map();
	 *
	 * const provider = new SimpleProvider({
	 *   clients: {
	 *     get: (client_id) => clientsMap.get(client_id),
	 *     register: (client) => { clientsMap.set(client.client_id, client); return client; }
	 *   },
	 *   codes: {
	 *     store: (code, data) => { codesMap.set(code, data); },
	 *     get: (code) => codesMap.get(code),
	 *     delete: (code) => { codesMap.delete(code); }
	 *   },
	 *   tokens: {
	 *     store: (token, data) => { tokensMap.set(token, data); },
	 *     get: (token) => tokensMap.get(token),
	 *     delete: (token) => { tokensMap.delete(token); }
	 *   },
	 *   refresh_tokens: {
	 *     store: (token, data) => { refreshTokensMap.set(token, data); },
	 *     get: (token) => refreshTokensMap.get(token),
	 *     delete: (token) => { refreshTokensMap.delete(token); }
	 *   }
	 * });
	 *
	 * // Build complete OAuth instance
	 * const auth = provider.build('https://auth.example.com', {
	 *   cors: true,
	 *   bearer: {
	 * 		POST: ["/mcp"]
	 * 	 },
	 *   scopes: ['read', 'write', 'admin']
	 * });
	 *
	 * @example
	 * // Use with manual OAuth fluent API
	 * const auth = OAuth.issuer('https://auth.example.com')
	 *   .clients(provider.clientStore)
	 *   .handlers(provider.handlers())
	 *   .cors(true)
	 *   .build();
	 */
	export class SimpleProvider {
		/**
		 * Create a simple provider with pre-configured client - requires all storage callbacks to be provided
		 * @param client_id - Client ID
		 * @param client_secret - Client secret
		 * @param redirect_uris - Redirect URIs
		 * @param options - Required storage callbacks and additional options
		 * */
		static withClient(client_id: string, client_secret: string, redirect_uris: string[], options: SimpleProviderOptions): SimpleProvider;
		/**
		 * @param options - Provider options with required storage callbacks
		 */
		constructor(options: SimpleProviderOptions);
		/**
		 * Get the handlers for use with OAuth builder
		 * */
		handlers(): SimplifiedHandlers;
		/**
		 * Get a client store compatible with OAuth builder
		 * */
		get clientStore(): OAuthRegisteredClientsStore;
		/**
		 * Build a complete OAuth instance with this provider's configuration
		 * @param issuer_url - The OAuth issuer URL for this server
		 * @param {Object} options - Optional configuration
		 * */
		build(issuer_url: string, options?: {
			cors?: boolean | CorsConfig | undefined;
			bearer?: boolean | BearerConfig | undefined;
			scopes?: string[] | undefined;
			registration?: boolean | undefined;
			rateLimits?: Record<string, {
				windowMs: number;
				max: number;
			}> | undefined;
			pkce?: ((client: OAuthClientInformationFull, code: string) => Promise<string> | undefined) | undefined;
		}): OAuth<"built">;
		#private;
	}
	type CodeData = {
		/**
		 * - Client ID
		 */
		client_id: string;
		/**
		 * - Redirect URI
		 */
		redirect_uri: string;
		/**
		 * - PKCE code challenge
		 */
		code_challenge?: string | undefined;
		/**
		 * - PKCE code challenge method
		 */
		code_challenge_method?: string | undefined;
		/**
		 * - Expiration timestamp
		 */
		expires_at: number;
		/**
		 * - Requested scopes
		 */
		scopes: string[];
	};
	type TokenData = {
		client_id: string;
		scopes: string[];
		expires_at: number;
	} & ({
		kind: "new";
		code: string;
	} | {
		kind: "refresh";
		access_token: string;
	});
	type TokenDataOut = Omit<TokenData, "kind" | "code" | "access_token">;
	type RefreshTokenData = {
		client_id: string;
		scopes: string[];
		access_token: string;
	} & ({
		kind: "new";
		code: string;
	} | {
		kind: "refresh";
	});
	type RefreshTokenDataOut = Omit<RefreshTokenData, "kind" | "code">;
	type ClientCallbacks = {
		/**
		 * - Get client by ID
		 */
		get: (client_id: string) => Promise<OAuthClientInformationFull | undefined> | OAuthClientInformationFull | undefined;
		/**
		 * - Register new client
		 */
		register?: ((client_info: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">) => Promise<OAuthClientInformationFull> | OAuthClientInformationFull) | undefined;
	};
	type CodeCallbacks = {
		/**
		 * - the page the user should be redirected to in case it needs to login before authorizing, optional if you want to never redirect
		 */
		redirect?: ((request: Request) => Promise<string | null> | string | null) | undefined;
		/**
		 * - Store authorization code data
		 */
		store: (code: string, code_data: CodeData, request: Request) => Promise<void> | void;
		/**
		 * - Get authorization code data
		 */
		get: (code: string, request: Request) => Promise<CodeData | undefined> | CodeData | undefined;
		/**
		 * - Delete authorization code
		 */
		delete: (code: string, request: Request) => Promise<void> | void;
	};
	type TokenCallbacks = {
		/**
		 * - Generate the access token, optional if you want to generate it yourself
		 */
		generate?: ((token_data: TokenData, request: Request) => Promise<string | void> | string | void | void) | undefined;
		/**
		 * - Store access token data
		 */
		store: (token: string, token_data: TokenData, request: Request) => Promise<void> | void;
		/**
		 * - Get access token data
		 */
		get: (token: string, request: Request) => Promise<TokenDataOut | undefined> | TokenDataOut | undefined;
		/**
		 * - Delete access token
		 */
		delete: (token: string, request: Request) => Promise<void> | void;
	};
	type RefreshTokenCallbacks = {
		/**
		 * - Generate the refresh token, optional if you want to generate it yourself
		 */
		generate?: ((refresh_token_data: RefreshTokenData, request: Request) => Promise<string | void> | string | void) | undefined;
		/**
		 * - Store refresh token data
		 */
		store: (token: string, refresh_token_data: RefreshTokenData, request: Request) => Promise<void> | void;
		/**
		 * - Get refresh token data
		 */
		get: (token: string, request: Request) => Promise<RefreshTokenDataOut | undefined> | RefreshTokenDataOut | undefined;
		/**
		 * - Delete refresh token
		 */
		delete: (token: string, request: Request) => Promise<void> | void;
	};
	type SimpleProviderOptions = {
		/**
		 * - Client storage callbacks (required)
		 */
		clients: ClientCallbacks;
		/**
		 * - Authorization code storage callbacks (required)
		 */
		codes: CodeCallbacks;
		/**
		 * - Access token storage callbacks (required)
		 */
		tokens: TokenCallbacks;
		/**
		 * - Refresh token storage callbacks (required)
		 */
		refreshTokens: RefreshTokenCallbacks;
		/**
		 * - Token expiry in seconds
		 */
		tokenExpiry?: number | undefined;
	};
	/**
	 * @import { OAuthClientInformationFull } from './types.js'
	 * 
	 */
	/**
	 * Simple in-memory client store for development and testing
	 * 
	 */
	export class MemoryClientStore implements OAuthRegisteredClientsStore {
		/**
		 * @param initial_clients - Initial clients to store
		 */
		constructor(initial_clients?: OAuthClientInformationFull[]);
		/**
		 * Get client by ID
		 * @param client_id - Client ID
		 * */
		getClient(client_id: string): Promise<OAuthClientInformationFull | undefined>;
		/**
		 * Register a new client
		 * @param client - Client to register
		 * */
		registerClient(client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">): Promise<OAuthClientInformationFull>;
		/**
		 * Add a client directly (for testing/setup)
		 * @param client - Client to add
		 */
		addClient(client: OAuthClientInformationFull): void;
		/**
		 * Remove a client
		 * @param clientId - Client ID to remove
		 * @returns True if client was removed
		 */
		removeClient(clientId: string): boolean;
		/**
		 * Get all clients (for debugging)
		 * */
		getAllClients(): OAuthClientInformationFull[];
		/**
		 * Clear all clients
		 */
		clear(): void;
		#private;
	}
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
		readonly redirect_uris: v.SchemaWithPipe<readonly [v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>, v.MinLengthAction<string[], 1, "At least one redirect URI is required">]>;
		readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
		readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
		readonly application_type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.EmailAction<string, undefined>]>, undefined>, undefined>;
		readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly sector_identifier_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
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
		readonly redirect_uris: v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
		readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
		readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.EmailAction<string, undefined>]>, undefined>, undefined>;
		readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
		readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
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
		readonly redirect_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
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
		readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
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
		readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
	}, undefined>;
	/**
	 * Schema for refresh token grant
	 */
	export const RefreshTokenGrantSchema: v.ObjectSchema<{
		readonly refresh_token: v.StringSchema<undefined>;
		readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
		readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
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

	export {};
}

//# sourceMappingURL=index.d.ts.map