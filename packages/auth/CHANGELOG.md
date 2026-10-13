# @tmcp/auth

## 0.5.1

### Patch Changes

- 0bb36e8: fix: export the types that appear in inferred types

    Projects that emit declarations can export values created with `defineTool`, `definePrompt`, `defineResource` and `defineTemplate`, `OAuth` handlers and verifiers, and bound server methods without TS2742 errors. `tmcp/tool`, `tmcp/prompt`, `tmcp/resource` and `tmcp/template` now export `CreatedTool`, `CreatedPrompt`, `CreatedResource` and `CreatedTemplate`, and `tmcp` exports `McpEvents` and `ChangedArgs`. `@tmcp/auth` now exports `AuthInfo`, `SimplifiedHandlers` and the other types of its handlers and options.

    The `tmcp` subpath entry points also resolve with `moduleResolution: "node"` again.

- 0bb36e8: chore: generate the type declarations with `tsc`

    The declarations are now in `types/`, one file per module, instead of a single bundled `src/types/index.d.ts`. The exported names are unchanged. `InMemorySubscriptionManager`, `InMemoryStreamSessionManager` and `InMemoryInfoSessionManager` can now be subclassed, and `tmcp` lists `@types/json-schema` as a dependency, since its declarations import it.

    The bundled declarations hid that the packages are ESM-only: CommonJS projects using `module: "node16"`, or `module: "nodenext"` with TypeScript older than 5.8, now get TS1479 when importing them.

- 0bb36e8: fix: don't send `code_challenge=undefined` from `ProxyOAuthServerProvider`

    When the authorization request has no PKCE code challenge, the proxied authorization URL no longer contains `code_challenge=undefined&code_challenge_method=S256`: both parameters are omitted.

## 0.5.0

### Minor Changes

- e22828a: Conform authorization helpers to MCP `2026-07-28` by advertising and validating Client ID Metadata Documents and documenting Dynamic Client Registration deprecation.

## 0.5.0-next.0

### Minor Changes

- e22828a: Conform authorization helpers to MCP `2026-07-28` by advertising and validating Client ID Metadata Documents and documenting Dynamic Client Registration deprecation.

## 0.4.1

### Patch Changes

- 77be8a1: chore: add license

## 0.4.0

### Minor Changes

- a8bae36: feat: support CIMD authentication

### Patch Changes

- d93d786: fix: expose resource metadata from paths
- Updated dependencies [61d7c9e]
    - tmcp@1.17.0

## 0.3.3

### Patch Changes

- 7ff2e63: fix: don't require code challenge or verifier

## 0.3.2

### Patch Changes

- 2c03f48: fix: don't check client secret for method none

## 0.3.1

### Patch Changes

- 7d01476: fix: actually use the `generate` functions
- 3c1b0d0: fix: redirect with `return_to` if `should_redirect`
- d1e53b3: fix: pass information about kind of code to access_token callbacks

## 0.3.0

### Minor Changes

- 03384c2: feat: pass request to handlers and allow generation for simple provider

## 0.2.1

### Patch Changes

- d5ec813: fix: read authorization header in case client_id is missing from params

## 0.2.0

### Minor Changes

- d5636d1: breaking: better `SimpleProvider`

## 0.1.1

### Patch Changes

- 57637dc: chore: update readme
- Updated dependencies [a99b45a]
- Updated dependencies [a99b45a]
    - tmcp@1.9.0
