/**
 * @import { OAuthClientInformationFull } from '../src/types.js'
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { OAuth, SimpleProvider, MemoryClientStore } from '../src/index.js';

describe('OAuth (Fluent Builder)', () => {
	/** @type {OAuthClientInformationFull} */
	const testClient = {
		client_id: 'test-client',
		client_secret: 'test-secret',
		redirect_uris: ['https://example.com/callback'],
		client_id_issued_at: Math.floor(Date.now() / 1000),
	};

	describe('Basic builder functionality', () => {
		it('creates OAuth instance with issuer', () => {
			const oauth = OAuth.create('https://auth.example.com');
			expect(oauth).toBeDefined();
		});

		it('creates OAuth instance with static issuer method', () => {
			const oauth = OAuth.issuer('https://auth.example.com');
			expect(oauth).toBeDefined();
		});

		it('allows method chaining', () => {
			const oauth = OAuth.create('https://auth.example.com')
				.scopes('read', 'write')
				.cors(true)
				.bearer(['read']);

			expect(oauth).toBeDefined();
		});
	});

	describe('Configuration methods', () => {
		/**
		 * @type {OAuth}
		 */
		let oauth;

		beforeEach(() => {
			oauth = OAuth.create('https://auth.example.com');
		});

		it('sets scopes correctly', () => {
			const result = oauth.scopes('read', 'write', 'admin');
			expect(result).toBe(oauth); // Returns self for chaining
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

		it('configures PKCE', () => {
			const result = oauth.pkce(async () => '');
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

		it('configures CORS with boolean', () => {
			const result = oauth.cors(true);
			expect(result).toBe(oauth);
		});

		it('configures CORS with object', () => {
			const result = oauth.cors({
				origin: 'https://app.example.com',
				credentials: true,
			});
			expect(result).toBe(oauth);
		});

		it('configures registration', () => {
			const result = oauth.registration(true);
			expect(result).toBe(oauth);
		});

		it('configures rate limiting', () => {
			const limits = {
				'/token': { windowMs: 60000, max: 100 },
			};
			const result = oauth.rateLimit(limits);
			expect(result).toBe(oauth);
		});
	});

	describe('Handler configuration', () => {
		it('accepts simplified handlers', () => {
			/**
			 * @type {import('../src/oauth.js').SimplifiedHandlers}
			 */
			const handlers = {
				async authorize(request) {
					const redirect_url = new URL(request.redirectUri);
					redirect_url.searchParams.set('code', 'test-code');
					return new Response(null, {
						status: 302,
						headers: { Location: redirect_url.toString() },
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

			const oauth = OAuth.create('https://auth.example.com').handlers(
				handlers,
			);

			expect(oauth).toBeDefined();
		});
	});

	describe('Provider building', () => {
		it('throws error when handlers are missing', () => {
			expect(() => {
				OAuth.create('https://auth.example.com').build();
			}).toThrow('OAuth handlers must be provided');
		});

		it('builds provider with handlers', () => {
			const handlers = {
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
			};

			const provider = OAuth.create('https://auth.example.com')
				.handlers(handlers)
				.build();

			expect(provider).toBeDefined();
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

		it('creates SimpleProvider with default options', () => {
			const provider = new SimpleProvider();
			expect(provider).toBeDefined();
			expect(provider.clientStore).toBeDefined();
		});

		it('creates SimpleProvider with client', () => {
			const provider = SimpleProvider.withClient(
				'client-id',
				'client-secret',
				['https://example.com/callback'],
			);

			expect(provider).toBeDefined();
			expect(provider.clientStore.getAllClients()).toHaveLength(1);
		});
	});

	describe('MemoryClientStore', () => {
		it('creates empty store', () => {
			const store = new MemoryClientStore();
			expect(store.getAllClients()).toHaveLength(0);
		});

		it('creates store with initial clients', () => {
			const store = new MemoryClientStore([testClient]);
			expect(store.getAllClients()).toHaveLength(1);
		});

		it('adds and retrieves clients', async () => {
			const store = new MemoryClientStore();
			store.addClient(testClient);

			const retrieved = await store.getClient('test-client');
			expect(retrieved).toEqual(testClient);
		});

		it('registers new clients', async () => {
			const store = new MemoryClientStore();
			const newClient = await store.registerClient({
				redirect_uris: ['https://example.com/callback'],
				client_secret: 'secret',
			});

			expect(newClient.client_id).toBeDefined();
			expect(newClient.client_id_issued_at).toBeDefined();
			expect(newClient.redirect_uris).toEqual([
				'https://example.com/callback',
			]);
		});

		it('removes clients', () => {
			const store = new MemoryClientStore([testClient]);
			expect(store.getAllClients()).toHaveLength(1);

			const removed = store.removeClient('test-client');
			expect(removed).toBe(true);
			expect(store.getAllClients()).toHaveLength(0);
		});

		it('clears all clients', () => {
			const store = new MemoryClientStore([testClient]);
			expect(store.getAllClients()).toHaveLength(1);

			store.clear();
			expect(store.getAllClients()).toHaveLength(0);
		});
	});
});
