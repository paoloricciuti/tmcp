/**
 * @import { AuthInfo, OAuthTokens, OAuthClientInformationFull, AuthorizationParams, OAuthTokenRevocationRequest, OAuthMetadata, OAuthProtectedResourceMetadata, RateLimitConfig } from './types.js'
 * @import { OAuthRegisteredClientsStore } from './internal.js'
 */

import * as v from 'valibot';
import {
	InvalidTokenError,
	InsufficientScopeError,
	OAuthError,
	ServerError,
	InvalidRequestError,
	InvalidClientError,
	InvalidGrantError,
	MethodNotAllowedError,
	TooManyRequestsError,
} from './errors.js';
import {
	OAuthClientMetadataSchema,
	ClientAuthenticatedRequestSchema,
	ClientAuthorizationParamsSchema,
	RequestAuthorizationParamsSchema,
	TokenRequestSchema,
	AuthorizationCodeGrantSchema,
	RefreshTokenGrantSchema,
	OAuthTokenRevocationRequestSchema,
} from './schemas.js';
import { MemoryClientStore } from './memory-store.js';
import { verifyChallenge } from 'pkce-challenge';

/**
 * @typedef {Object} ExchangeAuthorizationCodeRequest
 * @property {OAuthClientInformationFull} client - Client information
 * @property {'authorization_code'} type - Grant type
 * @property {string} code - Authorization code (for authorization_code grants)
 * @property {string} verifier - PKCE code verifier (for authorization_code grants)
 * @property {string} [redirectUri] - Redirect URI (for authorization_code grants)
 * @property {string[]} [scopes] - Requested scopes
 * @property {URL} [resource] - Resource parameter
 */

/**
 * @typedef {Object} ExchangeRefreshTokenRequest
 * @property {OAuthClientInformationFull} client - Client information
 * @property {'refresh_token'} type - Grant type
 * @property {string} refreshToken - Refresh token (for refresh_token grants)
 * @property {string[]} [scopes] - Requested scopes
 * @property {URL} [resource] - Resource parameter
 */

/**
 * @typedef {ExchangeAuthorizationCodeRequest | ExchangeRefreshTokenRequest} ExchangeRequest
 */

/**
 * @typedef {Object} AuthorizeRequest
 * @property {OAuthClientInformationFull} client - Client information
 * @property {string} redirectUri - Redirect URI
 * @property {string} codeChallenge - PKCE code challenge
 * @property {string} [state] - OAuth state parameter
 * @property {string[]} [scopes] - Requested scopes
 * @property {URL} [resource] - Resource parameter
 */

/**
 * @typedef {Object} SimplifiedHandlers
 * @property {(request: AuthorizeRequest) => Promise<Response>} authorize - Handle authorization requests
 * @property {(request: ExchangeRequest) => Promise<OAuthTokens>} exchange - Handle token exchange
 * @property {(token: string) => Promise<AuthInfo>} verify - Verify access tokens
 * @property {(client: OAuthClientInformationFull, data: {token: string, tokenType?: string}) => Promise<void>} [revoke] - Revoke tokens
 */

/**
 * @typedef {"GET" | "POST"} Methods
 */

/**
 * @typedef {Object} BearerConfig
 * @property {string[]} [scopes] - Required scopes for bearer token
 * @property {string} [resourceUrl] - Resource URL for bearer token
 * @property {Partial<Record<Methods, string[]>>} [paths] - Paths that require bearer token
 */

/**
 * @typedef {Object} FeatureConfig
 * @property {(client: OAuthClientInformationFull, code: string) => Promise<string> | undefined} [pkce] - Enable PKCE (it's also a function to retrieve the original code challenge for a given authorization code)
 * @property {boolean | BearerConfig} [bearer=false] - Bearer token config
 * @property {boolean | CorsConfig} [cors=false] - CORS config
 * @property {boolean} [registration=false] - Dynamic client registration
 * @property {Record<string, {windowMs: number, max: number}>} [rateLimits] - Rate limiting config
 */

/**
 * @typedef {Object} CorsConfig
 * @property {string | string[]} [origin] - Allowed origins
 * @property {string[]} [methods] - Allowed methods
 * @property {string[]} [allowedHeaders] - Allowed headers
 * @property {string[]} [exposedHeaders] - Exposed headers
 * @property {boolean} [credentials] - Allow credentials
 * @property {number} [maxAge] - Preflight cache duration
 */

const BUILT = Symbol('built');

/**
 * @template {"you need to call `build` for the provider to take effect" | "built"} [T='you need to call `build` for the provider to take effect']
 * Main OAuth provider class - handles OAuth 2.1 requests with a clean fluent API
 */
export class OAuth {
	/**
	 * @type {T}
	 */
	// @ts-ignore
	[BUILT];

	/** @type {string} */
	#issuer_url;

	/** @type {URL} */
	#baseUrl;

	/** @type {string[]} */
	#scopes = [];

	/** @type {SimplifiedHandlers} */
	// @ts-ignore it will need to be defined or `build` will throw
	#handlers;

	/** @type {FeatureConfig} */
	#features = {};

	/** @type {OAuthRegisteredClientsStore} */
	// @ts-ignore it will need to be defined after `build` as it will be set by `memory` or `clients`
	#client_store;

	/** @type {Map<string, {count: number, resetTime: number}>} */
	#rate_limit_counters = new Map();

	/**
	 * Create a new OAuth instance
	 * @param {string} issuerUrl - The OAuth issuer URL
	 */
	constructor(issuerUrl) {
		this.#issuer_url = issuerUrl;
		this.#baseUrl = new URL(issuerUrl);

		// Validate issuer URL
		if (
			this.#baseUrl.protocol !== 'https:' &&
			this.#baseUrl.hostname !== 'localhost'
		) {
			throw new Error('Issuer URL must be HTTPS (except for localhost)');
		}
		if (this.#baseUrl.hash) {
			throw new Error('Issuer URL must not have a fragment');
		}
		if (this.#baseUrl.search) {
			throw new Error('Issuer URL must not have a query string');
		}
	}

	/**
	 * Create a new OAuth builder instance
	 * @param {string} issuerUrl - The OAuth issuer URL
	 * @returns {OAuth}
	 */
	static create(issuerUrl) {
		return new OAuth(issuerUrl);
	}

	/**
	 * Static method to create OAuth from issuer URL
	 * @param {string} issuerUrl - The OAuth issuer URL
	 * @returns {OAuth}
	 */
	static issuer(issuerUrl) {
		return new OAuth(issuerUrl);
	}

	/**
	 * Set supported scopes
	 * @param {...string} scopes - Supported scopes
	 * @returns {OAuth<T>}
	 */
	scopes(...scopes) {
		this.#scopes = scopes;
		return this;
	}

	/**
	 * Set OAuth handlers
	 * @param {SimplifiedHandlers} handlers - OAuth handlers
	 * @returns {OAuth<T>}
	 */
	handlers(handlers) {
		this.#handlers = handlers;
		return this;
	}

	/**
	 * Use in-memory client store with optional initial clients
	 * @param {OAuthClientInformationFull[]} [clients] - Initial clients
	 * @returns {OAuth<T>}
	 */
	memory(clients = []) {
		this.#client_store = new MemoryClientStore(clients);
		return this;
	}

	/**
	 * Use custom client store
	 * @param {OAuthRegisteredClientsStore} store - Custom client store
	 * @returns {OAuth<T>}
	 */
	clients(store) {
		this.#client_store = store;
		return this;
	}

	/**
	 * Configure OAuth features
	 * @param {FeatureConfig} features - Feature configuration
	 * @returns {OAuth<T>}
	 */
	features(features) {
		this.#features = { ...this.#features, ...features };
		return this;
	}

	/**
	 * Enable PKCE (enabled by default)
	 * @param {FeatureConfig["pkce"]} get_code_challenge - A function that retrieves the original code challenge for a given authorization code
	 * @returns {OAuth<T>}
	 */
	pkce(get_code_challenge) {
		this.#features.pkce = get_code_challenge;
		return this;
	}

	/**
	 * Configure bearer token authentication
	 * @param {boolean | string[] | BearerConfig} [config=true] - Bearer config
	 * @returns {OAuth<T>}
	 */
	bearer(config = true) {
		if (Array.isArray(config)) {
			this.#features.bearer = { scopes: config };
		} else {
			this.#features.bearer = config;
		}
		return this;
	}

	/**
	 * Configure CORS
	 * @param {boolean | CorsConfig} [config=true] - CORS config
	 * @returns {OAuth<T>}
	 */
	cors(config = true) {
		this.#features.cors = config;
		return this;
	}

	/**
	 * Enable dynamic client registration
	 * @param {boolean} [enabled=true] - Whether to enable registration
	 * @returns {OAuth<T>}
	 */
	registration(enabled = true) {
		this.#features.registration = enabled;
		return this;
	}

	/**
	 * Configure rate limiting
	 * @param {Record<string, {windowMs: number, max: number}>} limits - Rate limits
	 * @returns {OAuth<T>}
	 */
	rateLimit(limits) {
		this.#features.rateLimits = limits;
		return this;
	}

	/**
	 * Build the OAuth provider (same as this instance since we're standalone now)
	 * @returns {OAuth<"built">}
	 */
	build() {
		if (!this.#handlers) {
			throw new Error('OAuth handlers must be provided via .handlers()');
		}
		if (!this.#client_store) {
			this.memory();
		}
		return /** @type {OAuth<"built">} */ (this);
	}

	/**
	 * @param {Request} request
	 */
	async verify(request) {
		const auth_header = request.headers.get('authorization');
		if (!auth_header) {
			return null;
		}

		const [type, token] = auth_header.split(' ', 2);
		if (type.toLowerCase() !== 'bearer' || !token) {
			return null;
		}

		return this.#handlers.verify(token);
	}

	/**
	 * Handle HTTP requests for OAuth endpoints
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response | null>}
	 */
	async respond(request) {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS' && this.#features.cors) {
			return this.#handle_cors_prelight(request);
		}

		// Check if request is for this OAuth server
		if (url.origin !== this.#baseUrl.origin) {
			return null;
		}

		// Handle different endpoints
		try {
			let response = null;

			if (url.pathname === '/.well-known/oauth-authorization-server') {
				response = await this.#handle_metadata();
			} else if (
				url.pathname === '/.well-known/oauth-protected-resource'
			) {
				response = await this.#handle_resource_metadata();
			} else if (url.pathname === '/authorize') {
				response = await this.#handle_authorize(request);
			} else if (url.pathname === '/token') {
				response = await this.#handle_token(request);
			} else if (
				url.pathname === '/register' &&
				this.#features.registration
			) {
				response = await this.#handle_register(request);
			} else if (url.pathname === '/revoke' && this.#handlers?.revoke) {
				response = await this.#handle_revoke(request);
			} else if (
				this.#features.bearer &&
				(typeof this.#features.bearer === 'boolean' ||
					this.#features.bearer.paths?.[
						/** @type {Methods} */ (request.method)
					]?.includes(url.pathname))
			) {
				response = await this.#handle_bearer_auth(request);
			}

			// Add CORS headers if enabled
			if (response != null && this.#features.cors) {
				this.#add_cors_headers(response, request);
			}

			return response;
		} catch (error) {
			return this.#handle_error(error, request);
		}
	}

	/**
	 * Handle CORS preflight requests
	 * @param {Request} request - HTTP request
	 * @returns {Response}
	 */
	#handle_cors_prelight(request) {
		const response = new Response(null, { status: 204 });
		this.#add_cors_headers(response, request);
		return response;
	}

	/**
	 * Add CORS headers to response
	 * @param {Response} response - HTTP response
	 * @param {Request} request - HTTP request
	 */
	#add_cors_headers(response, request) {
		const cors_config =
			typeof this.#features.cors === 'object' ? this.#features.cors : {};
		const origin = cors_config.origin || '*';
		const methods = cors_config.methods || ['GET', 'POST', 'OPTIONS'];
		const allowedHeaders = cors_config.allowedHeaders || [
			'Content-Type',
			'Authorization',
		];

		if (Array.isArray(origin)) {
			const requestOrigin = request.headers.get('origin');
			if (requestOrigin && origin.includes(requestOrigin)) {
				response.headers.set(
					'Access-Control-Allow-Origin',
					requestOrigin,
				);
			}
		} else {
			response.headers.set('Access-Control-Allow-Origin', origin);
		}

		response.headers.set(
			'Access-Control-Allow-Methods',
			methods.join(', '),
		);
		response.headers.set(
			'Access-Control-Allow-Headers',
			allowedHeaders.join(', '),
		);

		if (cors_config.credentials) {
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}
		if (cors_config.maxAge) {
			response.headers.set(
				'Access-Control-Max-Age',
				cors_config.maxAge.toString(),
			);
		}
		if (cors_config.exposedHeaders) {
			response.headers.set(
				'Access-Control-Expose-Headers',
				cors_config.exposedHeaders.join(', '),
			);
		}
	}

	/**
	 * Handle authorization server metadata endpoint
	 * @returns {Promise<Response>}
	 */
	async #handle_metadata() {
		/** @type {OAuthMetadata} */
		const metadata = {
			issuer: this.#issuer_url.endsWith('/')
				? this.#issuer_url
				: this.#issuer_url + '/',
			authorization_endpoint: `${this.#issuer_url}/authorize`,
			token_endpoint: `${this.#issuer_url}/token`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			code_challenge_methods_supported: ['S256'],
			token_endpoint_auth_methods_supported: [
				'client_secret_basic',
				'client_secret_post',
			],
		};

		if (this.#scopes.length > 0) {
			metadata.scopes_supported = this.#scopes;
		}

		if (this.#features.registration) {
			metadata.registration_endpoint = `${this.#issuer_url}/register`;
		}

		if (this.#handlers?.revoke) {
			metadata.revocation_endpoint = `${this.#issuer_url}/revoke`;
			metadata.revocation_endpoint_auth_methods_supported = [
				'client_secret_basic',
				'client_secret_post',
			];
		}

		return new Response(JSON.stringify(metadata), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Handle protected resource metadata endpoint
	 * @returns {Promise<Response>}
	 */
	async #handle_resource_metadata() {
		/** @type {OAuthProtectedResourceMetadata} */
		const metadata = {
			resource: this.#issuer_url.endsWith('/')
				? this.#issuer_url
				: this.#issuer_url + '/',
			authorization_servers: [
				this.#issuer_url.endsWith('/')
					? this.#issuer_url
					: this.#issuer_url + '/',
			],
		};

		if (this.#scopes.length > 0) {
			metadata.scopes_supported = this.#scopes;
		}

		return new Response(JSON.stringify(metadata), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Handle authorization endpoint
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response>}
	 */
	async #handle_authorize(request) {
		if (request.method !== 'GET' && request.method !== 'POST') {
			throw new MethodNotAllowedError('Method not allowed', 'GET, POST');
		}

		// Check rate limits
		await this.#check_rate_limit('/authorize', request);

		// Parse parameters
		const url = new URL(request.url);
		const params = Object.fromEntries(url.searchParams.entries());

		// Add POST body params if present
		if (request.method === 'POST') {
			const form_data = await request.formData();
			for (const [key, value] of form_data) {
				params[key] = value.toString();
			}
		}

		// Validate basic client parameters
		const client_params = v.parse(ClientAuthorizationParamsSchema, params);
		const client = await this.#client_store.getClient(
			client_params.client_id,
		);

		if (!client) {
			throw new InvalidClientError('Invalid client');
		}

		// Validate request parameters
		const request_params = v.parse(
			RequestAuthorizationParamsSchema,
			params,
		);

		// Determine redirect URI
		let redirect_uri = client_params.redirect_uri;
		if (!redirect_uri) {
			if (client.redirect_uris.length === 1) {
				redirect_uri = client.redirect_uris[0];
			} else {
				throw new InvalidRequestError(
					'redirect_uri is required when client has multiple redirect URIs',
				);
			}
		}

		// Validate redirect URI
		if (!client.redirect_uris.includes(redirect_uri)) {
			throw new InvalidClientError('Invalid redirect URI');
		}

		// Parse scopes
		const scopes = request_params.scope
			? request_params.scope.split(' ')
			: [];

		// Call handler
		return this.#handlers.authorize({
			client,
			redirectUri: redirect_uri,
			codeChallenge: request_params.code_challenge,
			state: request_params.state,
			scopes,
			resource: request_params.resource
				? new URL(request_params.resource)
				: undefined,
		});
	}

	/**
	 * Handle token endpoint
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response>}
	 */
	async #handle_token(request) {
		if (request.method !== 'POST') {
			throw new MethodNotAllowedError('Method not allowed', 'POST');
		}

		// Check rate limits
		await this.#check_rate_limit('/token', request);

		// Parse form data
		const form_data = await request.formData();
		const params = Object.fromEntries(form_data);

		if (!params.client_id) {
			// if no client_id is provided, check for basic auth
			const authorization_header = request.headers.get('authorization');
			if (authorization_header) {
				const [type, credentials] = authorization_header.split(' ', 2);
				if (type.toLowerCase() === 'basic' && credentials) {
					const decoded = atob(credentials);
					const [client_id, client_secret] = decoded.split(':', 2);
					params.client_id = client_id;
					if (client_secret) {
						params.client_secret = client_secret;
					}
				}
			}
		}

		// Validate basic token request
		const token_request = v.parse(TokenRequestSchema, params);

		// Authenticate client
		const client_auth = v.parse(ClientAuthenticatedRequestSchema, params);
		const client = await this.#client_store.getClient(
			client_auth.client_id,
		);

		if (!client) {
			throw new InvalidClientError('Invalid client');
		}

		// Verify client secret if provided
		if (
			client.client_secret &&
			client_auth.client_secret !== client.client_secret
		) {
			throw new InvalidClientError('Invalid client credentials');
		}

		// Handle different grant types
		let tokens;
		if (token_request.grant_type === 'authorization_code') {
			const grant = v.parse(AuthorizationCodeGrantSchema, params);
			if (this.#features.pkce) {
				if (!grant.code_verifier) {
					throw new InvalidRequestError(
						'code_verifier is required for PKCE',
					);
				}

				// Get the original code challenge using the retriever function if provided
				if (this.#features.pkce) {
					const original_code_challenge = await this.#features.pkce(
						client,
						grant.code,
					);
					if (!original_code_challenge) {
						throw new InvalidGrantError(
							'Unable to retrieve code challenge for verification',
						);
					}

					if (
						!(await verifyChallenge(
							grant.code_verifier,
							original_code_challenge,
						))
					) {
						throw new InvalidRequestError(
							'Invalid code challenge or verifier',
						);
					}
				}
			}
			tokens = await this.#handlers.exchange({
				type: 'authorization_code',
				client,
				code: grant.code,
				verifier: grant.code_verifier,
				redirectUri: grant.redirect_uri,
				resource: grant.resource ? new URL(grant.resource) : undefined,
			});
		} else if (token_request.grant_type === 'refresh_token') {
			const grant = v.parse(RefreshTokenGrantSchema, params);
			const scopes = grant.scope ? grant.scope.split(' ') : undefined;
			tokens = await this.#handlers.exchange({
				type: 'refresh_token',
				client,
				refreshToken: grant.refresh_token,
				scopes,
				resource: grant.resource ? new URL(grant.resource) : undefined,
			});
		} else {
			throw new InvalidGrantError(
				`Unsupported grant type: ${token_request.grant_type}`,
			);
		}

		return new Response(JSON.stringify(tokens), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Handle client registration endpoint
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response>}
	 */
	async #handle_register(request) {
		if (request.method !== 'POST') {
			throw new MethodNotAllowedError('Method not allowed', 'POST');
		}

		// Check rate limits
		await this.#check_rate_limit('/register', request);

		const client_metadata = v.parse(
			OAuthClientMetadataSchema,
			await request.json(),
		);

		if (!this.#client_store.registerClient) {
			throw new ServerError('Client registration not supported');
		}

		const registeredClient = await this.#client_store.registerClient({
			...client_metadata,
			client_secret: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
			client_secret_expires_at:
				Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
		});

		return new Response(JSON.stringify(registeredClient), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Handle token revocation endpoint
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response>}
	 */
	async #handle_revoke(request) {
		if (request.method !== 'POST') {
			throw new MethodNotAllowedError('Method not allowed', 'POST');
		}

		// Check rate limits
		await this.#check_rate_limit('/revoke', request);

		const form_data = await request.formData();
		const params = Object.fromEntries(form_data);

		// Authenticate client
		const client_auth = v.parse(ClientAuthenticatedRequestSchema, params);
		const client = await this.#client_store.getClient(
			client_auth.client_id,
		);

		if (!client) {
			throw new InvalidClientError('Invalid client');
		}

		if (
			client.client_secret &&
			client_auth.client_secret !== client.client_secret
		) {
			throw new InvalidClientError('Invalid client credentials');
		}

		// Parse revocation request
		const revocation_request = v.parse(
			OAuthTokenRevocationRequestSchema,
			params,
		);

		await this.#handlers.revoke?.(client, {
			token: revocation_request.token,
			tokenType: revocation_request.token_type_hint,
		});

		return new Response(null, { status: 200 });
	}

	/**
	 * Handle bearer token authentication
	 * @param {Request} request - HTTP request
	 * @returns {Promise<Response | null>}
	 */
	async #handle_bearer_auth(request) {
		const auth_header = request.headers.get('authorization');
		if (!auth_header) {
			return this.#create_unauthorized_response(
				'Missing Authorization header',
			);
		}

		const [type, token] = auth_header.split(' ', 2);
		if (type.toLowerCase() !== 'bearer' || !token) {
			return this.#create_unauthorized_response(
				'Invalid Authorization header format',
			);
		}

		try {
			const auth_info = await this.#handlers.verify(token);

			// Check required scopes
			const bearer_config = this.#features.bearer;
			if (typeof bearer_config === 'object' && bearer_config.scopes) {
				const has_all_scopes = bearer_config.scopes.every((scope) =>
					auth_info.scopes.includes(scope),
				);
				if (!has_all_scopes) {
					return this.#create_forbidden_response(
						'Insufficient scope',
					);
				}
			}

			// Token is valid, let the request proceed (return null)
			return null;
		} catch (error) {
			if (error instanceof InvalidTokenError) {
				return this.#create_unauthorized_response(error.message);
			} else if (error instanceof InsufficientScopeError) {
				return this.#create_forbidden_response(error.message);
			}
			throw error;
		}
	}

	/**
	 * Create 401 Unauthorized response
	 * @param {string} error - Error message
	 * @returns {Response}
	 */
	#create_unauthorized_response(error) {
		const bearerConfig = this.#features.bearer;
		let wwwAuth = `Bearer error="invalid_token", error_description="${error}"`;

		if (typeof bearerConfig === 'object' && bearerConfig.resourceUrl) {
			wwwAuth += `, resource_metadata="${bearerConfig.resourceUrl}"`;
		}

		return new Response(
			JSON.stringify({
				error: 'invalid_token',
				error_description: error,
			}),
			{
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': wwwAuth,
				},
			},
		);
	}

	/**
	 * Create 403 Forbidden response
	 * @param {string} error - Error message
	 * @returns {Response}
	 */
	#create_forbidden_response(error) {
		const bearerConfig = this.#features.bearer;
		let wwwAuth = `Bearer error="insufficient_scope", error_description="${error}"`;

		if (typeof bearerConfig === 'object' && bearerConfig.resourceUrl) {
			wwwAuth += `, resource_metadata="${bearerConfig.resourceUrl}"`;
		}

		return new Response(
			JSON.stringify({
				error: 'insufficient_scope',
				error_description: error,
			}),
			{
				status: 403,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': wwwAuth,
				},
			},
		);
	}

	/**
	 * Check rate limits for an endpoint
	 * @param {string} endpoint - Endpoint path
	 * @param {Request} request - HTTP request
	 */
	async #check_rate_limit(endpoint, request) {
		const limits = this.#features.rateLimits?.[endpoint];
		if (!limits) return;

		const client_ip =
			request.headers.get('x-forwarded-for') ||
			request.headers.get('x-real-ip') ||
			'unknown';
		const key = `${endpoint}:${client_ip}`;
		const now = Date.now();

		let counter = this.#rate_limit_counters.get(key);
		if (!counter || now > counter.resetTime) {
			counter = { count: 1, resetTime: now + limits.windowMs };
			this.#rate_limit_counters.set(key, counter);
		} else {
			counter.count++;
		}

		if (counter.count > limits.max) {
			throw new TooManyRequestsError('Rate limit exceeded');
		}
	}

	/**
	 * Handle errors and convert to appropriate HTTP responses
	 * @param {*} error - Error to handle
	 * @param {Request} request - HTTP request
	 * @returns {Response}
	 */
	#handle_error(error, request) {
		if (error instanceof OAuthError) {
			const status = this.#get_error_status(error);
			const response = new Response(
				JSON.stringify(error.toResponseObject()),
				{
					status,
					headers: { 'Content-Type': 'application/json' },
				},
			);

			if (this.#features.cors) {
				this.#add_cors_headers(response, request);
			}

			return response;
		}

		// Generic server error
		const server_error = new ServerError('Internal Server Error');
		const response = new Response(
			JSON.stringify(server_error.toResponseObject()),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);

		if (this.#features.cors) {
			this.#add_cors_headers(response, request);
		}

		return response;
	}

	/**
	 * Get HTTP status code for OAuth error
	 * @param {OAuthError} error - OAuth error
	 * @returns {number}
	 */
	#get_error_status(error) {
		if (error instanceof InvalidClientError) return 401;
		if (error instanceof InvalidTokenError) return 401;
		if (error instanceof InsufficientScopeError) return 403;
		if (error instanceof MethodNotAllowedError) return 405;
		if (error instanceof TooManyRequestsError) return 429;
		if (error instanceof ServerError) return 500;
		return 400; // Default for most OAuth errors
	}
}
