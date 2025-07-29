# @tmcp/auth

OAuth 2.1 authorization helper for MCP with Web Request support and valibot validation.

## Features

- **Web Request/Response API**: Works with modern Web APIs instead of Express
- **Valibot Validation**: Uses valibot for schema validation instead of zod
- **JSDoc + TypeScript**: Full type safety with JSDoc annotations
- **OAuth 2.1 Compliant**: Supports all standard OAuth 2.1 flows
- **MCP Compatible**: Designed specifically for Model Context Protocol servers
- **Unified API**: Single `respond()` method handles all OAuth endpoints
- **Lightweight**: Minimal dependencies, no Express required
- **Bearer Authentication**: Integrated Bearer token validation in the main provider
- **Proxy Support**: Built-in proxy provider for upstream OAuth servers

## Installation

```bash
pnpm install @tmcp/auth valibot pkce-challenge
```

## Quick Start

```javascript
import { OAuthProvider } from '@tmcp/auth';
import { InvalidTokenError } from '@tmcp/auth';

// Create a provider implementation
const provider = {
  clientsStore: {
    async getClient(clientId) {
      // Return client info or undefined
      return {
        client_id: clientId,
        client_secret: 'secret',
        redirect_uris: ['https://example.com/callback']
      };
    },
    
    async registerClient(client) {
      // Register new client and return full info
      return { ...client, client_id: 'generated-id' };
    }
  },

  async authorize(client, params) {
    // Handle authorization - return redirect response
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', 'auth_code');
    if (params.state) {
      redirectUrl.searchParams.set('state', params.state);
    }
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl.toString() }
    });
  },

  async challengeForAuthorizationCode(client, code) {
    // Return PKCE challenge for the code
    return 'challenge_string';
  },

  async exchangeAuthorizationCode(client, code, codeVerifier, redirectUri, resource) {
    // Exchange code for tokens
    return {
      access_token: 'access_token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh_token'
    };
  },

  async exchangeRefreshToken(client, refreshToken, scopes, resource) {
    // Exchange refresh token for new tokens
    return {
      access_token: 'new_access_token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'new_refresh_token'
    };
  },

  async verifyAccessToken(token) {
    // Verify token and return auth info
    if (token === 'valid_token') {
      return {
        token,
        clientId: 'client_id',
        scopes: ['read', 'write'],
        expiresAt: Date.now() / 1000 + 3600
      };
    }
    throw new InvalidTokenError('Invalid token');
  },

  async revokeToken(client, request) {
    // Revoke the token
    // request contains { token, token_type_hint? }
  }
};

// Create OAuth provider
const oauthProvider = new OAuthProvider({
  provider,
  issuerUrl: new URL('https://auth.example.com'),
  scopesSupported: ['read', 'write'],
  resourceName: 'My API'
});

// Handle requests
async function handleRequest(request) {
  const response = await oauthProvider.respond(request);
  if (response) {
    return response; // OAuth request handled
  }
  
  // Handle other requests...
  return new Response('Not Found', { status: 404 });
}
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
  }
});
```

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