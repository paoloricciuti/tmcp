/**
 * @import { AuthInfo, AuthorizationParams, OAuthTokens, OAuthTokenRevocationRequest, OAuthClientInformationFull } from './types.js'
 * @import { OAuthServerProvider, OAuthRegisteredClientsStore } from './provider-interfaces.js'
 */

import * as v from 'valibot';
import { ServerError } from './errors.js';
import {
	OAuthClientInformationFullSchema,
	OAuthTokensSchema,
} from './schemas.js';

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
 * @property {function(string): Promise<AuthInfo>} verifyAccessToken - Function to verify access tokens and return auth info
 * @property {function(string): Promise<OAuthClientInformationFull | undefined>} getClient - Function to fetch client information
 * @property {typeof fetch} [fetch] - Custom fetch implementation
 */

/**
 * Implements an OAuth server that proxies requests to another OAuth server.
 * @implements {OAuthServerProvider}
 */
export class ProxyOAuthServerProvider {
	/** @type {ProxyEndpoints} */
	#endpoints;

	/** @type {function(string): Promise<AuthInfo>} */
	#verifyAccessToken;

	/** @type {function(string): Promise<OAuthClientInformationFull | undefined>} */
	#getClient;

	/** @type {typeof fetch} */
	#fetch;

	/** @type {boolean} */
	skipLocalPkceValidation = true;

	/**
	 * @param {ProxyOptions} options - Proxy configuration
	 */
	constructor(options) {
		this.#endpoints = options.endpoints;
		this.#verifyAccessToken = options.verifyAccessToken;
		this.#getClient = options.getClient;
		this.#fetch = options.fetch || fetch;
	}

	/**
	 * @returns {OAuthRegisteredClientsStore}
	 */
	get clientsStore() {
		const registrationUrl = this.#endpoints.registrationUrl;
		return {
			getClient: this.#getClient,
			...(registrationUrl && {
				registerClient: async (client) => {
					const response = await this.#fetch(registrationUrl, {
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
					const parseResult = v.safeParse(
						OAuthClientInformationFullSchema,
						data,
					);
					if (!parseResult.success) {
						throw new ServerError(
							'Invalid client registration response',
						);
					}
					return parseResult.output;
				},
			}),
		};
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {AuthorizationParams} params
	 * @returns {Promise<Response>}
	 */
	async authorize(client, params) {
		// Build authorization URL
		const targetUrl = new URL(this.#endpoints.authorizationUrl);
		const searchParams = new URLSearchParams({
			client_id: client.client_id,
			response_type: 'code',
			redirect_uri: params.redirectUri,
			code_challenge: params.codeChallenge,
			code_challenge_method: 'S256',
		});

		// Add optional parameters
		if (params.state) searchParams.set('state', params.state);
		if (params.scopes?.length)
			searchParams.set('scope', params.scopes.join(' '));
		if (params.resource) searchParams.set('resource', params.resource.href);

		targetUrl.search = searchParams.toString();

		// Return redirect response
		return new Response(null, {
			status: 302,
			headers: {
				Location: targetUrl.toString(),
			},
		});
	}

	/**
	 * @param {OAuthClientInformationFull} _client
	 * @param {string} _authorizationCode
	 * @returns {Promise<string>}
	 */
	// eslint-disable-next-line no-unused-vars
	async challengeForAuthorizationCode(_client, _authorizationCode) {
		// In a proxy setup, we don't store the code challenge ourselves
		// Instead, we proxy the token request and let the upstream server validate it
		return '';
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {string} authorizationCode
	 * @param {string} [codeVerifier]
	 * @param {string} [redirectUri]
	 * @param {URL} [resource]
	 * @returns {Promise<OAuthTokens>}
	 */
	async exchangeAuthorizationCode(
		client,
		authorizationCode,
		codeVerifier,
		redirectUri,
		resource,
	) {
		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: client.client_id,
			code: authorizationCode,
		});

		if (client.client_secret) {
			params.append('client_secret', client.client_secret);
		}

		if (codeVerifier) {
			params.append('code_verifier', codeVerifier);
		}

		if (redirectUri) {
			params.append('redirect_uri', redirectUri);
		}

		if (resource) {
			params.append('resource', resource.href);
		}

		const response = await this.#fetch(this.#endpoints.tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new ServerError(`Token exchange failed: ${response.status}`);
		}

		const data = await response.json();
		const parseResult = v.safeParse(OAuthTokensSchema, data);
		if (!parseResult.success) {
			throw new ServerError('Invalid token response');
		}
		return parseResult.output;
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {string} refreshToken
	 * @param {string[]} [scopes]
	 * @param {URL} [resource]
	 * @returns {Promise<OAuthTokens>}
	 */
	async exchangeRefreshToken(client, refreshToken, scopes, resource) {
		const params = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: client.client_id,
			refresh_token: refreshToken,
		});

		if (client.client_secret) {
			params.set('client_secret', client.client_secret);
		}

		if (scopes?.length) {
			params.set('scope', scopes.join(' '));
		}

		if (resource) {
			params.set('resource', resource.href);
		}

		const response = await this.#fetch(this.#endpoints.tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new ServerError(`Token refresh failed: ${response.status}`);
		}

		const data = await response.json();
		const parseResult = v.safeParse(OAuthTokensSchema, data);
		if (!parseResult.success) {
			throw new ServerError('Invalid token response');
		}
		return parseResult.output;
	}

	/**
	 * @param {string} token
	 * @returns {Promise<AuthInfo>}
	 */
	async verifyAccessToken(token) {
		return this.#verifyAccessToken(token);
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {OAuthTokenRevocationRequest} request
	 * @returns {Promise<void>}
	 */
	async revokeToken(client, request) {
		const revocationUrl = this.#endpoints.revocationUrl;
		if (!revocationUrl) {
			throw new Error('No revocation endpoint configured');
		}

		const params = new URLSearchParams();
		params.set('token', request.token);
		params.set('client_id', client.client_id);
		if (client.client_secret) {
			params.set('client_secret', client.client_secret);
		}
		if (request.token_type_hint) {
			params.set('token_type_hint', request.token_type_hint);
		}

		const response = await this.#fetch(revocationUrl, {
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
	}
}
