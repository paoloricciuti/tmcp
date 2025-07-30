/**
 * @import { AuthInfo, OAuthTokens, OAuthClientInformationFull } from './types.js'
 * @import { ExchangeRequest, AuthorizeRequest, SimplifiedHandlers, ExchangeAuthorizationCodeRequest, ExchangeRefreshTokenRequest } from './oauth.js'
 */

import { AccessDeniedError, InvalidTokenError } from './errors.js';
import { OAuth } from './oauth.js';

/**
 * @typedef {Object} CodeData
 * @property {string} client_id - Client ID
 * @property {string} redirect_uri - Redirect URI
 * @property {string} [code_challenge] - PKCE code challenge
 * @property {string} [code_challenge_method] - PKCE code challenge method
 * @property {number} expires_at - Expiration timestamp
 * @property {string[]} scopes - Requested scopes
 */

/**
 * @typedef {Object} TokenData
 * @property {string} client_id - Client ID
 * @property {string[]} scopes - Token scopes
 * @property {number} expires_at - Expiration timestamp
 */

/**
 * @typedef {Object} RefreshTokenData
 * @property {string} client_id - Client ID
 * @property {string[]} scopes - Token scopes
 * @property {string} access_token - Associated access token
 */

/**
 * @typedef {Object} ClientCallbacks
 * @property {(client_id: string) => Promise<OAuthClientInformationFull | undefined> | OAuthClientInformationFull | undefined} get - Get client by ID
 * @property {(client_info: Omit<OAuthClientInformationFull, "client_id">) => Promise<OAuthClientInformationFull> | OAuthClientInformationFull} [register] - Register new client
 */

/**
 * @typedef {Object} CodeCallbacks
 * @property {() => Promise<string> | string | Promise<null> | null} [redirect] - the page the user should be redirected to in case it needs to login before authorizing, optional if you want to never redirect
 * @property {(code: string, code_data: CodeData) => Promise<void> | void} store - Store authorization code data
 * @property {(code: string) => Promise<CodeData | undefined> | CodeData | undefined} get - Get authorization code data
 * @property {(code: string) => Promise<void> | void} delete - Delete authorization code
 */

/**
 * @typedef {Object} TokenCallbacks
 * @property {(token: string, token_data: TokenData) => Promise<void> | void} store - Store access token data
 * @property {(token: string) => Promise<TokenData | undefined> | TokenData | undefined} get - Get access token data
 * @property {(token: string) => Promise<void> | void} delete - Delete access token
 */

/**
 * @typedef {Object} RefreshTokenCallbacks
 * @property {(token: string, refresh_token_data: RefreshTokenData) => Promise<void> | void} store - Store refresh token data
 * @property {(token: string) => Promise<RefreshTokenData | undefined> | RefreshTokenData | undefined} get - Get refresh token data
 * @property {(token: string) => Promise<void> | void} delete - Delete refresh token
 */

/**
 * @typedef {Object} SimpleProviderOptions
 * @property {ClientCallbacks} clients - Client storage callbacks (required)
 * @property {CodeCallbacks} codes - Authorization code storage callbacks (required)
 * @property {TokenCallbacks} tokens - Access token storage callbacks (required)
 * @property {RefreshTokenCallbacks} refreshTokens - Refresh token storage callbacks (required)
 * @property {number} [tokenExpiry=3600] - Token expiry in seconds
 */

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
	/** @type {ClientCallbacks} */
	#client_callbacks;

	/** @type {CodeCallbacks} */
	#code_callbacks;

	/** @type {TokenCallbacks} */
	#token_callbacks;

	/** @type {RefreshTokenCallbacks} */
	#refresh_token_callbacks;

	/** @type {number} */
	#token_expiry;

	/**
	 * @param {SimpleProviderOptions} options - Provider options with required storage callbacks
	 */
	constructor(options) {
		if (!options) {
			throw new Error(
				'SimpleProvider options are required - all callbacks must be explicitly provided',
			);
		}

		const {
			clients,
			codes,
			tokens,
			refreshTokens: refresh_tokens,
			tokenExpiry: token_expiry = 3600,
		} = options;

		// All callbacks are now required
		if (!clients) {
			throw new Error('Client storage callbacks are required');
		}
		if (!codes) {
			throw new Error('Code storage callbacks are required');
		}
		if (!tokens) {
			throw new Error('Token storage callbacks are required');
		}
		if (!refresh_tokens) {
			throw new Error('Refresh token storage callbacks are required');
		}

		this.#client_callbacks = clients;
		this.#code_callbacks = codes;
		this.#token_callbacks = tokens;
		this.#refresh_token_callbacks = refresh_tokens;
		this.#token_expiry = token_expiry;
	}

	/**
	 * @param {number} length
	 */
	#generate_random_string(length) {
		const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';

		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		let s = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			s += alphabet[bytes[i] >> 3];
		}
		return s;
	}

	/**
	 * Create a simple provider with pre-configured client - requires all storage callbacks to be provided
	 * @param {string} client_id - Client ID
	 * @param {string} client_secret - Client secret
	 * @param {string[]} redirect_uris - Redirect URIs
	 * @param {SimpleProviderOptions} options - Required storage callbacks and additional options
	 * @returns {SimpleProvider}
	 */
	static withClient(client_id, client_secret, redirect_uris, options) {
		if (!options) {
			throw new Error(
				'Storage callbacks are required - options parameter must be provided',
			);
		}

		const client = {
			client_id: client_id,
			client_secret: client_secret,
			redirect_uris: redirect_uris,
			client_id_issued_at: Math.floor(Date.now() / 1000),
		};

		// Create the provider with the provided callbacks
		const provider = new SimpleProvider(options);

		// Add the client using the add_client method
		provider.#add_client(client);

		return provider;
	}

	/**
	 * Add a client using the configured storage callbacks
	 * @param {OAuthClientInformationFull} client - Client to add
	 */
	async #add_client(client) {
		// Use the register callback if available
		if (this.#client_callbacks.register) {
			await this.#client_callbacks.register(client);
		} else {
			throw new Error(
				'Client registration not supported - register callback not provided',
			);
		}
	}

	/**
	 * Get the handlers for use with OAuth builder
	 * @returns {SimplifiedHandlers}
	 */
	handlers() {
		return {
			authorize: this.#authorize.bind(this),
			exchange: this.#exchange.bind(this),
			verify: this.#verify.bind(this),
			revoke: this.#revoke.bind(this),
		};
	}

	/**
	 * Get a client store compatible with OAuth builder
	 * @returns {import('./internal.js').OAuthRegisteredClientsStore}
	 */
	get clientStore() {
		/** @type {import('./internal.js').OAuthRegisteredClientsStore} */
		const store = {
			getClient: async (client_id) => {
				const result = this.#client_callbacks.get(client_id);
				return result instanceof Promise ? await result : result;
			},
			...(this.#client_callbacks.register && {
				registerClient: async (client) => {
					const register =
						/** @type {Exclude<ClientCallbacks["register"], undefined>} */ (
							this.#client_callbacks.register
						);
					const result = register(client);
					return result instanceof Promise ? await result : result;
				},
			}),
		};

		return store;
	}

	/**
	 * Handle authorization request
	 * @param {AuthorizeRequest} request - Authorization request
	 * @returns {Promise<Response>}
	 */
	async #authorize(request) {
		const {
			client,
			redirectUri: redirect_uri,
			codeChallenge: code_challenge,
			state,
			scopes = [],
		} = request;

		// Validate redirect URI
		if (!client.redirect_uris.includes(redirect_uri)) {
			throw new AccessDeniedError('Invalid redirect URI');
		}

		const should_redirect = await this.#code_callbacks.redirect?.();

		if (should_redirect != null) {
			const url = new URL(should_redirect);
			url.searchParams.set('client_id', client.client_id);
			url.searchParams.set('redirect_uri', redirect_uri);
			if (state) {
				url.searchParams.set('state', state);
			}
			if (scopes.length > 0) {
				url.searchParams.set('scope', scopes.join(' '));
			}
			return new Response(null, {
				status: 302,
				headers: {
					Location: url.toString(),
				},
			});
		}

		// Generate authorization code
		const code = this.#generate_random_string(16);

		// Store code data for later verification
		const code_data = {
			client_id: client.client_id,
			redirect_uri: redirect_uri,
			code_challenge: code_challenge,
			code_challenge_method: 'S256',
			expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
			scopes: scopes,
		};

		await this.#code_callbacks.store(code, code_data);

		// TODO: figure out how to let the user navigate to the login OR the redirect URI

		// Build redirect URL
		const redirect_url = new URL(redirect_uri);
		redirect_url.searchParams.set('code', code);
		if (state) {
			redirect_url.searchParams.set('state', state);
		}

		return new Response(null, {
			status: 302,
			headers: {
				Location: redirect_url.toString(),
			},
		});
	}

	/**
	 * Handle token exchange
	 * @param {ExchangeRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchange(request) {
		if (request.type === 'authorization_code') {
			return this.#exchange_code(request);
		} else if (request.type === 'refresh_token') {
			return this.#exchange_refresh_token(request);
		}

		throw new Error(
			`Unsupported grant type: ${/** @type {*} */ (request).type}`,
		);
	}

	/**
	 * Exchange authorization code for tokens
	 * @param {ExchangeAuthorizationCodeRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchange_code(request) {
		const { client, code, verifier } = request;

		if (!code || !verifier) {
			throw new Error('Missing code or verifier');
		}

		// Verify code exists and get stored data
		const code_data = await this.#code_callbacks.get(code);
		if (!code_data) {
			throw new Error('Invalid or expired authorization code');
		}

		// Check if code is expired
		if (code_data.expires_at < Date.now()) {
			await this.#code_callbacks.delete(code);
			throw new Error('Authorization code expired');
		}

		// Verify client and redirect URI match
		if (code_data.client_id !== client.client_id) {
			throw new Error('Client mismatch');
		}

		if (
			request.redirectUri &&
			code_data.redirect_uri !== request.redirectUri
		) {
			throw new Error('Redirect URI mismatch');
		}

		// PKCE verification it's done in the `OAuth` class

		// Clean up the code (one-time use)
		await this.#code_callbacks.delete(code);

		// Generate tokens
		const access_token = `at_${Date.now()}_${this.#generate_random_string(16)}`;
		const refresh_token = `rt_${Date.now()}_${this.#generate_random_string(16)}`;

		const expires_at = Math.floor(Date.now() / 1000) + this.#token_expiry;

		// Store token data
		const token_data = {
			client_id: client.client_id,
			scopes: request.scopes || code_data.scopes,
			expires_at: expires_at,
		};

		await this.#token_callbacks.store(access_token, token_data);

		// Store refresh token data
		const refresh_token_data = {
			client_id: client.client_id,
			scopes: request.scopes || code_data.scopes,
			access_token: access_token,
		};

		await this.#refresh_token_callbacks.store(
			refresh_token,
			refresh_token_data,
		);

		return {
			access_token: access_token,
			token_type: 'bearer',
			expires_in: this.#token_expiry,
			refresh_token: refresh_token,
			scope: (request.scopes || code_data.scopes).join(' '),
		};
	}

	/**
	 * Exchange refresh token for new access token
	 * @param {ExchangeRefreshTokenRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchange_refresh_token(request) {
		const { client, refreshToken: refresh_token } = request;

		if (!refresh_token) {
			throw new Error('Missing refresh token');
		}

		const refresh_token_data =
			await this.#refresh_token_callbacks.get(refresh_token);
		if (
			!refresh_token_data ||
			refresh_token_data.client_id !== client.client_id
		) {
			throw new Error('Invalid refresh token');
		}

		// Revoke old access token
		await this.#token_callbacks.delete(refresh_token_data.access_token);

		// Generate new access token
		const new_access_token = `at_${Date.now()}_${this.#generate_random_string(16)}`;
		const new_refresh_token = `rt_${Date.now()}_${this.#generate_random_string(16)}`;

		const expires_at = Math.floor(Date.now() / 1000) + this.#token_expiry;

		// Store new token data
		const token_data = {
			client_id: client.client_id,
			scopes: request.scopes || refresh_token_data.scopes,
			expires_at: expires_at,
		};

		await this.#token_callbacks.store(new_access_token, token_data);

		// Update refresh token mapping
		await this.#refresh_token_callbacks.delete(refresh_token);

		const new_refresh_token_data = {
			client_id: client.client_id,
			scopes: request.scopes || refresh_token_data.scopes,
			access_token: new_access_token,
		};

		await this.#refresh_token_callbacks.store(
			new_refresh_token,
			new_refresh_token_data,
		);

		return {
			access_token: new_access_token,
			token_type: 'bearer',
			expires_in: this.#token_expiry,
			refresh_token: new_refresh_token,
			scope: (request.scopes || refresh_token_data.scopes).join(' '),
		};
	}

	/**
	 * Verify access token
	 * @param {string} token - Access token to verify
	 * @returns {Promise<AuthInfo>}
	 */
	async #verify(token) {
		const token_data = await this.#token_callbacks.get(token);
		if (!token_data) {
			throw new InvalidTokenError('Token not found');
		}

		// Check if token is expired
		if (
			token_data.expires_at &&
			token_data.expires_at < Date.now() / 1000
		) {
			await this.#token_callbacks.delete(token);
			throw new InvalidTokenError('Token has expired');
		}

		// Convert to AuthInfo format
		return {
			token: token,
			clientId: token_data.client_id,
			scopes: token_data.scopes,
			expiresAt: token_data.expires_at,
		};
	}

	/**
	 * Revoke a token
	 * @param {OAuthClientInformationFull} client - Client information
	 * @param {{token: string, tokenType?: string}} request - Revocation request
	 * @returns {Promise<void>}
	 */
	async #revoke(client, request) {
		const { token } = request;

		// Try to revoke as access token
		const token_data = await this.#token_callbacks.get(token);
		if (token_data && token_data.client_id === client.client_id) {
			await this.#token_callbacks.delete(token);
			return;
		}

		// Try to revoke as refresh token
		const refresh_token_data =
			await this.#refresh_token_callbacks.get(token);
		if (
			refresh_token_data &&
			refresh_token_data.client_id === client.client_id
		) {
			// Also revoke associated access token
			await this.#token_callbacks.delete(refresh_token_data.access_token);
			await this.#refresh_token_callbacks.delete(token);
			return;
		}

		// Token not found or doesn't belong to client - silently succeed per OAuth spec
	}

	/**
	 * Build a complete OAuth instance with this provider's configuration
	 * @param {string} issuer_url - The OAuth issuer URL for this server
	 * @param {Object} [options] - Optional configuration
	 * @param {boolean | import('./oauth.js').CorsConfig} [options.cors] - CORS configuration
	 * @param {boolean | import('./oauth.js').BearerConfig} [options.bearer] - Bearer token configuration
	 * @param {string[]} [options.scopes] - Supported scopes
	 * @param {boolean} [options.registration] - Enable dynamic client registration
	 * @param {Record<string, {windowMs: number, max: number}>} [options.rateLimits] - Rate limiting configuration
	 * @param {(client: OAuthClientInformationFull, code: string) => Promise<string> | undefined} [options.pkce] - PKCE code challenge retrieval function
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

		if (options.pkce) {
			oauth = oauth.pkce(options.pkce);
		}

		return oauth.build();
	}
}
