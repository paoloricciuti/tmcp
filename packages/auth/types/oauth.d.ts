/**
 * Main OAuth provider class - handles OAuth 2.1 requests with a clean fluent API
 */
export class OAuth<T extends "you need to call `build` for the provider to take effect" | "built" = "you need to call `build` for the provider to take effect"> {
    /**
     * Create a new OAuth builder instance
     * @param issuerUrl - The OAuth issuer URL
     */
    static create(issuerUrl: string): OAuth;
    /**
     * Static method to create OAuth from issuer URL
     * @param issuerUrl - The OAuth issuer URL
     */
    static issuer(issuerUrl: string): OAuth;
    /**
     * Create a new OAuth instance
     * @param issuerUrl - The OAuth issuer URL
     */
    constructor(issuerUrl: string);
    /**
     * Set supported scopes
     * @param scopes - Supported scopes
     */
    scopes(...scopes: string[]): OAuth<T>;
    /**
     * Set OAuth handlers
     * @param handlers - OAuth handlers
     */
    handlers(handlers: SimplifiedHandlers): OAuth<T>;
    /**
     * Use in-memory client store with optional initial clients
     * @param [clients] - Initial clients
     */
    memory(clients?: OAuthClientInformationFull[]): OAuth<T>;
    /**
     * Use custom client store
     * @param store - Custom client store
     */
    clients(store: OAuthRegisteredClientsStore): OAuth<T>;
    /**
     * Configure OAuth features
     * @param features - Feature configuration
     */
    features(features: FeatureConfig): OAuth<T>;
    /**
     * Enable PKCE (enabled by default)
     * @param get_code_challenge - A function that retrieves the original code challenge for a given authorization code
     */
    pkce(get_code_challenge: FeatureConfig["pkce"]): OAuth<T>;
    /**
     * Configure bearer token authentication
     * @param [config=true] - Bearer config
     */
    bearer(config?: boolean | string[] | BearerConfig): OAuth<T>;
    /**
     * Configure CORS
     * @param [config=true] - CORS config
     */
    cors(config?: boolean | CorsConfig): OAuth<T>;
    /**
     * Enable dynamic client registration
     * @param [enabled=true] - Whether to enable registration
     */
    registration(enabled?: boolean): OAuth<T>;
    /**
     * Configure rate limiting
     * @param limits - Rate limits
     */
    rateLimit(limits: Record<string, {
        windowMs: number;
        max: number;
    }>): OAuth<T>;
    /**
     * Build the OAuth provider (same as this instance since we're standalone now)
     */
    build(): OAuth<"built">;
    verify(request: Request): Promise<AuthInfo | null>;
    /**
     * Handle HTTP requests for OAuth endpoints
     * @param request - HTTP request
     */
    respond(request: Request): Promise<Response | null>;
    [BUILT]: T;
    #private;
}
export type Methods = "GET" | "POST";
export type BearerConfig = {
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
export type FeatureConfig = {
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
export type CorsConfig = {
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
import type { SimplifiedHandlers } from './types.js';
import type { OAuthClientInformationFull } from './types.js';
import type { OAuthRegisteredClientsStore } from './internal.js';
import type { AuthInfo } from './types.js';
declare const BUILT: unique symbol;
export {};
//# sourceMappingURL=oauth.d.ts.map