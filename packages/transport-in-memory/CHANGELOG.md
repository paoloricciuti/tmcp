# @tmcp/transport-in-memory

## 0.1.0-next.0

### Minor Changes

- a6b9606: feat: add the core per-request subscription model

    Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
    HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.

- 4c0b6f8: feat: add a sessionless client for the per-request protocol

    Add `transport.stateless()` with discovery, explicit request metadata, strict JSON-RPC errors, isolated notification capture, and automatic MRTR input retries. Its ordinary high-level MCP methods share their signatures and implementation with `Session`, allowing tests to switch between session-negotiated and per-request clients without rewriting calls.

    This API requires tmcp 1.20 or newer, where the `2026-07-28` per-request protocol is available.

### Patch Changes

- 79e445e: feat: implement strict MCP 2026-07-28 HTTP requests

    Classify sessionless requests before accessing session state, require and validate the protocol, method, name, and annotated tool parameter headers, and return protocol errors with their required HTTP status before opening SSE. Successful requests remain request-scoped SSE streams, now with proxy buffering disabled and cooperative cancellation exposed through `server.ctx.signal`. Initialization-based session behavior remains available on the same transport.

    Add `McpServer.hasMethod()`, `McpServer.validateToolCall()`, the `tmcp/method-policy` entry point, and `getPerRequestProtocolVersions()` so transports can reuse core registration, method policy, schema, and version behavior without executing handlers. The in-memory transport now uses the same exported per-request version list.

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0-next.0

## 0.0.7

### Patch Changes

- 77be8a1: chore: add license

## 0.0.6

### Patch Changes

- 475a408: fix: initialize ctx.sessionInfo with info from request on initialize

## 0.0.5

### Patch Changes

- 76294e3: fix: improve call tool result type

## 0.0.4

### Patch Changes

- 80dd966: fix: types and sourcemaps
- Updated dependencies [61d7c9e]
    - tmcp@1.17.0

## 0.0.3

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- Updated dependencies [5613d43]
    - tmcp@1.16.3
