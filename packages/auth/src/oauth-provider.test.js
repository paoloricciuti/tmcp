/**
 * @import { AuthInfo, OAuthClientInformationFull, OAuthTokens, AuthorizationParams } from './types.js'
 * @import { OAuthServerProvider } from './provider-interfaces.js'
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuthProvider } from './oauth-provider.js';
import { InvalidTokenError } from './errors.js';

describe('OAuthProvider', () => {
	// Mock client data
	const validClient = {
		client_id: 'valid-client',
		client_secret: 'valid-secret',
		redirect_uris: ['https://example.com/callback'],
	};

	const multiRedirectClient = {
		client_id: 'multi-redirect-client',
		client_secret: 'valid-secret',
		redirect_uris: [
			'https://example.com/callback1',
			'https://example.com/callback2'
		],
	};

	// Mock client store
	const mockClientStore = {
		async getClient(clientId) {
			if (clientId === 'valid-client') {
				return validClient;
			} else if (clientId === 'multi-redirect-client') {
				return multiRedirectClient;
			}
			return undefined;
		}
	};

	// Mock provider
	const mockProvider = {
		clientsStore: mockClientStore,

		async authorize(client, params) {
			// Mock implementation - returns redirect response
			const redirectUrl = new URL(params.redirectUri);
			redirectUrl.searchParams.set('code', 'mock_auth_code');
			if (params.state) {
				redirectUrl.searchParams.set('state', params.state);
			}
			
			return new Response(null, {
				status: 302,
				headers: {
					'Location': redirectUrl.toString(),
				},
			});
		},

		async challengeForAuthorizationCode() {
			return 'mock_challenge';
		},

		async exchangeAuthorizationCode() {
			return {
				access_token: 'mock_access_token',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'mock_refresh_token'
			};
		},

		async exchangeRefreshToken() {
			return {
				access_token: 'new_mock_access_token',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'new_mock_refresh_token'
			};
		},

		async verifyAccessToken(token) {
			if (token === 'valid_token') {
				return {
					token,
					clientId: 'valid-client',
					scopes: ['read', 'write'],
					expiresAt: Date.now() / 1000 + 3600
				};
			}
			throw new InvalidTokenError('Token is invalid or expired');
		},

		async revokeToken() {
			// Do nothing in mock
		}
	};

	/** @type {OAuthProvider} */
	let oauthProvider;

	beforeEach(() => {
		oauthProvider = new OAuthProvider({
			provider: mockProvider,
			issuerUrl: new URL('https://auth.example.com'),
		});
	});

	describe('Configuration validation', () => {
		it('rejects non-HTTPS issuer URL', () => {
			expect(() => {
				new OAuthProvider({
					provider: mockProvider,
					issuerUrl: new URL('http://auth.example.com'),
				});
			}).toThrow('Issuer URL must be HTTPS');
		});

		it('allows localhost HTTP for development', () => {
			expect(() => {
				new OAuthProvider({
					provider: mockProvider,
					issuerUrl: new URL('http://localhost:3000'),
				});
			}).not.toThrow();
		});

		it('rejects issuer URL with fragment', () => {
			expect(() => {
				new OAuthProvider({
					provider: mockProvider,
					issuerUrl: new URL('https://auth.example.com#fragment'),
				});
			}).toThrow('Issuer URL must not have a fragment');
		});

		it('rejects issuer URL with query string', () => {
			expect(() => {
				new OAuthProvider({
					provider: mockProvider,
					issuerUrl: new URL('https://auth.example.com?param=value'),
				});
			}).toThrow('Issuer URL must not have a query string');
		});
	});

	describe('Request routing', () => {
		it('returns null for unhandled paths', async () => {
			const request = new Request('https://auth.example.com/unknown');
			const response = await oauthProvider.respond(request);
			expect(response).toBeNull();
		});

		it('handles authorization endpoint GET requests', async () => {
			const url = new URL('https://auth.example.com/authorize');
			url.searchParams.set('client_id', 'valid-client');
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('code_challenge', 'challenge123');
			url.searchParams.set('code_challenge_method', 'S256');
			
			const request = new Request(url);
			const response = await oauthProvider.respond(request);
			
			expect(response).toBeDefined();
			expect(response?.status).toBe(302);
		});

		it('handles token endpoint POST requests', async () => {
			const formData = new FormData();
			formData.append('client_id', 'valid-client');
			formData.append('client_secret', 'valid-secret');
			formData.append('grant_type', 'authorization_code');
			formData.append('code', 'valid_code');
			formData.append('code_verifier', 'valid_verifier');

			const request = new Request('https://auth.example.com/token', {
				method: 'POST',
				body: formData,
			});

			const response = await oauthProvider.respond(request);
			expect(response).toBeDefined();
			expect(response?.status).toBe(200);
		});

		it('returns method not allowed for invalid methods', async () => {
			const request = new Request('https://auth.example.com/authorize', {
				method: 'DELETE',
			});

			const response = await oauthProvider.respond(request);
			expect(response?.status).toBe(405);
			expect(response?.headers.get('Allow')).toContain('GET');
		});
	});

	describe('Metadata endpoints', () => {
		it('returns authorization server metadata', async () => {
			const request = new Request('https://auth.example.com/.well-known/oauth-authorization-server');
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(200);
			expect(response?.headers.get('Content-Type')).toBe('application/json');

			const metadata = await response?.json();
			expect(metadata?.issuer).toBe('https://auth.example.com/');
			expect(metadata?.authorization_endpoint).toBe('https://auth.example.com/authorize');
			expect(metadata?.token_endpoint).toBe('https://auth.example.com/token');
		});

		it('returns protected resource metadata', async () => {
			const request = new Request('https://auth.example.com/.well-known/oauth-protected-resource');
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(200);
			expect(response?.headers.get('Content-Type')).toBe('application/json');

			const metadata = await response?.json();
			expect(metadata?.resource).toBe('https://auth.example.com/');
			expect(metadata?.authorization_servers).toContain('https://auth.example.com/');
		});
	});

	describe('Authorization flow', () => {
		it('validates client_id parameter', async () => {
			const request = new Request('https://auth.example.com/authorize');
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(400);
			const error = await response?.json();
			expect(error?.error).toBe('invalid_request');
		});

		it('validates that client exists', async () => {
			const url = new URL('https://auth.example.com/authorize');
			url.searchParams.set('client_id', 'nonexistent-client');
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('code_challenge', 'challenge123');
			url.searchParams.set('code_challenge_method', 'S256');
			
			const request = new Request(url);
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(400);
			const error = await response?.json();
			expect(error?.error).toBe('invalid_client');
		});

		it('uses the only redirect_uri if client has just one and none provided', async () => {
			const url = new URL('https://auth.example.com/authorize');
			url.searchParams.set('client_id', 'valid-client');
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('code_challenge', 'challenge123');
			url.searchParams.set('code_challenge_method', 'S256');
			
			const request = new Request(url);
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(302);
			const location = response?.headers.get('Location');
			expect(location).toContain('https://example.com/callback');
		});

		it('requires redirect_uri if client has multiple', async () => {
			const url = new URL('https://auth.example.com/authorize');
			url.searchParams.set('client_id', 'multi-redirect-client');
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('code_challenge', 'challenge123');
			url.searchParams.set('code_challenge_method', 'S256');
			
			const request = new Request(url);
			const response = await oauthProvider.respond(request);

			expect(response?.status).toBe(400);
			const error = await response?.json();
			expect(error?.error).toBe('invalid_request');
		});
	});
});