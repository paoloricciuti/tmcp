/**
 * @import { AuthInfo, OAuthTokens, OAuthClientInformationFull } from './types.js'
 * @import { ExchangeRequest, AuthorizeRequest, SimplifiedHandlers, ExchangeAuthorizationCodeRequest, ExchangeRefreshTokenRequest } from './oauth.js'
 */

import { InvalidTokenError, AccessDeniedError } from './errors.js';
import { MemoryClientStore } from './memory-store.js';

/**
 * @typedef {Object} SimpleProviderOptions
 * @property {Map<string, string>} [codes] - Storage for authorization codes and their challenges
 * @property {Map<string, AuthInfo>} [tokens] - Storage for access tokens
 * @property {Map<string, {token: string, clientId: string, scopes: string[]}>} [refresh_tokens] - Storage for refresh tokens
 * @property {number} [token_expiry=3600] - Token expiry in seconds
 */

/**
 * Simple OAuth provider implementation for development and testing
 * Provides an easy way to create a working OAuth server with minimal setup
 */
export class SimpleProvider {
	/** @type {MemoryClientStore} */
	#clientStore;

	/** @type {Map<string, string>} */
	#codes = new Map();

	/** @type {Map<string, AuthInfo>} */
	#tokens = new Map();

	/** @type {Map<string, {token: string, clientId: string, scopes: string[]}>} */
	#refreshTokens = new Map();

	/** @type {number} */
	#tokenExpiry;

	/**
	 * @param {SimpleProviderOptions & {clients?: OAuthClientInformationFull[]}} [options] - Provider options
	 */
	constructor(options = {}) {
		const {
			clients = [],
			codes,
			tokens,
			refresh_tokens,
			token_expiry = 3600,
		} = options;

		this.#clientStore = new MemoryClientStore(clients);
		this.#codes = codes || new Map();
		this.#tokens = tokens || new Map();
		this.#refreshTokens = refresh_tokens || new Map();
		this.#tokenExpiry = token_expiry;
	}

	/**
	 * Create a simple provider with pre-configured client
	 * @param {string} client_id - Client ID
	 * @param {string} client_secret - Client secret
	 * @param {string[]} redirect_uris - Redirect URIs
	 * @param {SimpleProviderOptions} [options] - Additional options
	 * @returns {SimpleProvider}
	 */
	static withClient(client_id, client_secret, redirect_uris, options = {}) {
		const client = {
			client_id: client_id,
			client_secret: client_secret,
			redirect_uris: redirect_uris,
			client_id_issued_at: Math.floor(Date.now() / 1000),
		};

		return new SimpleProvider({
			...options,
			clients: [client],
		});
	}

	/**
	 * Add a client to the store
	 * @param {OAuthClientInformationFull} client - Client to add
	 */
	add_client(client) {
		this.#clientStore.addClient(client);
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
	 * Get the client store
	 * @returns {MemoryClientStore}
	 */
	get clientStore() {
		return this.#clientStore;
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
		} = request;

		// Validate redirect URI
		if (!client.redirect_uris.includes(redirect_uri)) {
			throw new AccessDeniedError('Invalid redirect URI');
		}

		// Generate authorization code
		const code = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Store code challenge for later verification
		this.#codes.set(code, code_challenge);

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
			return this.#exchangeAuthorizationCode(request);
		} else if (request.type === 'refresh_token') {
			return this.#exchangeRefreshToken(request);
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
	async #exchangeAuthorizationCode(request) {
		const { client, code, verifier } = request;

		if (!code || !verifier) {
			throw new Error('Missing code or verifier');
		}

		// Verify code exists and get stored challenge
		const stored_challenge = this.#codes.get(code);
		if (!stored_challenge) {
			throw new Error('Invalid or expired authorization code');
		}

		// For simplicity, we'll skip PKCE verification in this example
		// In a real implementation, you'd verify the code_verifier against the stored challenge

		// Clean up the code (one-time use)
		this.#codes.delete(code);

		// Generate tokens
		const access_token = `at_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		const refresh_token = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

		const expires_at = Math.floor(Date.now() / 1000) + this.#tokenExpiry;

		// Store token info
		const auth_info = {
			token: access_token,
			clientId: client.client_id,
			scopes: request.scopes || [],
			expiresAt: expires_at,
		};

		this.#tokens.set(access_token, auth_info);
		this.#refreshTokens.set(refresh_token, {
			token: access_token,
			clientId: client.client_id,
			scopes: request.scopes || [],
		});

		return {
			access_token: access_token,
			token_type: 'bearer',
			expires_in: this.#tokenExpiry,
			refresh_token: refresh_token,
			scope: request.scopes?.join(' '),
		};
	}

	/**
	 * Exchange refresh token for new access token
	 * @param {ExchangeRefreshTokenRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchangeRefreshToken(request) {
		const { client, refreshToken: refresh_token } = request;

		if (!refresh_token) {
			throw new Error('Missing refresh token');
		}

		const token_info = this.#refreshTokens.get(refresh_token);
		if (!token_info || token_info.clientId !== client.client_id) {
			throw new Error('Invalid refresh token');
		}

		// Revoke old access token
		this.#tokens.delete(token_info.token);

		// Generate new access token
		const new_access_token = `at_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		const new_refresh_token = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

		const expires_at = Math.floor(Date.now() / 1000) + this.#tokenExpiry;

		// Store new token info
		const auth_info = {
			token: new_access_token,
			clientId: client.client_id,
			scopes: request.scopes || token_info.scopes,
			expiresAt: expires_at,
		};

		this.#tokens.set(new_access_token, auth_info);

		// Update refresh token mapping
		this.#refreshTokens.delete(refresh_token);
		this.#refreshTokens.set(new_refresh_token, {
			token: new_access_token,
			clientId: client.client_id,
			scopes: request.scopes || token_info.scopes,
		});

		return {
			access_token: new_access_token,
			token_type: 'bearer',
			expires_in: this.#tokenExpiry,
			refresh_token: new_refresh_token,
			scope: (request.scopes || token_info.scopes).join(' '),
		};
	}

	/**
	 * Verify access token
	 * @param {string} token - Access token to verify
	 * @returns {Promise<AuthInfo>}
	 */
	async #verify(token) {
		const auth_info = this.#tokens.get(token);
		if (!auth_info) {
			throw new InvalidTokenError('Token not found');
		}

		// Check if token is expired
		if (auth_info.expiresAt && auth_info.expiresAt < Date.now() / 1000) {
			this.#tokens.delete(token);
			throw new InvalidTokenError('Token has expired');
		}

		return auth_info;
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
		const auth_info = this.#tokens.get(token);
		if (auth_info && auth_info.clientId === client.client_id) {
			this.#tokens.delete(token);
			return;
		}

		// Try to revoke as refresh token
		const refresh_info = this.#refreshTokens.get(token);
		if (refresh_info && refresh_info.clientId === client.client_id) {
			// Also revoke associated access token
			this.#tokens.delete(refresh_info.token);
			this.#refreshTokens.delete(token);
			return;
		}

		// Token not found or doesn't belong to client - silently succeed per OAuth spec
	}
}
