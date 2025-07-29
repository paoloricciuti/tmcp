/**
 * @import { OAuthClientInformationFull } from '../src/types.js'
 */

import { describe, expect, it } from 'vitest';
import { OAuth } from '../src/index.js';

describe('Code Challenge Retrieval API', () => {
	/** @type {OAuthClientInformationFull} */
	const testClient = {
		client_id: 'test-client',
		client_secret: 'test-secret',
		redirect_uris: ['https://example.com/callback'],
		client_id_issued_at: Math.floor(Date.now() / 1000),
	};

	describe('PKCE verification with custom retrieval', () => {
		it('calls the retrieval function during token exchange', async () => {
			let retrievalCalled = false;
			let retrievedCode = '';

			const oauth = OAuth.issuer('https://auth.example.com')
				.memory([testClient])
				.pkce(async (client, code) => {
					retrievalCalled = true;
					retrievedCode = code;
					return 'test_challenge';
				}) // Enable PKCE
				.handlers({
					async authorize() {
						return new Response(null, {
							status: 302,
							headers: { Location: 'https://example.com' },
						});
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

			// Mock a token exchange request
			const formData = new FormData();
			formData.append('client_id', 'test-client');
			formData.append('client_secret', 'test-secret');
			formData.append('grant_type', 'authorization_code');
			formData.append('code', 'test_auth_code');
			formData.append('code_verifier', 'test_verifier');

			const request = new Request('https://auth.example.com/token', {
				method: 'POST',
				body: formData,
			});

			// This should call our retrieval function
			await oauth.respond(request);

			expect(retrievalCalled).toBe(true);
			expect(retrievedCode).toBe('test_auth_code');
		});

		it('throws error when retrieval function returns falsy value', async () => {
			const oauth = OAuth.issuer('https://auth.example.com')
				.memory([testClient])
				.pkce(async () => {
					return ''; // Return empty string (falsy)
				}) // Enable PKCE
				.handlers({
					async authorize() {
						return new Response(null, {
							status: 302,
							headers: { Location: 'https://example.com' },
						});
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

			const formData = new FormData();
			formData.append('client_id', 'test-client');
			formData.append('client_secret', 'test-secret');
			formData.append('grant_type', 'authorization_code');
			formData.append('code', 'nonexistent_code');
			formData.append('code_verifier', 'test_verifier');

			const request = new Request('https://auth.example.com/token', {
				method: 'POST',
				body: formData,
			});

			const response = await oauth.respond(request);
			expect(response?.status).toBe(400);

			const error = await response?.json();
			expect(error?.error).toBe('invalid_grant');
			expect(error?.error_description).toContain(
				'Unable to retrieve code challenge',
			);
		});

		it('skips PKCE verification when no retrieval function is provided', async () => {
			const oauth = OAuth.issuer('https://auth.example.com')
				.memory([testClient])
				.handlers({
					async authorize() {
						return new Response(null, {
							status: 302,
							headers: { Location: 'https://example.com' },
						});
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
				// No code_challenge_retrieval configured
				.build();

			const formData = new FormData();
			formData.append('client_id', 'test-client');
			formData.append('client_secret', 'test-secret');
			formData.append('grant_type', 'authorization_code');
			formData.append('code', 'test_code');
			formData.append('code_verifier', 'test_verifier');

			const request = new Request('https://auth.example.com/token', {
				method: 'POST',
				body: formData,
			});

			const response = await oauth.respond(request);
			// Should succeed because PKCE verification is skipped when no retrieval function is provided
			expect(response?.status).toBe(200);
		});
	});
});
