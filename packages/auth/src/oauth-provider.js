/* eslint-disable no-unused-vars */
/**
 * @import { AuthorizationParams, OAuthClientInformationFull, RateLimitConfig, OAuthMetadata, OAuthProtectedResourceMetadata } from './types.js'
 * @import { OAuthServerProvider } from './internal.js'
 */

import crypto from 'node:crypto';
import { verifyChallenge } from 'pkce-challenge';
import * as v from 'valibot';
import {
	InvalidClientError,
	InvalidClientMetadataError,
	InvalidGrantError,
	InvalidRequestError,
	InvalidScopeError,
	InvalidTokenError,
	InsufficientScopeError,
	MethodNotAllowedError,
	OAuthError,
	ServerError,
	TooManyRequestsError,
	UnsupportedGrantTypeError,
} from './errors.js';
import {
	AuthorizationCodeGrantSchema,
	ClientAuthenticatedRequestSchema,
	ClientAuthorizationParamsSchema,
	OAuthClientMetadataSchema,
	OAuthTokenRevocationRequestSchema,
	RefreshTokenGrantSchema,
	RequestAuthorizationParamsSchema,
	TokenRequestSchema,
} from './schemas.js';

/**
 * @typedef {Object} BearerTokenConfig
 * @property {string[]} uris - List of URIs that require Bearer token authentication
 * @property {string[]} [requiredScopes] - Optional scopes that the token must have
 * @property {string} [resourceMetadataUrl] - Optional resource metadata URL to include in WWW-Authenticate header
 */

/**
 * @typedef {Object} OAuthProviderConfig
 * @property {OAuthServerProvider} provider - OAuth server provider implementation
 * @property {URL} issuerUrl - Issuer URL (must be HTTPS except localhost)
 * @property {URL} [baseUrl] - Base URL if different from issuer
 * @property {URL} [serviceDocumentationUrl] - Documentation URL
 * @property {string[]} [scopesSupported] - Supported scopes
 * @property {string} [resourceName] - Human-readable resource name
 * @property {number} [clientSecretExpirySeconds] - Client secret expiry (default: 30 days)
 * @property {boolean} [clientIdGeneration] - Generate client IDs (default: true)
 * @property {Record<string, RateLimitConfig>} [rateLimits] - Rate limits per endpoint
 * @property {BearerTokenConfig} [bearerToken] - Bearer token authentication configuration
 */

/**
 * Main OAuth Provider class that handles OAuth 2.1 requests using Web Request/Response APIs
 */
export class OAuthProvider {
	/** @type {OAuthProviderConfig} */
	#config;

	/** @type {Map<string, Map<string, number>>} */
	#rate_limit_store = new Map();

	/**
	 * @param {OAuthProviderConfig} config - OAuth provider configuration
	 */
	constructor(config) {
		this.#validate_config(config);
		this.#config = config;
	}

	/**
	 * Validates the provider configuration
	 * @param {OAuthProviderConfig} config
	 */
	#validate_config(config) {
		// Validate issuer URL
		if (
			config.issuerUrl.protocol !== 'https:' &&
			config.issuerUrl.hostname !== 'localhost' &&
			config.issuerUrl.hostname !== '127.0.0.1'
		) {
			throw new Error('Issuer URL must be HTTPS except for localhost');
		}
		if (config.issuerUrl.hash) {
			throw new Error('Issuer URL must not have a fragment');
		}
		if (config.issuerUrl.search) {
			throw new Error('Issuer URL must not have a query string');
		}
	}

	/**
	 * Routes an OAuth request to the appropriate handler method.
	 * Returns null if the request is not for this provider.
	 *
	 * @param {Request} request - The HTTP request to handle
	 * @returns {Promise<Response | null>} HTTP response or null if not handled
	 */
	async respond(request) {
		const url = new URL(request.url);
		const method = request.method;
		const pathname = url.pathname;
		const cloned_request = request.clone();

		// Rate limiting check
		const rate_limit_response = this.#check_rate_limit(
			pathname,
			this.#get_client_id(cloned_request),
		);
		if (rate_limit_response) {
			return rate_limit_response;
		}

		// Bearer token authentication check (if configured)
		if (
			this.#config.bearerToken &&
			this.#config.bearerToken.uris.includes(pathname)
		) {
			const auth_header = cloned_request.headers.get('authorization');
			if (
				auth_header &&
				auth_header.toLowerCase().startsWith('bearer ')
			) {
				const bearer_response =
					await this.#authenticate_bearer_token(cloned_request);
				if (bearer_response.success) {
					// Token is valid, continue processing request but don't handle OAuth endpoints
					// This allows protected resource endpoints to be handled elsewhere
					return null;
				} else {
					// Token is invalid, return error response
					return bearer_response.error;
				}
			}
		}

		try {
			// Route based on pathname and method
			switch (pathname) {
				case '/authorize':
					if (method === 'GET' || method === 'POST') {
						return await this.#authorize(cloned_request);
					}
					break;

				case '/token':
					if (method === 'POST') {
						return await this.#token(cloned_request);
					}
					break;

				case '/register':
					if (
						method === 'POST' &&
						this.#config.provider.clientStore.registerClient
					) {
						return await this.#register(cloned_request);
					}
					break;

				case '/revoke':
					if (
						method === 'POST' &&
						this.#config.provider.revokeToken
					) {
						return await this.#revoke(cloned_request);
					}
					break;

				case '/.well-known/oauth-authorization-server':
					if (method === 'GET') {
						return await this.#authorization_metadata(
							cloned_request,
						);
					}
					break;

				case '/.well-known/oauth-protected-resource':
					if (method === 'GET') {
						return await this.#resource_metadata(cloned_request);
					}
					break;

				default:
					return null; // Not handled by this provider
			}

			// Method not allowed for this endpoint
			return this.#not_allowed(pathname, method);
		} catch (error) {
			return this.#handle_error(error);
		}
	}

	/**
	 * Extracts client ID from request for rate limiting
	 * @param {Request} request
	 * @returns {string}
	 */
	#get_client_id(request) {
		// Try to extract from form data or JSON body
		// This is a simplified version - in production you'd want more robust extraction
		return 'anonymous';
	}

	/**
	 * Check rate limits for an endpoint
	 * @param {string} pathname
	 * @param {string} clientId
	 * @returns {Response | null}
	 */
	#check_rate_limit(pathname, clientId) {
		const config = this.#config.rateLimits?.[pathname];
		if (!config) return null;

		if (!this.#rate_limit_store.has(pathname)) {
			this.#rate_limit_store.set(pathname, new Map());
		}

		const endpoint_store = /** @type {Map<string, number>} */ (
			this.#rate_limit_store.get(pathname)
		);
		const client_requests = endpoint_store.get(clientId) || 0;

		// Clean old entries (simplified - in production use a more efficient approach)
		if (client_requests > config.max) {
			const error = new TooManyRequestsError('Rate limit exceeded');
			return new Response(JSON.stringify(error.toResponseObject()), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
				},
			});
		}

		endpoint_store.set(clientId, client_requests + 1);
		setTimeout(() => {
			endpoint_store.set(
				clientId,
				/** @type {number} */ (endpoint_store.get(clientId)) - 1,
			);
		}, config.windowMs);
		return null;
	}

	/**
	 * Handle authorization endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #authorize(request) {
		const url = new URL(request.url);
		const params =
			request.method === 'POST'
				? await this.#parse_form_data(request)
				: Object.fromEntries(url.searchParams);

		// Phase 1: Validate client_id and redirect_uri
		let client_parse_result, client, redirect_uri;
		try {
			client_parse_result = v.safeParse(
				ClientAuthorizationParamsSchema,
				params,
			);
			if (!client_parse_result.success) {
				throw new InvalidRequestError(
					this.#format_valibot_error(client_parse_result.issues),
				);
			}

			const { client_id, redirect_uri: redirect_uri_value } =
				client_parse_result.output;
			client =
				await this.#config.provider.clientStore.getClient(client_id);
			if (!client) {
				throw new InvalidClientError('Invalid client_id');
			}

			if (redirect_uri_value !== undefined) {
				if (!client.redirect_uris.includes(redirect_uri_value)) {
					throw new InvalidRequestError('Unregistered redirect_uri');
				}
				redirect_uri = redirect_uri_value;
			} else if (client.redirect_uris.length === 1) {
				redirect_uri = client.redirect_uris[0];
			} else {
				throw new InvalidRequestError(
					'redirect_uri must be specified when client has multiple registered URIs',
				);
			}
		} catch (error) {
			// Pre-redirect errors - return direct response
			return this.#handle_error(error);
		}

		// Phase 2: Validate other parameters
		let state;
		try {
			const request_parse_result = v.safeParse(
				RequestAuthorizationParamsSchema,
				params,
			);
			if (!request_parse_result.success) {
				throw new InvalidRequestError(
					this.#format_valibot_error(request_parse_result.issues),
				);
			}

			const { scope, code_challenge, resource } =
				request_parse_result.output;
			state = request_parse_result.output.state;

			// Validate scopes
			/**
			 * @type {string[]}
			 */
			let requested_scopes = [];
			if (scope !== undefined) {
				requested_scopes = scope.split(' ');
				const allowed_scopes = new Set(client.scope?.split(' ') || []);

				for (const scope of requested_scopes) {
					if (!allowed_scopes.has(scope)) {
						throw new InvalidScopeError(
							`Client was not registered with scope ${scope}`,
						);
					}
				}
			}

			// Prepare authorization params
			/** @type {AuthorizationParams} */
			const auth_params = {
				state,
				scopes: requested_scopes,
				redirectUri: redirect_uri,
				codeChallenge: code_challenge,
				resource: resource ? new URL(resource) : undefined,
			};

			// Call provider's authorize method
			return await this.#config.provider.authorize(client, auth_params);
		} catch (error) {
			// Post-redirect errors - redirect with error parameters
			return this.#create_error_redirect(redirect_uri, error, state);
		}
	}

	/**
	 * Handle token endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #token(request) {
		const form_data = await this.#parse_form_data(request);

		// Authenticate client
		const client_result = v.safeParse(
			ClientAuthenticatedRequestSchema,
			form_data,
		);
		if (!client_result.success) {
			throw new InvalidRequestError(
				this.#format_valibot_error(client_result.issues),
			);
		}

		const { client_id, client_secret } = client_result.output;
		const client =
			await this.#config.provider.clientStore.getClient(client_id);
		if (!client) {
			throw new InvalidClientError('Invalid client_id');
		}

		// Validate client secret if required
		if (client.client_secret) {
			if (!client_secret) {
				throw new InvalidClientError('Client secret is required');
			}
			if (client.client_secret !== client_secret) {
				throw new InvalidClientError('Invalid client_secret');
			}
			if (
				client.client_secret_expires_at &&
				client.client_secret_expires_at < Math.floor(Date.now() / 1000)
			) {
				throw new InvalidClientError('Client secret has expired');
			}
		}

		// Parse token request
		const token_result = v.safeParse(TokenRequestSchema, form_data);
		if (!token_result.success) {
			throw new InvalidRequestError(
				this.#format_valibot_error(token_result.issues),
			);
		}

		const { grant_type } = token_result.output;

		switch (grant_type) {
			case 'authorization_code': {
				const code_result = v.safeParse(
					AuthorizationCodeGrantSchema,
					form_data,
				);
				if (!code_result.success) {
					throw new InvalidRequestError(
						this.#format_valibot_error(code_result.issues),
					);
				}

				const { code, code_verifier, redirect_uri, resource } =
					code_result.output;

				// PKCE validation (unless skipped)
				if (!this.#config.provider.skipLocalPkceValidation) {
					const code_challenge =
						await this.#config.provider.challengeForAuthorizationCode(
							client,
							code,
						);
					if (
						!(await verifyChallenge(code_verifier, code_challenge))
					) {
						throw new InvalidGrantError(
							'code_verifier does not match the challenge',
						);
					}
				}

				const tokens =
					await this.#config.provider.exchangeAuthorizationCode(
						client,
						code,
						this.#config.provider.skipLocalPkceValidation
							? code_verifier
							: undefined,
						redirect_uri,
						resource ? new URL(resource) : undefined,
					);

				return new Response(JSON.stringify(tokens), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-store',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			case 'refresh_token': {
				const refresh_result = v.safeParse(
					RefreshTokenGrantSchema,
					form_data,
				);
				if (!refresh_result.success) {
					throw new InvalidRequestError(
						this.#format_valibot_error(refresh_result.issues),
					);
				}

				const { refresh_token, scope, resource } =
					refresh_result.output;
				const scopes = scope?.split(' ');
				const tokens = await this.#config.provider.exchangeRefreshToken(
					client,
					refresh_token,
					scopes,
					resource ? new URL(resource) : undefined,
				);

				return new Response(JSON.stringify(tokens), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-store',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			default:
				throw new UnsupportedGrantTypeError(
					'The grant type is not supported by this authorization server.',
				);
		}
	}

	/**
	 * Handle client registration endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #register(request) {
		if (!this.#config.provider.clientStore.registerClient) {
			return new Response(null, {
				status: 404,
			});
		}
		const body = await request.json();

		const parse_result = v.safeParse(OAuthClientMetadataSchema, body);
		if (!parse_result.success) {
			throw new InvalidClientMetadataError(
				this.#format_valibot_error(parse_result.issues),
			);
		}

		const client_metadata = parse_result.output;
		const is_public_client =
			client_metadata.token_endpoint_auth_method === 'none';

		// Generate client credentials
		const client_secret = is_public_client
			? undefined
			: crypto.randomBytes(32).toString('hex');
		const client_id_issued_at = Math.floor(Date.now() / 1000);
		const client_secret_expiry_seconds =
			this.#config.clientSecretExpirySeconds ?? 30 * 24 * 60 * 60; // 30 days
		const clients_do_expire = client_secret_expiry_seconds > 0;
		const secret_expiry_time = clients_do_expire
			? client_id_issued_at + client_secret_expiry_seconds
			: 0;
		const client_secret_expires_at = is_public_client
			? undefined
			: secret_expiry_time;

		/** @type {Omit<OAuthClientInformationFull, "client_id"> & { client_id?: string }} */
		let clientInfo = {
			...client_metadata,
			client_secret: client_secret,
			client_secret_expires_at: client_secret_expires_at,
		};

		if (this.#config.clientIdGeneration !== false) {
			clientInfo.client_id = crypto.randomUUID();
			clientInfo.client_id_issued_at = client_id_issued_at;
		}

		const registered_client =
			await this.#config.provider.clientStore.registerClient(
				/** @type {OAuthClientInformationFull} */ (clientInfo),
			);

		return new Response(JSON.stringify(registered_client), {
			status: 201,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	/**
	 * Handle token revocation endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #revoke(request) {
		if (!this.#config.provider.revokeToken) {
			return new Response(null, {
				status: 404,
			});
		}
		const form_data = await this.#parse_form_data(request);

		// Authenticate client
		const client_result = v.safeParse(
			ClientAuthenticatedRequestSchema,
			form_data,
		);
		if (!client_result.success) {
			throw new InvalidRequestError(
				this.#format_valibot_error(client_result.issues),
			);
		}

		const { client_id, client_secret } = client_result.output;
		const client =
			await this.#config.provider.clientStore.getClient(client_id);
		if (!client) {
			throw new InvalidClientError('Invalid client_id');
		}

		// Validate client secret if required
		if (client.client_secret) {
			if (!client_secret) {
				throw new InvalidClientError('Client secret is required');
			}
			if (client.client_secret !== client_secret) {
				throw new InvalidClientError('Invalid client_secret');
			}
		}

		// Parse revocation request
		const revoke_result = v.safeParse(
			OAuthTokenRevocationRequestSchema,
			form_data,
		);
		if (!revoke_result.success) {
			throw new InvalidRequestError(
				this.#format_valibot_error(revoke_result.issues),
			);
		}

		await this.#config.provider.revokeToken(client, revoke_result.output);

		return new Response('{}', {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	/**
	 * Handle authorization server metadata endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #authorization_metadata(request) {
		const metadata = this.#create_oauth_metadata();
		return new Response(JSON.stringify(metadata), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	/**
	 * Handle protected resource metadata endpoint
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async #resource_metadata(request) {
		const metadata = this.#create_resource_metadata();
		return new Response(JSON.stringify(metadata), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	/**
	 * Create OAuth authorization server metadata
	 * @returns {OAuthMetadata}
	 */
	#create_oauth_metadata() {
		const issuer = this.#config.issuerUrl;
		const base_url = this.#config.baseUrl || issuer;

		/** @type {OAuthMetadata} */
		const metadata = {
			issuer: issuer.href,
			service_documentation: this.#config.serviceDocumentationUrl?.href,
			authorization_endpoint: new URL('/authorize', base_url).href,
			response_types_supported: ['code'],
			code_challenge_methods_supported: ['S256'],
			token_endpoint: new URL('/token', base_url).href,
			token_endpoint_auth_methods_supported: ['client_secret_post'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			scopes_supported: this.#config.scopesSupported,
		};

		if (this.#config.provider.revokeToken) {
			metadata.revocation_endpoint = new URL('/revoke', base_url).href;
			metadata.revocation_endpoint_auth_methods_supported = [
				'client_secret_post',
			];
		}

		if (this.#config.provider.clientStore.registerClient) {
			metadata.registration_endpoint = new URL(
				'/register',
				base_url,
			).href;
		}

		return metadata;
	}

	/**
	 * Create OAuth protected resource metadata
	 * @returns {OAuthProtectedResourceMetadata}
	 */
	#create_resource_metadata() {
		/** @type {OAuthProtectedResourceMetadata} */
		const metadata = {
			resource: this.#config.issuerUrl.href,
			authorization_servers: [this.#config.issuerUrl.href],
			scopes_supported: this.#config.scopesSupported,
			resource_name: this.#config.resourceName,
			resource_documentation: this.#config.serviceDocumentationUrl?.href,
		};

		return metadata;
	}

	/**
	 * Create error redirect response
	 * @param {string} redirectUri
	 * @param {any} error
	 * @param {string} [state]
	 * @returns {Response}
	 */
	#create_error_redirect(redirectUri, error, state) {
		const errorUrl = new URL(redirectUri);
		if (error instanceof OAuthError) {
			errorUrl.searchParams.set('error', error.errorCode);
			errorUrl.searchParams.set('error_description', error.message);
			if (error.errorUri) {
				errorUrl.searchParams.set('error_uri', error.errorUri);
			}
		} else {
			errorUrl.searchParams.set('error', 'server_error');
			errorUrl.searchParams.set(
				'error_description',
				'Internal Server Error',
			);
		}
		if (state) {
			errorUrl.searchParams.set('state', state);
		}

		return new Response(null, {
			status: 302,
			headers: {
				Location: errorUrl.href,
			},
		});
	}

	/**
	 * Create method not allowed response
	 * @param {string} pathname
	 * @param {string} method
	 * @returns {Response}
	 */
	#not_allowed(pathname, method) {
		const allowedMethods = this.#getAllowedMethods(pathname);
		const error = new MethodNotAllowedError(
			`The method ${method} is not allowed for this endpoint`,
		);

		return new Response(JSON.stringify(error.toResponseObject()), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				Allow: allowedMethods.join(', '),
			},
		});
	}

	/**
	 * Get allowed methods for a pathname
	 * @param {string} pathname
	 * @returns {string[]}
	 */
	#getAllowedMethods(pathname) {
		switch (pathname) {
			case '/authorize':
				return ['GET', 'POST'];
			case '/token':
			case '/register':
			case '/revoke':
				return ['POST'];
			case '/.well-known/oauth-authorization-server':
			case '/.well-known/oauth-protected-resource':
				return ['GET'];
			default:
				return [];
		}
	}

	/**
	 * Handle errors and convert to appropriate HTTP responses
	 * @param {any} error
	 * @returns {Response}
	 */
	#handle_error(error) {
		if (error instanceof OAuthError) {
			const status = error instanceof ServerError ? 500 : 400;
			return new Response(JSON.stringify(error.toResponseObject()), {
				status,
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
	 * Parse form data from request
	 * @param {Request} request
	 * @returns {Promise<Record<string, string>>}
	 */
	async #parse_form_data(request) {
		const formData = await request.formData();
		/** @type {Record<string, string>} */
		const result = {};
		for (const [key, value] of formData.entries()) {
			result[key] = value.toString();
		}
		return result;
	}

	/**
	 * Format Valibot validation errors
	 * @param {v.GenericIssue[]} issues
	 * @returns {string}
	 */
	#format_valibot_error(issues) {
		return issues
			.map(
				(issue) =>
					`${issue.path?.map((p) => p.key).join('.')}: ${issue.message}`,
			)
			.join(', ');
	}

	/**
	 * Authenticate bearer token from request
	 * @param {Request} request
	 * @returns {Promise<{ success: true, authInfo: import('./types.js').AuthInfo } | { success: false, error: Response }>}
	 */
	async #authenticate_bearer_token(request) {
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
				await this.#config.provider.verifyAccessToken(token);

			// Check if token has the required scopes (if any)
			const required_scopes =
				this.#config.bearerToken?.requiredScopes || [];
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
		} catch (err) {
			const error = this.#create_bearer_error(err);
			return {
				success: false,
				error,
			};
		}
	}

	/**
	 * Create error response for bearer token authentication failures
	 * @param {*} error
	 * @returns {Response}
	 */
	#create_bearer_error(error) {
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
	 * Create WWW-Authenticate header value for bearer token errors
	 * @param {OAuthError} error
	 * @returns {string}
	 */
	#create_wwwauthenticate_header(error) {
		let value = `Bearer error="${error.errorCode}", error_description="${error.message}"`;

		if (this.#config.bearerToken?.resourceMetadataUrl) {
			value += `, resource_metadata="${this.#config.bearerToken.resourceMetadataUrl}"`;
		}

		return value;
	}
}
