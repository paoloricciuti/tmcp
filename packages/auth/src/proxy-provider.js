/**
 * @import { AuthInfo, AuthorizationParams, OAuthTokens, OAuthTokenRevocationRequest, OAuthClientInformationFull } from './types.js'
 * @import { OAuthServerProvider, OAuthRegisteredClientsStore } from './internal.js'
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
	#verify_access_token;

	/** @type {function(string): Promise<OAuthClientInformationFull | undefined>} */
	#get_client;

	/** @type {typeof fetch} */
	#fetch;

	/** @type {boolean} */
	skipLocalPkceValidation = true;

	/**
	 * @param {ProxyOptions} options - Proxy configuration
	 */
	constructor(options) {
		this.#endpoints = options.endpoints;
		this.#verify_access_token = options.verifyAccessToken;
		this.#get_client = options.getClient;
		this.#fetch = options.fetch || fetch;
	}

	/**
	 * @returns {OAuthRegisteredClientsStore}
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
	 * @param {OAuthClientInformationFull} client
	 * @param {AuthorizationParams} params
	 * @returns {Promise<Response>}
	 */
	async authorize(client, params) {
		// Build authorization URL
		const target_url = new URL(this.#endpoints.authorizationUrl);
		const search_params = new URLSearchParams({
			client_id: client.client_id,
			response_type: 'code',
			redirect_uri: params.redirectUri,
			code_challenge: params.codeChallenge,
			code_challenge_method: 'S256',
		});

		// Add optional parameters
		if (params.state) search_params.set('state', params.state);
		if (params.scopes?.length)
			search_params.set('scope', params.scopes.join(' '));
		if (params.resource)
			search_params.set('resource', params.resource.href);

		target_url.search = search_params.toString();

		// Return redirect response
		return new Response(null, {
			status: 302,
			headers: {
				Location: target_url.toString(),
			},
		});
	}

	/**
	 * @param {OAuthClientInformationFull} _client
	 * @param {string} _authorization_code
	 * @returns {Promise<string>}
	 */
	// eslint-disable-next-line no-unused-vars
	async challengeForAuthorizationCode(_client, _authorization_code) {
		// In a proxy setup, we don't store the code challenge ourselves
		// Instead, we proxy the token request and let the upstream server validate it
		return '';
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {string} authorization_code
	 * @param {string} [code_verifier]
	 * @param {string} [redirect_uri]
	 * @param {URL} [resource]
	 * @returns {Promise<OAuthTokens>}
	 */
	async exchangeAuthorizationCode(
		client,
		authorization_code,
		code_verifier,
		redirect_uri,
		resource,
	) {
		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: client.client_id,
			code: authorization_code,
		});

		if (client.client_secret) {
			params.append('client_secret', client.client_secret);
		}

		if (code_verifier) {
			params.append('code_verifier', code_verifier);
		}

		if (redirect_uri) {
			params.append('redirect_uri', redirect_uri);
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
		const parse_result = v.safeParse(OAuthTokensSchema, data);
		if (!parse_result.success) {
			throw new ServerError('Invalid token response');
		}
		return parse_result.output;
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
		const parse_result = v.safeParse(OAuthTokensSchema, data);
		if (!parse_result.success) {
			throw new ServerError('Invalid token response');
		}
		return parse_result.output;
	}

	/**
	 * @param {string} token
	 * @returns {Promise<AuthInfo>}
	 */
	async verifyAccessToken(token) {
		return this.#verify_access_token(token);
	}

	/**
	 * @param {OAuthClientInformationFull} client
	 * @param {OAuthTokenRevocationRequest} request
	 * @returns {Promise<void>}
	 */
	async revokeToken(client, request) {
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
		if (request.token_type_hint) {
			params.set('token_type_hint', request.token_type_hint);
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
	}
}
