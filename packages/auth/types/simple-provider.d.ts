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
     */
    static withClient(client_id: string, client_secret: string, redirect_uris: string[], options: SimpleProviderOptions): SimpleProvider;
    /**
     * @param options - Provider options with required storage callbacks
     */
    constructor(options: SimpleProviderOptions);
    /**
     * Get the handlers for use with OAuth builder
     */
    handlers(): SimplifiedHandlers;
    /**
     * Get a client store compatible with OAuth builder
     */
    get clientStore(): import("./internal.js").OAuthRegisteredClientsStore;
    /**
     * Build a complete OAuth instance with this provider's configuration
     * @param issuer_url - The OAuth issuer URL for this server
     * @param [options] - Optional configuration
     * @param [options.cors] - CORS configuration
     * @param [options.bearer] - Bearer token configuration
     * @param [options.scopes] - Supported scopes
     * @param [options.registration] - Enable dynamic client registration
     * @param [options.rateLimits] - Rate limiting configuration
     * @param [options.pkce] - PKCE code challenge retrieval function
     */
    build(issuer_url: string, options?: {
        cors?: boolean | import("./oauth.js").CorsConfig | undefined;
        bearer?: boolean | import("./oauth.js").BearerConfig | undefined;
        scopes?: string[] | undefined;
        registration?: boolean | undefined;
        rateLimits?: Record<string, {
            windowMs: number;
            max: number;
        }> | undefined;
        pkce?: ((client: OAuthClientInformationFull, code: string) => Promise<string> | undefined) | undefined;
    }): import("./oauth.js").OAuth<"built">;
    #private;
}
export type CodeData = {
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
export type TokenData = {
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
export type TokenDataOut = Omit<TokenData, "kind" | "code" | "access_token">;
export type RefreshTokenData = {
    client_id: string;
    scopes: string[];
    access_token: string;
} & ({
    kind: "new";
    code: string;
} | {
    kind: "refresh";
});
export type RefreshTokenDataOut = Omit<RefreshTokenData, "kind" | "code">;
export type ClientCallbacks = {
    /**
     * - Get client by ID
     */
    get: (client_id: string) => Promise<OAuthClientInformationFull | undefined> | OAuthClientInformationFull | undefined;
    /**
     * - Register new client
     */
    register?: ((client_info: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">) => Promise<OAuthClientInformationFull> | OAuthClientInformationFull) | undefined;
};
export type CodeCallbacks = {
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
export type TokenCallbacks = {
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
export type RefreshTokenCallbacks = {
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
export type SimpleProviderOptions = {
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
import type { SimplifiedHandlers } from './types.js';
import type { OAuthClientInformationFull } from './types.js';
//# sourceMappingURL=simple-provider.d.ts.map