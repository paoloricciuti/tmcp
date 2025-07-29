# @tmcp/auth

OAuth 2.1 authorization helper for MCP with simplified fluent API and valibot validation.

## Features

- **Fluent API**: Clean, chainable methods for easy configuration
- **Auto-configuration**: Smart defaults for rapid development setup
- **Web Request/Response API**: Works with modern Web APIs instead of Express
- **Valibot Validation**: Uses valibot for schema validation instead of zod
- **JSDoc + TypeScript**: Full type safety with JSDoc annotations
- **OAuth 2.1 Compliant**: Supports all standard OAuth 2.1 flows
- **MCP Compatible**: Designed specifically for Model Context Protocol servers
- **Lightweight**: Minimal dependencies, no Express required
- **Bearer Authentication**: Integrated Bearer token validation
- **Proxy Support**: Built-in proxy provider for upstream OAuth servers
- **Memory Store**: In-memory client storage for development

## Installation

```bash
pnpm install @tmcp/auth valibot pkce-challenge
```

## Quick Start (New Fluent API - Recommended)

```javascript
import { OAuth, SimpleProvider } from '@tmcp/auth';

// Custom OAuth server with handlers
const auth = OAuth.issuer('https://auth.example.com')
	.scopes('read', 'write')
	.memory([
		{
			client_id: 'test-client',
			client_secret: 'test-secret',
			redirect_uris: ['https://app.example.com/callback'],
			client_id_issued_at: Math.floor(Date.now() / 1000),
		},
	])
	.handlers({
		async authorize(request) {
			// Generate authorization code and redirect
			const redirectUrl = new URL(request.redirectUri);
			redirectUrl.searchParams.set('code', 'auth_code_' + Date.now());
			if (request.state) {
				redirectUrl.searchParams.set('state', request.state);
			}
			return new Response(null, {
				status: 302,
				headers: { Location: redirectUrl.toString() },
			});
		},

		async exchange(request) {
			if (request.type === 'authorization_code') {
				return {
					access_token: 'access_token_' + Date.now(),
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'refresh_token_' + Date.now(),
				};
			} else if (request.type === 'refresh_token') {
				return {
					access_token: 'new_access_token_' + Date.now(),
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: request.refreshToken,
				};
			}
			throw new Error('Unsupported grant type');
		},

		async verify(token) {
			// Verify token and return auth info
			if (token.startsWith('access_token_')) {
				return {
					token,
					clientId: 'test-client',
					scopes: ['read', 'write'],
					expiresAt: Math.floor(Date.now() / 1000) + 3600,
				};
			}
			throw new Error('Invalid token');
		},

		async revoke(client, request) {
			// Revoke the token
			console.log(
				`Revoking token ${request.token} for client ${client.client_id}`,
			);
		},
	})
	.cors({ origin: 'https://app.example.com', credentials: true })
	.bearer(['read'])
	.build();

// Handle requests
async function handleRequest(request) {
	return (
		(await auth.respond(request)) ||
		new Response('Not Found', { status: 404 })
	);
}

// Or use SimpleProvider for quick development
const simpleAuth = OAuth.issuer('https://auth.example.com')
	.clients(
		SimpleProvider.withClient('demo-client', 'demo-secret', [
			'https://app.example.com/callback',
		]).clientStore,
	)
	.handlers(
		SimpleProvider.withClient('demo-client', 'demo-secret', [
			'https://app.example.com/callback',
		]).handlers(),
	)
	.cors(true)
	.build();
```

## PKCE Code Challenge Retrieval

When using PKCE (Proof Key for Code Exchange), you need to verify that the `code_verifier` provided during token exchange matches the `code_challenge` that was submitted during the initial authorization request. The `.pkce()` method allows you to provide a custom function to retrieve the original code challenge from your storage system.

```javascript
// In-memory storage for demonstration (use database/cache in production)
const codeChallengeStore = new Map();

const auth = OAuth.issuer('https://auth.example.com')
	.memory([
		/* your clients */
	])
	.handlers({
		async authorize(request) {
			// Store the code challenge when issuing authorization code
			const authCode = 'auth_' + Date.now();
			codeChallengeStore.set(authCode, request.codeChallenge);

			const redirectUrl = new URL(request.redirectUri);
			redirectUrl.searchParams.set('code', authCode);
			return new Response(null, {
				status: 302,
				headers: { Location: redirectUrl.toString() },
			});
		},
		// ... other handlers
	})
	// Configure PKCE code challenge retrieval
	.pkce(async (client, authorizationCode) => {
		// Retrieve the original code challenge from your storage
		const challenge = codeChallengeStore.get(authorizationCode);
		if (!challenge) {
			throw new Error('Code challenge not found');
		}
		return challenge;
	})
	.build();
```

**Key Points:**

- The retrieval function receives the client and authorization code as parameters
- It should return the original `code_challenge` that was stored during authorization
- If the challenge cannot be found, return a falsy value or throw an error
- This function is only called when PKCE is enabled and a `code_verifier` is provided
- Use your preferred storage mechanism (database, Redis, etc.) in production

## Advanced Configuration

The OAuth fluent API supports all configuration options:

```javascript
const auth = OAuth.issuer('https://auth.example.com')
	.scopes('read', 'write', 'admin')
	.memory([
		/* initial clients */
	])
	.handlers({
		// Implementation of authorize, exchange, verify, revoke
	})
	.cors({
		origin: ['https://app.example.com', 'https://staging.example.com'],
		credentials: true,
		maxAge: 86400,
	})
	.bearer({
		scopes: ['read'],
		resourceUrl:
			'https://api.example.com/.well-known/oauth-protected-resource',
	})
	.registration(true)
	.rateLimit({
		'/authorize': { windowMs: 15 * 60 * 1000, max: 100 },
		'/token': { windowMs: 15 * 60 * 1000, max: 50 },
	})
	.pkce(async (client, authCode) => {
		// Retrieve stored code challenge for PKCE validation
		return getStoredChallenge(authCode);
	})
	.build();
```

## Supported Endpoints

The OAuth provider automatically handles these endpoints:

### Authorization Server Endpoints

- `GET/POST /authorize` - OAuth 2.1 authorization endpoint
- `POST /token` - Token exchange endpoint
- `POST /register` - Dynamic client registration (if supported)
- `POST /revoke` - Token revocation (if supported)

### Metadata Endpoints

- `GET /.well-known/oauth-authorization-server` - Authorization server metadata
- `GET /.well-known/oauth-protected-resource` - Protected resource metadata

## Configuration Methods

The OAuth class provides these fluent configuration methods:

- **`.issuer(url)`** - Set the OAuth issuer URL (required)
- **`.scopes(...scopes)`** - Define supported scopes
- **`.memory(clients)`** - Use in-memory client store with optional initial clients
- **`.clients(store)`** - Use custom client store
- **`.handlers(handlers)`** - Set OAuth operation handlers (required)
- **`.cors(config)`** - Configure CORS (boolean or detailed config)
- **`.bearer(config)`** - Configure bearer token authentication
- **`.registration(enabled)`** - Enable/disable dynamic client registration
- **`.rateLimit(limits)`** - Configure rate limiting per endpoint
- **`.pkce(retriever)`** - Configure PKCE code challenge retrieval
- **`.build()`** - Build the final OAuth instance

## CORS Configuration

Configure Cross-Origin Resource Sharing (CORS) for web applications using the `.cors()` method:

```javascript
const auth = OAuth.issuer('https://auth.example.com')
	.cors({
		origin: ['https://app.example.com', 'https://localhost:3000'], // Specific origins
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true, // Allow cookies and authentication headers
		maxAge: 86400, // Cache preflight for 24 hours
	})
	.build();
```

**Common CORS Configurations:**

```javascript
// Simple enable (allows all origins)
.cors(true)

// Allow all origins (development only)
.cors({ origin: '*' })

// Single origin
.cors({ origin: 'https://app.example.com' })

// Multiple specific origins
.cors({
  origin: ['https://app.example.com', 'https://staging.example.com'],
  credentials: true
})

// Full configuration
.cors({
  origin: ['https://app.example.com', 'https://staging.example.com', 'https://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 7200
})
```

**CORS Features:**

- **Automatic preflight handling** - OPTIONS requests are handled automatically
- **Origin validation** - Support for single origins (string), multiple origins (array), or wildcard ('\*')
- **Credential support** - Enable cookies and authentication headers
- **Header management** - Control allowed and exposed headers
- **Caching control** - Configure preflight cache duration

## Handler Interface

Your handlers object must implement the simplified handlers interface:

```javascript
const handlers = {
	// Required: Handle authorization requests
	async authorize(request) {
		// request: { client, redirectUri, codeChallenge, state?, scopes?, resource? }
		// Return: Response (typically a redirect)
		const redirectUrl = new URL(request.redirectUri);
		redirectUrl.searchParams.set('code', generateAuthCode());
		return new Response(null, {
			status: 302,
			headers: { Location: redirectUrl.toString() },
		});
	},

	// Required: Handle token exchange
	async exchange(request) {
		// request: ExchangeAuthorizationCodeRequest | ExchangeRefreshTokenRequest
		if (request.type === 'authorization_code') {
			// Handle authorization code exchange
			return {
				access_token: 'access_token_123',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'refresh_token_123',
			};
		} else if (request.type === 'refresh_token') {
			// Handle refresh token exchange
			return {
				access_token: 'new_access_token_456',
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: request.refreshToken,
			};
		}
	},

	// Required: Verify access tokens
	async verify(token) {
		// Return: AuthInfo object
		return {
			token,
			clientId: 'client_id',
			scopes: ['read', 'write'],
			expiresAt: Math.floor(Date.now() / 1000) + 3600,
		};
	},

	// Optional: Revoke tokens
	async revoke(client, request) {
		// request: { token, tokenType? }
		// Revoke the specified token
	},
};
```

## Error Handling

The provider automatically handles OAuth errors and returns appropriate HTTP responses:

```javascript
import {
	InvalidRequestError,
	InvalidClientError,
	InvalidGrantError,
	InvalidScopeError,
	AccessDeniedError,
	UnsupportedGrantTypeError,
	InvalidTokenError,
	InsufficientScopeError,
} from '@tmcp/auth';
```

## Rate Limiting

Configure rate limits per endpoint using the `.rateLimit()` method:

```javascript
const auth = OAuth.issuer('https://auth.example.com')
	.rateLimit({
		'/authorize': { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
		'/token': { windowMs: 15 * 60 * 1000, max: 50 }, // 50 requests per 15 minutes
		'/register': { windowMs: 60 * 60 * 1000, max: 20 }, // 20 requests per hour
	})
	.build();
```

## Bearer Authentication

Bearer token authentication is integrated directly into the OAuth class using the `.bearer()` method:

```javascript
const auth = OAuth.issuer('https://auth.example.com')
	.scopes('read', 'write')
	.handlers({
		// Your handlers implementation
	})
	// Configure bearer token authentication
	.bearer({
		scopes: ['read'], // Optional: require specific scopes
		resourceUrl:
			'https://api.example.com/.well-known/oauth-protected-resource',
	})
	.build();

// The provider will automatically handle Bearer token authentication
async function handleAllRequests(request) {
	const response = await auth.respond(request);
	if (response) {
		// OAuth request handled (including bearer token validation)
		return response;
	}

	// Handle other application requests...
	return new Response('Not Found', { status: 404 });
}
```

**Bearer Configuration Options:**

```javascript
// Simple enable with scopes array
.bearer(['read', 'write'])

// Boolean enable (no scope restrictions)
.bearer(true)

// Full configuration
.bearer({
  scopes: ['read'],
  resourceUrl: 'https://api.example.com/.well-known/oauth-protected-resource',
  paths: {
    'GET': ['/api/data'],
    'POST': ['/api/data', '/api/upload']
  }
})
```

**How it works:**

- When `.bearer()` is configured, the provider automatically validates Bearer tokens
- For requests with valid tokens, `respond()` returns `null` (letting your app handle the request)
- For requests with invalid tokens, it returns appropriate error responses
- OAuth endpoints (`/authorize`, `/token`, etc.) are still handled normally

## Proxy Provider

Use the proxy provider to delegate OAuth operations to an upstream server. The `ProxyOAuthServerProvider` can be used directly with its convenient `.build()` method or manually with the fluent API:

### Direct Build Approach (Recommended)

```javascript
import { ProxyOAuthServerProvider } from '@tmcp/auth';

const proxy = new ProxyOAuthServerProvider({
	endpoints: {
		authorizationUrl: 'https://upstream-auth.example.com/authorize',
		tokenUrl: 'https://upstream-auth.example.com/token',
		revocationUrl: 'https://upstream-auth.example.com/revoke',
	},
	verify: async (token) => {
		// Verify token with upstream server or local validation
		return {
			token,
			clientId: 'client',
			scopes: ['read'],
			expiresAt: Date.now() / 1000 + 3600,
		};
	},
	getClient: async (clientId) => {
		// Fetch client info from upstream or local store
		return {
			client_id: clientId,
			redirect_uris: ['https://example.com/callback'],
		};
	},
});

// Build a complete OAuth instance ready for use with transports
const auth = proxy.build('https://proxy-auth.example.com', {
	cors: true,
	bearer: ['read', 'write'],
	scopes: ['read', 'write', 'admin'],
	rateLimits: {
		'/token': { windowMs: 60000, max: 10 },
	},
});

// Ready to use with any transport
async function handleRequest(request) {
	return (
		(await auth.respond(request)) ||
		new Response('Not Found', { status: 404 })
	);
}
```

### Manual Fluent API Approach

```javascript
import { OAuth, ProxyOAuthServerProvider } from '@tmcp/auth';

const proxy = new ProxyOAuthServerProvider({
	endpoints: {
		authorizationUrl: 'https://upstream-auth.example.com/authorize',
		tokenUrl: 'https://upstream-auth.example.com/token',
		revocationUrl: 'https://upstream-auth.example.com/revoke',
	},
	verify: async (token) => {
		return {
			token,
			clientId: 'client',
			scopes: ['read'],
			expiresAt: Date.now() / 1000 + 3600,
		};
	},
	getClient: async (clientId) => {
		return {
			client_id: clientId,
			redirect_uris: ['https://example.com/callback'],
		};
	},
});

const auth = OAuth.issuer('https://proxy-auth.example.com')
	.clients(proxy.clientStore)
	.handlers(proxy.handlers())
	.cors(true)
	.bearer(['read'])
	.build();
```

## A simple example

The following is a simple example of an in memory authorization server...you can substitute the Maps with a db and get a decent authorization server ready to work with an MCP server.

```ts
const clients = new Map<
	string,
	{ client_id: string; redirect_uris: string[] }
>();

const codes = new Map<
	string,
	{
		client_id: string;
		redirect_uri: string;
		code_challenge?: string;
		code_challenge_method?: string;
		expires_at: number;
		scopes: string[];
	}
>();

const tokens = new Map<
	string,
	{ client_id: string; scopes: string[]; expires_at: number }
>();
const refresh_tokens = new Map<
	string,
	{ client_id: string; scopes: string[]; access_token: string }
>();

function random_string(length: number = 32) {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

const provider = OAuth.create('http://localhost:3000')
	.bearer({
		resourceUrl: new URL('http://localhost:3000/mcp').href,
		paths: {
			POST: ['/mcp'],
		},
	})
	.handlers({
		authorize: async (client) => {
			const registered_client = clients.get(client.client.client_id);
			if (!registered_client) {
				return new Response(
					JSON.stringify({ error: 'invalid_client' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			if (!registered_client.redirect_uris.includes(client.redirectUri)) {
				return new Response(
					JSON.stringify({ error: 'invalid_redirect_uri' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			// Generate authorization code
			const auth_code = random_string();
			const scopes = client.client.scope?.split(' ') || ['read'];

			codes.set(auth_code, {
				client_id: client.client.client_id,
				redirect_uri: client.redirectUri,
				code_challenge: client.codeChallenge,
				expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
				scopes,
			});

			// In a real implementation, you'd redirect to a login page here
			// For this demo, we'll auto-approve and redirect with the code
			const redirect_url = new URL(client.redirectUri);
			redirect_url.searchParams.set('code', auth_code);
			if (client.state) {
				redirect_url.searchParams.set('state', client.state);
			}

			return new Response(null, {
				status: 302,
				headers: {
					Location: redirect_url.toString(),
					'Cache-Control': 'no-store',
				},
			});
		},
		async exchange(args) {
			if (args.type === 'authorization_code') {
				const { code, redirectUri, client } = args;
				const auth_code_data = codes.get(code);

				if (!auth_code_data) {
					throw new Error('Invalid authorization code');
				}

				if (auth_code_data.expires_at < Date.now()) {
					codes.delete(code);
					throw new Error('Authorization code expired');
				}

				if (auth_code_data.client_id !== client.client_id) {
					throw new Error('Client mismatch');
				}

				if (auth_code_data.redirect_uri !== redirectUri) {
					throw new Error('Redirect URI mismatch');
				}
				// Generate tokens
				const access_token = random_string();
				const refresh_token = random_string();
				const expires_at = Date.now() + 3600 * 1000; // 1 hour

				// Store tokens
				tokens.set(access_token, {
					client_id: client.client_id,
					scopes: auth_code_data.scopes,
					expires_at: expires_at,
				});

				refresh_tokens.set(refresh_token, {
					client_id: client.client_id,
					scopes: auth_code_data.scopes,
					access_token,
				});

				// Clean up auth code
				codes.delete(code);

				return {
					access_token: access_token,
					token_type: 'Bearer',
					expires_in: 3600,
					refresh_token: refresh_token,
					scope: auth_code_data.scopes.join(' '),
				};
			}
			const { client, refreshToken } = args;
			const refresh_data = refresh_tokens.get(refreshToken);
			if (!refresh_data) {
				throw new Error('Invalid refresh token');
			}

			if (refresh_data.client_id !== client.client_id) {
				throw new Error('Client mismatch');
			}

			// Generate new tokens
			const new_access_token = random_string();
			const new_refresh_token = random_string();
			const expires_at = Date.now() + 3600 * 1000; // 1 hour

			// Clean up old tokens
			tokens.delete(refresh_data.access_token);
			refresh_tokens.delete(refreshToken);

			// Store new tokens
			tokens.set(new_access_token, {
				client_id: client.client_id,
				scopes: refresh_data.scopes,
				expires_at: expires_at,
			});

			refresh_tokens.set(new_refresh_token, {
				client_id: client.client_id,
				scopes: refresh_data.scopes,
				access_token: new_access_token,
			});

			return {
				access_token: new_access_token,
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: new_refresh_token,
				scope: refresh_data.scopes.join(' '),
			};
		},
		async verify(token) {
			const token_data = tokens.get(token);
			if (!token_data) {
				throw new Error('Invalid access token');
			}

			if (token_data.expires_at < Date.now()) {
				tokens.delete(token);
				throw new Error('Invalid access token');
			}

			return {
				token,
				clientId: token_data.client_id,
				scopes: token_data.scopes,
				expiresAt: token_data.expires_at,
			};
		},
	})
	.registration()
	.clients({
		getClient(clientId) {
			return clients.get(clientId);
		},
		registerClient(client) {
			const new_client = {
				client_id: crypto.randomUUID(),
				redirect_uris: client.redirect_uris,
			};
			clients.set(new_client.client_id, new_client);
			return new_client;
		},
	})
	.cors({
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
	});
```

## Testing

Run tests with vitest:

```bash
pnpm test
```

## Differences from Official SDK

This implementation differs from the official MCP SDK in several key ways:

1. **Web Request/Response**: Uses modern Web APIs instead of Express middleware
2. **Valibot Validation**: Uses valibot instead of zod for schema validation
3. **Unified Interface**: Single `respond()` method instead of multiple middleware functions
4. **JSDoc Types**: Uses JSDoc + TypeScript instead of pure TypeScript
5. **No Express Dependencies**: Lightweight with minimal dependencies

## License

MIT
