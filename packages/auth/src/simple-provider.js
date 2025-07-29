/**
 * @import { AuthInfo, OAuthTokens, OAuthClientInformationFull } from './types.js'
 * @import { ExchangeRequest, AuthorizeRequest, SimplifiedHandlers } from './oauth-builder.js'
 */

import { InvalidTokenError, AccessDeniedError } from './errors.js';
import { MemoryClientStore } from './memory-store.js';

/**
 * @typedef {Object} SimpleProviderOptions
 * @property {Map<string, string>} [codes] - Storage for authorization codes and their challenges
 * @property {Map<string, AuthInfo>} [tokens] - Storage for access tokens
 * @property {Map<string, {token: string, clientId: string, scopes: string[]}>} [refreshTokens] - Storage for refresh tokens
 * @property {number} [tokenExpiry=3600] - Token expiry in seconds
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
			refreshTokens, 
			tokenExpiry = 3600 
		} = options;

		this.#clientStore = new MemoryClientStore(clients);
		this.#codes = codes || new Map();
		this.#tokens = tokens || new Map();
		this.#refreshTokens = refreshTokens || new Map();
		this.#tokenExpiry = tokenExpiry;
	}

	/**
	 * Create a simple provider with pre-configured client
	 * @param {string} clientId - Client ID
	 * @param {string} clientSecret - Client secret
	 * @param {string[]} redirectUris - Redirect URIs
	 * @param {SimpleProviderOptions} [options] - Additional options
	 * @returns {SimpleProvider}
	 */
	static withClient(clientId, clientSecret, redirectUris, options = {}) {
		const client = {
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uris: redirectUris,
			client_id_issued_at: Math.floor(Date.now() / 1000)
		};

		return new SimpleProvider({
			...options,
			clients: [client]
		});
	}

	/**
	 * Add a client to the store
	 * @param {OAuthClientInformationFull} client - Client to add
	 */
	addClient(client) {
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
			revoke: this.#revoke.bind(this)
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
		const { client, redirectUri, codeChallenge, state, scopes = [] } = request;

		// Validate redirect URI
		if (!client.redirect_uris.includes(redirectUri)) {
			throw new AccessDeniedError('Invalid redirect URI');
		}

		// Generate authorization code
		const code = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		// Store code challenge for later verification
		this.#codes.set(code, codeChallenge);

		// Build redirect URL
		const redirectUrl = new URL(redirectUri);
		redirectUrl.searchParams.set('code', code);
		if (state) {
			redirectUrl.searchParams.set('state', state);
		}

		return new Response(null, {
			status: 302,
			headers: {
				'Location': redirectUrl.toString()
			}
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
		
		throw new Error(`Unsupported grant type: ${request.type}`);
	}

	/**
	 * Exchange authorization code for tokens
	 * @param {ExchangeRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchangeAuthorizationCode(request) {
		const { client, code, verifier } = request;

		if (!code || !verifier) {
			throw new Error('Missing code or verifier');
		}

		// Verify code exists and get stored challenge
		const storedChallenge = this.#codes.get(code);
		if (!storedChallenge) {
			throw new Error('Invalid or expired authorization code');
		}

		// For simplicity, we'll skip PKCE verification in this example
		// In a real implementation, you'd verify the code_verifier against the stored challenge

		// Clean up the code (one-time use)
		this.#codes.delete(code);

		// Generate tokens
		const accessToken = `at_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		const refreshToken = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		
		const expiresAt = Math.floor(Date.now() / 1000) + this.#tokenExpiry;

		// Store token info
		const authInfo = {
			token: accessToken,
			clientId: client.client_id,
			scopes: request.scopes || [],
			expiresAt
		};
		
		this.#tokens.set(accessToken, authInfo);
		this.#refreshTokens.set(refreshToken, {
			token: accessToken,
			clientId: client.client_id,
			scopes: request.scopes || []
		});

		return {
			access_token: accessToken,
			token_type: 'bearer',
			expires_in: this.#tokenExpiry,
			refresh_token: refreshToken,
			scope: request.scopes?.join(' ')
		};
	}

	/**
	 * Exchange refresh token for new access token
	 * @param {ExchangeRequest} request - Exchange request
	 * @returns {Promise<OAuthTokens>}
	 */
	async #exchangeRefreshToken(request) {
		const { client, refreshToken } = request;

		if (!refreshToken) {
			throw new Error('Missing refresh token');
		}

		const tokenInfo = this.#refreshTokens.get(refreshToken);
		if (!tokenInfo || tokenInfo.clientId !== client.client_id) {
			throw new Error('Invalid refresh token');
		}

		// Revoke old access token
		this.#tokens.delete(tokenInfo.token);

		// Generate new access token
		const newAccessToken = `at_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		const newRefreshToken = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
		
		const expiresAt = Math.floor(Date.now() / 1000) + this.#tokenExpiry;

		// Store new token info
		const authInfo = {
			token: newAccessToken,
			clientId: client.client_id,
			scopes: request.scopes || tokenInfo.scopes,
			expiresAt
		};
		
		this.#tokens.set(newAccessToken, authInfo);
		
		// Update refresh token mapping
		this.#refreshTokens.delete(refreshToken);
		this.#refreshTokens.set(newRefreshToken, {
			token: newAccessToken,
			clientId: client.client_id,
			scopes: request.scopes || tokenInfo.scopes
		});

		return {
			access_token: newAccessToken,
			token_type: 'bearer',
			expires_in: this.#tokenExpiry,
			refresh_token: newRefreshToken,
			scope: (request.scopes || tokenInfo.scopes).join(' ')
		};
	}

	/**
	 * Verify access token
	 * @param {string} token - Access token to verify
	 * @returns {Promise<AuthInfo>}
	 */
	async #verify(token) {
		const authInfo = this.#tokens.get(token);
		if (!authInfo) {
			throw new InvalidTokenError('Token not found');
		}

		// Check if token is expired
		if (authInfo.expiresAt && authInfo.expiresAt < Date.now() / 1000) {
			this.#tokens.delete(token);
			throw new InvalidTokenError('Token has expired');
		}

		return authInfo;
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
		const authInfo = this.#tokens.get(token);
		if (authInfo && authInfo.clientId === client.client_id) {
			this.#tokens.delete(token);
			return;
		}

		// Try to revoke as refresh token
		const refreshInfo = this.#refreshTokens.get(token);
		if (refreshInfo && refreshInfo.clientId === client.client_id) {
			// Also revoke associated access token
			this.#tokens.delete(refreshInfo.token);
			this.#refreshTokens.delete(token);
			return;
		}

		// Token not found or doesn't belong to client - silently succeed per OAuth spec
	}
}