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
     */
    get clientStore(): import("./internal.js").OAuthRegisteredClientsStore;
    /**
     * Get OAuth handlers for use with the new OAuth API
     */
    handlers(): import("./types.js").SimplifiedHandlers;
    /**
     * Build a complete OAuth instance with this proxy's configuration
     * @param issuer_url - The OAuth issuer URL for this proxy server
     * @param [options] - Optional configuration
     * @param [options.cors] - CORS configuration
     * @param [options.bearer] - Bearer token configuration
     * @param [options.scopes] - Supported scopes
     * @param [options.registration] - Enable dynamic client registration
     * @param [options.rateLimits] - Rate limiting configuration
     */
    build(issuer_url: string, options?: {
        cors?: boolean | import("./oauth.js").CorsConfig | undefined;
        bearer?: boolean | string[] | import("./oauth.js").BearerConfig | undefined;
        scopes?: string[] | undefined;
        registration?: boolean | undefined;
        rateLimits?: Record<string, {
            windowMs: number;
            max: number;
        }> | undefined;
    }): import("./oauth.js").OAuth<"built">;
    #private;
}
export type ProxyEndpoints = {
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
export type ProxyOptions = {
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
import type { AuthInfo } from './types.js';
import type { OAuthClientInformationFull } from './types.js';
//# sourceMappingURL=proxy-provider.d.ts.map