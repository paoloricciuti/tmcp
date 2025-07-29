/**
 * @import { AuthInfo, OAuthTokens, OAuthClientInformationFull } from './types.js'
 */

import * as v from 'valibot';
import { ServerError } from './errors.js';
import {
	OAuthClientInformationFullSchema,
	OAuthTokensSchema,
} from './schemas.js';
import { OAuth } from './oauth.js';

/**
 * @typedef {Object} ProxyEndpoints
 * @property {string} authorizationUrl - Authorization endpoint URL
 * @property {string} tokenUrl - Token endpoint URL
 * @property {string} [revocationUrl] - Token revocation endpoint URL
 * @property {string} [registrationUrl] - Client registration endpoint URL
 */

/**
 * @typedef {Object} ProxyOptions
 * @property {ProxyEndpoints} endpoints - Individual endpoint URLs for proxying OAuth operations
 * @property {(token: string) => Promise<AuthInfo>} verify - Function to verify access tokens and return auth info
 * @property {(client_id: string) => Promise<OAuthClientInformationFull | undefined>} getClient - Function to fetch client information
 * @property {typeof fetch} [fetch] - Custom fetch implementation
 */

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
	/** @type {ProxyEndpoints} */
	#endpoints;

	/** @type {function(string): Promise<AuthInfo>} */
	#verify_access_token;

	/** @type {function(string): Promise<OAuthClientInformationFull | undefined>} */
	#get_client;

	/** @type {typeof fetch} */
	#fetch;

	/**
	 * @param {ProxyOptions} options - Proxy configuration
	 */
	constructor(options) {
		this.#endpoints = options.endpoints;
		this.#verify_access_token = options.verify;
		this.#get_client = options.getClient;
		this.#fetch = options.fetch || fetch;
	}

	/**
	 * Get a client store that proxies requests to the upstream server
	 * @returns {import('./internal.js').OAuthRegisteredClientsStore}
	 */
	get clientStore() {
		const registration_url = this.#endpoints.registrationUrl;

		return {
			getClient: this.#get_client,
			...(registration_url && {
				registerClient: async (client) => {
					const response = await this.#fetch(registration_url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(client),
					});

					if (!response.ok) {
						throw new ServerError(
							`Client registration failed: ${response.status}`,
						);
					}

					const data = await response.json();
					const parse_result = v.safeParse(
						OAuthClientInformationFullSchema,
						data,
					);
					if (!parse_result.success) {
						throw new ServerError(
							'Invalid client registration response',
						);
					}
					return parse_result.output;
				},
			}),
		};
	}

	/**
	 * Get OAuth handlers for use with the new OAuth API
	 * @returns {import('./oauth.js').SimplifiedHandlers}
	 */
	handlers() {
		return {
			/**
			 * @param {import('./oauth.js').AuthorizeRequest} request
			 * @returns {Promise<Response>}
			 */
			authorize: async (request) => {
				// Build authorization URL
				const target_url = new URL(this.#endpoints.authorizationUrl);
				const search_params = new URLSearchParams({
					client_id: request.client.client_id,
					response_type: 'code',
					redirect_uri: request.redirectUri,
					code_challenge: request.codeChallenge,
					code_challenge_method: 'S256',
				});

				// Add optional parameters
				if (request.state) search_params.set('state', request.state);
				if (request.scopes?.length)
					search_params.set('scope', request.scopes.join(' '));
				if (request.resource)
					search_params.set('resource', request.resource.href);

				target_url.search = search_params.toString();

				// Return redirect response
				return new Response(null, {
					status: 302,
					headers: {
						Location: target_url.toString(),
					},
				});
			},

			/**
			 * @param {import('./oauth.js').ExchangeRequest} request
			 * @returns {Promise<OAuthTokens>}
			 */
			exchange: async (request) => {
				if (request.type === 'authorization_code') {
					const params = new URLSearchParams({
						grant_type: 'authorization_code',
						client_id: request.client.client_id,
						code: request.code,
					});

					if (request.client.client_secret) {
						params.append(
							'client_secret',
							request.client.client_secret,
						);
					}

					if (request.verifier) {
						params.append('code_verifier', request.verifier);
					}

					if (request.redirectUri) {
						params.append('redirect_uri', request.redirectUri);
					}

					if (request.resource) {
						params.append('resource', request.resource.href);
					}

					const response = await this.#fetch(
						this.#endpoints.tokenUrl,
						{
							method: 'POST',
							headers: {
								'Content-Type':
									'application/x-www-form-urlencoded',
							},
							body: params.toString(),
						},
					);

					if (!response.ok) {
						throw new ServerError(
							`Token exchange failed: ${response.status}`,
						);
					}

					const data = await response.json();
					const parse_result = v.safeParse(OAuthTokensSchema, data);
					if (!parse_result.success) {
						throw new ServerError('Invalid token response');
					}
					return parse_result.output;
				} else if (request.type === 'refresh_token') {
					const params = new URLSearchParams({
						grant_type: 'refresh_token',
						client_id: request.client.client_id,
						refresh_token: request.refreshToken,
					});

					if (request.client.client_secret) {
						params.set(
							'client_secret',
							request.client.client_secret,
						);
					}

					if (request.scopes?.length) {
						params.set('scope', request.scopes.join(' '));
					}

					if (request.resource) {
						params.set('resource', request.resource.href);
					}

					const response = await this.#fetch(
						this.#endpoints.tokenUrl,
						{
							method: 'POST',
							headers: {
								'Content-Type':
									'application/x-www-form-urlencoded',
							},
							body: params.toString(),
						},
					);

					if (!response.ok) {
						throw new ServerError(
							`Token refresh failed: ${response.status}`,
						);
					}

					const data = await response.json();
					const parse_result = v.safeParse(OAuthTokensSchema, data);
					if (!parse_result.success) {
						throw new ServerError('Invalid token response');
					}
					return parse_result.output;
				}

				throw new ServerError(
					`Unsupported grant type: ${/** @type {*} */ (request).type}`,
				);
			},

			/**
			 * @param {string} token
			 * @returns {Promise<AuthInfo>}
			 */
			verify: async (token) => {
				return this.#verify_access_token(token);
			},

			/**
			 * @param {OAuthClientInformationFull} client
			 * @param {{token: string, tokenType?: string}} request
			 * @returns {Promise<void>}
			 */
			revoke: async (client, request) => {
				const revocation_url = this.#endpoints.revocationUrl;
				if (!revocation_url) {
					throw new Error('No revocation endpoint configured');
				}

				const params = new URLSearchParams();
				params.set('token', request.token);
				params.set('client_id', client.client_id);
				if (client.client_secret) {
					params.set('client_secret', client.client_secret);
				}
				if (request.tokenType) {
					params.set('token_type_hint', request.tokenType);
				}

				const response = await this.#fetch(revocation_url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: params.toString(),
				});

				if (!response.ok) {
					throw new ServerError(
						`Token revocation failed: ${response.status}`,
					);
				}
			},
		};
	}

	/**
	 * Build a complete OAuth instance with this proxy's configuration
	 * @param {string} issuer_url - The OAuth issuer URL for this proxy server
	 * @param {Object} [options] - Optional configuration
	 * @param {boolean | import('./oauth.js').CorsConfig} [options.cors] - CORS configuration
	 * @param {boolean | string[] | import('./oauth.js').BearerConfig} [options.bearer] - Bearer token configuration
	 * @param {string[]} [options.scopes] - Supported scopes
	 * @param {boolean} [options.registration] - Enable dynamic client registration
	 * @param {Record<string, {windowMs: number, max: number}>} [options.rateLimits] - Rate limiting configuration
	 * @returns {import('./oauth.js').OAuth<"built">}
	 */
	build(issuer_url, options = {}) {
		let oauth = OAuth.issuer(issuer_url)
			.clients(this.clientStore)
			.handlers(this.handlers());

		// Apply optional configurations
		if (options.scopes) {
			oauth = oauth.scopes(...options.scopes);
		}

		if (options.cors !== undefined) {
			oauth = oauth.cors(options.cors);
		}

		if (options.bearer !== undefined) {
			oauth = oauth.bearer(options.bearer);
		}

		if (options.registration !== undefined) {
			oauth = oauth.registration(options.registration);
		}

		if (options.rateLimits) {
			oauth = oauth.rateLimit(options.rateLimits);
		}

		// Enable registration if the proxy has a registration endpoint
		if (this.#endpoints.registrationUrl && options.registration !== false) {
			oauth = oauth.registration(true);
		}

		return oauth.build();
	}
}
