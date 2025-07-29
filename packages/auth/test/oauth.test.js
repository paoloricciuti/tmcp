/**
 * @import { OAuthClientInformationFull } from '../src/types.js'
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { OAuth, SimpleProvider, MemoryClientStore } from '../src/index.js';

describe('OAuth', () => {
	/** @type {OAuthClientInformationFull} */
	const testClient = {
		client_id: 'test-client',
		client_secret: 'test-secret',
		redirect_uris: ['https://example.com/callback'],
		client_id_issued_at: Math.floor(Date.now() / 1000),
	};

	describe('Basic functionality', () => {
		it('creates OAuth instance with issuer', () => {
			const oauth = OAuth.create('https://auth.example.com');
			expect(oauth).toBeDefined();
		});

		it('creates OAuth instance with static issuer method', () => {
			const oauth = OAuth.issuer('https://auth.example.com');
			expect(oauth).toBeDefined();
		});

		it('validates HTTPS requirement', () => {
			expect(() => {
				OAuth.create('http://auth.example.com');
			}).toThrow('Issuer URL must be HTTPS');
		});

		it('allows localhost HTTP', () => {
			expect(() => {
				OAuth.create('http://localhost:3000');
			}).not.toThrow();
		});

		it('rejects URLs with fragments', () => {
			expect(() => {
				OAuth.create('https://auth.example.com#fragment');
			}).toThrow('Issuer URL must not have a fragment');
		});

		it('rejects URLs with query strings', () => {
			expect(() => {
				OAuth.create('https://auth.example.com?param=value');
			}).toThrow('Issuer URL must not have a query string');
		});
	});

	describe('Fluent API', () => {
		/**
		 * @type {OAuth}
		 */
		let oauth;

		beforeEach(() => {
			oauth = OAuth.create('https://auth.example.com');
		});

		it('allows method chaining', () => {
			const result = oauth
				.scopes('read', 'write')
				.cors(true)
				.bearer(['read'])
				.pkce(async () => {
					return '';
				});

			expect(result).toBe(oauth);
		});

		it('sets scopes correctly', () => {
			const result = oauth.scopes('read', 'write', 'admin');
			expect(result).toBe(oauth);
		});

		it('configures memory store', () => {
			const result = oauth.memory([testClient]);
			expect(result).toBe(oauth);
		});

		it('configures custom client store', () => {
			const store = new MemoryClientStore([testClient]);
			const result = oauth.clients(store);
			expect(result).toBe(oauth);
		});

		it('configures bearer token with array', () => {
			const result = oauth.bearer(['read', 'write']);
			expect(result).toBe(oauth);
		});

		it('configures bearer token with object', () => {
			const result = oauth.bearer({
				scopes: ['read'],
				resourceUrl: 'https://api.example.com/resource',
			});
			expect(result).toBe(oauth);
		});

		it('configures CORS', () => {
			const result = oauth.cors({
				origin: 'https://app.example.com',
				credentials: true,
			});
			expect(result).toBe(oauth);
		});
	});

	describe('Handler configuration', () => {
		it('throws error when handlers are missing', () => {
			expect(() => {
				OAuth.create('https://auth.example.com').build();
			}).toThrow('OAuth handlers must be provided');
		});

		it('builds successfully with handlers', () => {
			/**
			 * @type {import('../src/oauth.js').SimplifiedHandlers}
			 */
			const handlers = {
				async authorize(request) {
					const redirectUrl = new URL(request.redirectUri);
					redirectUrl.searchParams.set('code', 'test-code');
					return new Response(null, {
						status: 302,
						headers: { Location: redirectUrl.toString() },
					});
				},
				async exchange() {
					return {
						access_token: 'test-token',
						token_type: 'bearer',
						expires_in: 3600,
					};
				},
				async verify(token) {
					return {
						token,
						clientId: 'test-client',
						scopes: ['read'],
						expiresAt: Date.now() / 1000 + 3600,
					};
				},
			};

			const oauth = OAuth.create('https://auth.example.com')
				.handlers(handlers)
				.build();

			expect(oauth).toBeDefined();
		});
	});

	describe('HTTP handling', () => {
		/**
		 * @type {OAuth<"built">}
		 */
		let oauth;

		beforeEach(() => {
			/**
			 * @type {import('../src/oauth.js').SimplifiedHandlers}
			 */
			const handlers = {
				async authorize(request) {
					const redirectUrl = new URL(request.redirectUri);
					redirectUrl.searchParams.set('code', 'test-code');
					if (request.state) {
						redirectUrl.searchParams.set('state', request.state);
					}
					return new Response(null, {
						status: 302,
						headers: { Location: redirectUrl.toString() },
					});
				},
				async exchange(grant) {
					if (grant.type === 'authorization_code') {
						return {
							access_token: 'test-access-token',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: 'test-refresh-token',
						};
					} else if (grant.type === 'refresh_token') {
						return {
							access_token: 'new-access-token',
							token_type: 'bearer',
							expires_in: 3600,
							refresh_token: grant.refreshToken,
						};
					}
					throw new Error(
						`Unsupported grant type: ${/** @type {*} */ (grant).type}`,
					);
				},
				async verify(token) {
					if (token === 'valid-token') {
						return {
							token,
							clientId: 'test-client',
							scopes: ['read', 'write'],
							expiresAt: Date.now() / 1000 + 3600,
						};
					}
					throw new Error('Invalid token');
				},
			};

			oauth = OAuth.create('https://auth.example.com')
				.memory([testClient])
				.handlers(handlers)
				.build();
		});

		it('returns null for non-matching requests', async () => {
			const request = new Request('https://other.example.com/test');
			const response = await oauth.respond(request);
			expect(response).toBeNull();
		});

		it('handles authorization server metadata', async () => {
			const request = new Request(
				'https://auth.example.com/.well-known/oauth-authorization-server',
			);
			const response = await oauth.respond(request);

			expect(response?.status).toBe(200);
			expect(response?.headers.get('Content-Type')).toBe(
				'application/json',
			);

			const metadata = await response?.json();
			expect(metadata?.issuer).toBe('https://auth.example.com/');
			expect(metadata?.authorization_endpoint).toBe(
				'https://auth.example.com/authorize',
			);
			expect(metadata?.token_endpoint).toBe(
				'https://auth.example.com/token',
			);
		});

		it('handles protected resource metadata', async () => {
			const request = new Request(
				'https://auth.example.com/.well-known/oauth-protected-resource',
			);
			const response = await oauth.respond(request);

			expect(response?.status).toBe(200);
			expect(response?.headers.get('Content-Type')).toBe(
				'application/json',
			);

			const metadata = await response?.json();
			expect(metadata?.resource).toBe('https://auth.example.com/');
		});

		it('handles authorization requests', async () => {
			const url = new URL('https://auth.example.com/authorize');
			url.searchParams.set('client_id', 'test-client');
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('code_challenge', 'challenge123');
			url.searchParams.set('code_challenge_method', 'S256');
			url.searchParams.set('state', 'state123');

			const request = new Request(url);
			const response = await oauth.respond(request);

			expect(response?.status).toBe(302);
			const location = response?.headers.get('Location');
			expect(location).toContain('code=test-code');
			expect(location).toContain('state=state123');
		});

		it('handles token requests', async () => {
			const formData = new FormData();
			formData.append('client_id', 'test-client');
			formData.append('client_secret', 'test-secret');
			formData.append('grant_type', 'authorization_code');
			formData.append('code', 'test-code');
			formData.append('code_verifier', 'verifier123');

			const request = new Request('https://auth.example.com/token', {
				method: 'POST',
				body: formData,
			});

			const response = await oauth.respond(request);
			expect(response?.status).toBe(200);

			const tokens = await response?.json();
			expect(tokens?.access_token).toBe('test-access-token');
			expect(tokens?.token_type).toBe('bearer');
		});

		it('returns method not allowed for invalid methods', async () => {
			const request = new Request('https://auth.example.com/authorize', {
				method: 'DELETE',
			});

			const response = await oauth.respond(request);
			expect(response?.status).toBe(405);
		});
	});

	describe('SimpleProvider integration', () => {
		it('works with SimpleProvider', () => {
			const provider = SimpleProvider.withClient(
				'test-client',
				'test-secret',
				['https://example.com/callback'],
			);

			const oauth = OAuth.create('https://auth.example.com')
				.clients(provider.clientStore)
				.handlers(provider.handlers())
				.build();

			expect(oauth).toBeDefined();
		});

		it('handles full OAuth flow with SimpleProvider', async () => {
			const provider = SimpleProvider.withClient(
				'test-client',
				'test-secret',
				['https://example.com/callback'],
			);

			const oauth = OAuth.create('https://auth.example.com')
				.clients(provider.clientStore)
				.handlers(provider.handlers())
				.build();

			// Test authorization request
			const authUrl = new URL('https://auth.example.com/authorize');
			authUrl.searchParams.set('client_id', 'test-client');
			authUrl.searchParams.set('response_type', 'code');
			authUrl.searchParams.set('code_challenge', 'challenge123');
			authUrl.searchParams.set('code_challenge_method', 'S256');
			authUrl.searchParams.set(
				'redirect_uri',
				'https://example.com/callback',
			);

			const authResponse = await oauth.respond(new Request(authUrl));
			expect(authResponse?.status).toBe(302);

			// Extract code from redirect
			const location = authResponse?.headers.get('Location');
			const redirectUrl = new URL(/** @type {string} */ (location));
			const code = redirectUrl.searchParams.get('code');
			expect(code).toBeTruthy();

			// Test token exchange
			const tokenFormData = new FormData();
			tokenFormData.append('client_id', 'test-client');
			tokenFormData.append('client_secret', 'test-secret');
			tokenFormData.append('grant_type', 'authorization_code');
			tokenFormData.append('code', /** @type {*} */ (code));
			tokenFormData.append('code_verifier', 'verifier123');
			tokenFormData.append(
				'redirect_uri',
				'https://example.com/callback',
			);

			const tokenResponse = await oauth.respond(
				new Request('https://auth.example.com/token', {
					method: 'POST',
					body: tokenFormData,
				}),
			);

			expect(tokenResponse?.status).toBe(200);
			const tokens = await tokenResponse?.json();
			expect(tokens?.access_token).toBeTruthy();
			expect(tokens?.token_type).toBe('bearer');
		});
	});

	describe('CORS handling', () => {
		it('handles CORS preflight requests', async () => {
			const oauth = OAuth.create('https://auth.example.com')
				.cors({ origin: 'https://app.example.com', credentials: true })
				.handlers({
					async authorize() {
						return new Response(null, { status: 302 });
					},
					async exchange() {
						return { access_token: 'token', token_type: 'bearer' };
					},
					async verify() {
						return {
							token: 'token',
							clientId: 'client',
							scopes: [],
							expiresAt: Date.now() / 1000 + 3600,
						};
					},
				})
				.build();

			const request = new Request('https://auth.example.com/authorize', {
				method: 'OPTIONS',
				headers: {
					Origin: 'https://app.example.com',
					'Access-Control-Request-Method': 'GET',
				},
			});

			const response = await oauth.respond(request);
			expect(response?.status).toBe(204);
			expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
				'https://app.example.com',
			);
			expect(
				response?.headers.get('Access-Control-Allow-Credentials'),
			).toBe('true');
		});
	});
});
