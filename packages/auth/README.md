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

// Ultra-minimal setup with auto-configuration
const auth = OAuth
  .issuer('https://auth.example.com')
  .auto();

// Handle requests
async function handleRequest(request) {
  return await auth.handle(request) || new Response('Not Found', { status: 404 });
}

// More explicit setup with custom handlers
const customAuth = OAuth
  .issuer('https://auth.example.com')
  .scopes('read', 'write')
  .memory([{
    client_id: 'test-client',
    client_secret: 'test-secret',
    redirect_uris: ['https://app.example.com/callback'],
    client_id_issued_at: Math.floor(Date.now() / 1000)
  }])
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
        headers: { 'Location': redirectUrl.toString() }
      });
    },

    async exchange(request) {
      if (request.type === 'authorization_code') {
        return {
          access_token: 'access_token_' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh_token_' + Date.now()
        };
      } else if (request.type === 'refresh_token') {
        return {
          access_token: 'new_access_token_' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: request.refreshToken
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
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        };
      }
      throw new Error('Invalid token');
    },

    async revoke(client, request) {
      // Revoke the token
      console.log(`Revoking token ${request.token} for client ${client.client_id}`);
    }
  })
  .cors({ origin: 'https://app.example.com', credentials: true })
  .bearer(['read'])
  .build();

// Or use SimpleProvider for quick development
const simpleAuth = OAuth
  .issuer('https://auth.example.com')
  .clients(SimpleProvider.withClient(
    'demo-client',
    'demo-secret',
    ['https://app.example.com/callback']
  ).clientStore)
  .handlers(SimpleProvider.withClient(
    'demo-client',
    'demo-secret',
    ['https://app.example.com/callback']
  ).handlers())
  .cors(true)
  .build();
```

## Legacy API (Deprecated)

For backward compatibility, the legacy OAuthProvider is still available:

```javascript
import { OAuthProvider } from '@tmcp/auth';

// Legacy provider approach - more verbose but compatible with existing code
const provider = {
  clientsStore: {
    async getClient(clientId) { /* implementation */ },
    async registerClient(client) { /* implementation */ }
  },
  async authorize(client, params) { /* implementation */ },
  async challengeForAuthorizationCode(client, code) { /* implementation */ },
  async exchangeAuthorizationCode(client, code, verifier, redirectUri, resource) { /* implementation */ },
  async exchangeRefreshToken(client, refreshToken, scopes, resource) { /* implementation */ },
  async verifyAccessToken(token) { /* implementation */ },
  async revokeToken(client, request) { /* implementation */ }
};

const legacyAuth = new OAuthProvider({
  provider,
  issuerUrl: new URL('https://auth.example.com'),
  scopesSupported: ['read', 'write'],
  bearerToken: { requiredScopes: ['read'] },
  cors: { origin: 'https://app.example.com', credentials: true }
});
```

**Note**: The legacy API is deprecated. Use the new `OAuth` class for better performance, cleaner code, and improved developer experience.

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

## Configuration Options

```javascript
const oauthProvider = new OAuthProvider({
  provider,                    // Required: OAuth server provider implementation
  issuerUrl,                   // Required: Issuer URL (must be HTTPS, except localhost)
  baseUrl,                     // Optional: Base URL if different from issuer
  serviceDocumentationUrl,     // Optional: Documentation URL
  scopesSupported,             // Optional: Array of supported scopes
  resourceName,                // Optional: Human-readable resource name
  clientSecretExpirySeconds,   // Optional: Client secret expiry (default: 30 days)
  clientIdGeneration,          // Optional: Generate client IDs (default: true)
  rateLimits,                  // Optional: Rate limiting per endpoint
  bearerToken: {               // Optional: Bearer token authentication config
    requiredScopes,            //   Optional: Array of required scopes
    resourceMetadataUrl        //   Optional: Resource metadata URL for WWW-Authenticate header
  },
  cors: {                      // Optional: CORS configuration
    origin,                    //   Optional: Allowed origins (string, array, or '*')
    methods,                   //   Optional: Allowed methods (default: ['GET', 'POST', 'OPTIONS'])
    allowedHeaders,            //   Optional: Allowed headers (default: ['Content-Type', 'Authorization'])
    exposedHeaders,            //   Optional: Exposed headers
    credentials,               //   Optional: Allow credentials (default: false)
    maxAge                     //   Optional: Preflight cache duration in seconds (default: 86400)
  }
});
```

## CORS Configuration

Configure Cross-Origin Resource Sharing (CORS) for web applications:

```javascript
const oauthProvider = new OAuthProvider({
  // ... other config
  cors: {
    origin: ['https://app.example.com', 'https://localhost:3000'], // Specific origins
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies and authentication headers
    maxAge: 86400 // Cache preflight for 24 hours
  }
});
```

**Common CORS Configurations:**

```javascript
// Allow all origins (development only)
cors: { origin: '*' }

// Single origin
cors: { origin: 'https://app.example.com' }

// Multiple specific origins
cors: { 
  origin: ['https://app.example.com', 'https://staging.example.com'],
  credentials: true 
}

// Full configuration
cors: {
  origin: ['https://app.example.com', 'https://staging.example.com', 'https://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 7200
}
```

**CORS Features:**
- **Automatic preflight handling** - OPTIONS requests are handled automatically
- **Origin validation** - Support for single origins (string), multiple origins (array), or wildcard ('*')
- **Credential support** - Enable cookies and authentication headers
- **Header management** - Control allowed and exposed headers
- **Caching control** - Configure preflight cache duration

## Provider Interface

Your provider must implement the `OAuthServerProvider` interface:

```javascript
const provider = {
  // Required: Client store
  clientsStore: {
    async getClient(clientId) { /* ... */ },
    async registerClient(client) { /* ... */ } // Optional for dynamic registration
  },

  // Required: Authorization flow
  async authorize(client, params) { /* ... */ }, // Returns Response
  async challengeForAuthorizationCode(client, code) { /* ... */ },
  async exchangeAuthorizationCode(client, code, verifier, redirectUri, resource) { /* ... */ },
  async exchangeRefreshToken(client, refreshToken, scopes, resource) { /* ... */ },
  async verifyAccessToken(token) { /* ... */ },

  // Optional: Token revocation
  async revokeToken(client, request) { /* ... */ },

  // Optional: Skip local PKCE validation (for proxy scenarios)
  skipLocalPkceValidation: false
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
  InsufficientScopeError
} from '@tmcp/auth';
```

## Rate Limiting

Configure rate limits per endpoint:

```javascript
const oauthProvider = new OAuthProvider({
  // ... other config
  rateLimits: {
    '/authorize': { windowMs: 15 * 60 * 1000, max: 100 },  // 100 requests per 15 minutes
    '/token': { windowMs: 15 * 60 * 1000, max: 50 },       // 50 requests per 15 minutes
    '/register': { windowMs: 60 * 60 * 1000, max: 20 }     // 20 requests per hour
  }
});
```

## Bearer Authentication

Bearer token authentication is now integrated directly into the `OAuthProvider`. Configure it during provider setup:

```javascript
const oauthProvider = new OAuthProvider({
  provider,
  issuerUrl: new URL('https://auth.example.com'),
  scopesSupported: ['read', 'write'],
  resourceName: 'My API',
  // Configure bearer token authentication
  bearerToken: {
    requiredScopes: ['read'], // Optional: require specific scopes
    resourceMetadataUrl: 'https://api.example.com/.well-known/oauth-protected-resource'
  }
});

// The provider will automatically handle Bearer token authentication
async function handleAllRequests(request) {
  const response = await oauthProvider.respond(request);
  if (response) {
    // OAuth request handled (including bearer token validation)
    return response;
  }
  
  // Handle other application requests...
  return new Response('Not Found', { status: 404 });
}
```

**How it works:**
- When `bearerToken` config is provided, the provider automatically validates Bearer tokens
- For requests with valid tokens, `respond()` returns `null` (letting your app handle the request)
- For requests with invalid tokens, it returns appropriate error responses
- OAuth endpoints (`/authorize`, `/token`, etc.) are still handled normally

## Proxy Provider

Use the proxy provider to delegate OAuth operations to an upstream server:

```javascript
import { ProxyOAuthServerProvider } from '@tmcp/auth';

const proxyProvider = new ProxyOAuthServerProvider({
  endpoints: {
    authorizationUrl: 'https://upstream-auth.example.com/authorize',
    tokenUrl: 'https://upstream-auth.example.com/token',
    revocationUrl: 'https://upstream-auth.example.com/revoke',
  },
  verifyAccessToken: async (token) => {
    // Verify token with upstream server or local validation
    return { token, clientId: 'client', scopes: ['read'], expiresAt: Date.now() / 1000 + 3600 };
  },
  getClient: async (clientId) => {
    // Fetch client info from upstream or local store
    return { client_id: clientId, redirect_uris: ['https://example.com/callback'] };
  }
});

const oauthProvider = new OAuthProvider({
  provider: proxyProvider,
  issuerUrl: new URL('https://proxy-auth.example.com'),
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