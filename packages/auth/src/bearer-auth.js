/**
 * @import { AuthInfo } from './types.js'
 * @import { OAuthTokenVerifier } from './provider-interfaces.js'
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
			const authHeader = request.headers.get('authorization');
			if (!authHeader) {
				throw new InvalidTokenError('Missing Authorization header');
			}

			const [type, token] = authHeader.split(' ', 2);
			if (type.toLowerCase() !== 'bearer' || !token) {
				throw new InvalidTokenError("Invalid Authorization header format, expected 'Bearer TOKEN'");
			}

			const authInfo = await this.#options.verifier.verifyAccessToken(token);

			// Check if token has the required scopes (if any)
			const requiredScopes = this.#options.requiredScopes || [];
			if (requiredScopes.length > 0) {
				const hasAllScopes = requiredScopes.every(scope =>
					authInfo.scopes.includes(scope)
				);

				if (!hasAllScopes) {
					throw new InsufficientScopeError('Insufficient scope');
				}
			}

			// Check if the token is set to expire or if it is expired
			if (typeof authInfo.expiresAt !== 'number' || isNaN(authInfo.expiresAt)) {
				throw new InvalidTokenError('Token has no expiration time');
			} else if (authInfo.expiresAt < Date.now() / 1000) {
				throw new InvalidTokenError('Token has expired');
			}

			return {
				success: true,
				authInfo,
			};
		} catch (error) {
			const errorResponse = this.#createErrorResponse(error);
			return {
				success: false,
				errorResponse,
			};
		}
	}

	/**
	 * Create error response for authentication failures
	 * @param {Error} error
	 * @returns {Response}
	 */
	#createErrorResponse(error) {
		if (error instanceof InvalidTokenError) {
			const wwwAuthValue = this.#createWwwAuthenticateHeader(error);
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': wwwAuthValue,
				},
			});
		} else if (error instanceof InsufficientScopeError) {
			const wwwAuthValue = this.#createWwwAuthenticateHeader(error);
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 403,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': wwwAuthValue,
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
			return new Response(JSON.stringify(serverError.toResponseObject()), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
	}

	/**
	 * Create WWW-Authenticate header value
	 * @param {OAuthError} error
	 * @returns {string}
	 */
	#createWwwAuthenticateHeader(error) {
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