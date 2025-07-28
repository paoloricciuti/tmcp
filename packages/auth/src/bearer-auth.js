/**
 * @import { AuthInfo } from './types.js'
 * @import { OAuthTokenVerifier } from './internal.js'
 */

import {
	InvalidTokenError,
	InsufficientScopeError,
	OAuthError,
	ServerError,
} from './errors.js';

/**
 * @typedef {Object} BearerAuthOptions
 * @property {OAuthTokenVerifier} verifier - A provider used to verify tokens
 * @property {string[]} [requiredScopes] - Optional scopes that the token must have
 * @property {string} [resourceMetadataUrl] - Optional resource metadata URL to include in WWW-Authenticate header
 */

/**
 * @typedef {Object} BearerAuthResult
 * @property {boolean} success - Whether authentication was successful
 * @property {AuthInfo} [authInfo] - Auth info if successful
 * @property {Response} [errorResponse] - Error response if unsuccessful
 */

/**
 * Bearer token authentication helper for Web Request/Response APIs
 */
export class BearerAuth {
	/** @type {BearerAuthOptions} */
	#options;

	/**
	 * @param {BearerAuthOptions} options - Bearer auth configuration
	 */
	constructor(options) {
		this.#options = options;
	}

	/**
	 * Authenticates a request with Bearer token
	 * @param {Request} request - The HTTP request to authenticate
	 * @returns {Promise<BearerAuthResult>} Authentication result
	 */
	async authenticate(request) {
		try {
			const auth_header = request.headers.get('authorization');
			if (!auth_header) {
				throw new InvalidTokenError('Missing Authorization header');
			}

			const [type, token] = auth_header.split(' ', 2);
			if (type.toLowerCase() !== 'bearer' || !token) {
				throw new InvalidTokenError(
					"Invalid Authorization header format, expected 'Bearer TOKEN'",
				);
			}

			const auth_info =
				await this.#options.verifier.verifyAccessToken(token);

			// Check if token has the required scopes (if any)
			const required_scopes = this.#options.requiredScopes || [];
			if (required_scopes.length > 0) {
				const has_all_scopes = required_scopes.every((scope) =>
					auth_info.scopes.includes(scope),
				);

				if (!has_all_scopes) {
					throw new InsufficientScopeError('Insufficient scope');
				}
			}

			// Check if the token is set to expire or if it is expired
			if (
				typeof auth_info.expiresAt !== 'number' ||
				isNaN(auth_info.expiresAt)
			) {
				throw new InvalidTokenError('Token has no expiration time');
			} else if (auth_info.expiresAt < Date.now() / 1000) {
				throw new InvalidTokenError('Token has expired');
			}

			return {
				success: true,
				authInfo: auth_info,
			};
		} catch (error) {
			const errorResponse = this.#create_error(error);
			return {
				success: false,
				errorResponse,
			};
		}
	}

	/**
	 * Create error response for authentication failures
	 * @param {*} error
	 * @returns {Response}
	 */
	#create_error(error) {
		if (error instanceof InvalidTokenError) {
			const www_auth_value = this.#create_wwwauthenticate_header(error);
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': www_auth_value,
				},
			});
		} else if (error instanceof InsufficientScopeError) {
			const www_auth_value = this.#create_wwwauthenticate_header(error);
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 403,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': www_auth_value,
				},
			});
		} else if (error instanceof ServerError) {
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} else if (error instanceof OAuthError) {
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} else {
			const serverError = new ServerError('Internal Server Error');
			return new Response(
				JSON.stringify(serverError.toResponseObject()),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}
	}

	/**
	 * Create WWW-Authenticate header value
	 * @param {OAuthError} error
	 * @returns {string}
	 */
	#create_wwwauthenticate_header(error) {
		let value = `Bearer error="${error.errorCode}", error_description="${error.message}"`;

		if (this.#options.resourceMetadataUrl) {
			value += `, resource_metadata="${this.#options.resourceMetadataUrl}"`;
		}

		return value;
	}
}

/**
 * Convenience function to create a Bearer auth middleware-like function
 * @param {BearerAuthOptions} options - Bearer auth configuration
 * @returns {function(Request): Promise<BearerAuthResult>} Authentication function
 */
export function createBearerAuth(options) {
	const bearerAuth = new BearerAuth(options);
	return (request) => bearerAuth.authenticate(request);
}
