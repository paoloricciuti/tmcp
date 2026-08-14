# @tmcp/transport-http

## 0.9.0

### Minor Changes

- a6b9606: feat: add the core per-request subscription model

    Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
    HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.

- 79e445e: feat: implement strict MCP 2026-07-28 HTTP requests

    Classify sessionless requests before accessing session state, require and validate the protocol, method, name, and annotated tool parameter headers, and return protocol errors with their required HTTP status before opening SSE. Successful requests remain request-scoped SSE streams, now with proxy buffering disabled and cooperative cancellation exposed through `server.ctx.signal`. Initialization-based session behavior remains available on the same transport.

    Add `McpServer.hasMethod()`, `McpServer.validateToolCall()`, the `tmcp/method-policy` entry point, and `getPerRequestProtocolVersions()` so transports can reuse core registration, method policy, schema, and version behavior without executing handlers. The in-memory transport now uses the same exported per-request version list.

### Patch Changes

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0

## 0.9.0-next.0

### Minor Changes

- a6b9606: feat: add the core per-request subscription model

    Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
    HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.

- 79e445e: feat: implement strict MCP 2026-07-28 HTTP requests

    Classify sessionless requests before accessing session state, require and validate the protocol, method, name, and annotated tool parameter headers, and return protocol errors with their required HTTP status before opening SSE. Successful requests remain request-scoped SSE streams, now with proxy buffering disabled and cooperative cancellation exposed through `server.ctx.signal`. Initialization-based session behavior remains available on the same transport.

    Add `McpServer.hasMethod()`, `McpServer.validateToolCall()`, the `tmcp/method-policy` entry point, and `getPerRequestProtocolVersions()` so transports can reuse core registration, method policy, schema, and version behavior without executing handlers. The in-memory transport now uses the same exported per-request version list.

### Patch Changes

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0-next.0

## 0.8.6

### Patch Changes

- 77be8a1: chore: add license
- Updated dependencies [77be8a1]
    - @tmcp/session-manager@0.2.2

## 0.8.5

### Patch Changes

- 475a408: fix: initialize ctx.sessionInfo with info from request on initialize

## 0.8.4

### Patch Changes

- f3c2b18: feat: add `disableSse` option

## 0.8.3

### Patch Changes

- 68e7422: fix: specify event message in SSE events

## 0.8.2

### Patch Changes

- 49e18a8: chore: update peer dependency @tmcp/auth to ^0.3.3 || ^0.4.0
- Updated dependencies [1d72e60]
    - tmcp@1.18.0

## 0.8.1

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- ce935fa: fix: always use current controller for send events
- Updated dependencies [5613d43]
    - @tmcp/session-manager@0.2.1
    - tmcp@1.16.3

## 0.8.0

### Minor Changes

- 8a04ee2: breaking: move sessions out of core into the transports and allow for persistent mcp state

    This release moves the session management out of the core package into the SSE and HTTP transport separately.
    While technically a breaking change if you update both `tmcp` and your transport (`@tmcp/transport-http`,
    `@tmcp/transport-sse`, or `@tmcp/transport-stdio`), you will not face a breaking change unless you were using a
    session manager.

    If you were testing your `McpServer` instance manually you might need to update them to pass the `sessionInfo`
    in the context parameter (only if you were reading them in the tool/resource/prompt).

    Sorry for the "breaking" but this was a necessary step to unlock persistent state. 🧡

### Patch Changes

- Updated dependencies [8a04ee2]
- Updated dependencies [a9254cb]
    - @tmcp/session-manager@0.2.0
    - tmcp@1.16.0

## 0.7.1

### Patch Changes

- 4a7fa68: fix: send a comment when sse start to flush headers

## 0.7.0

### Minor Changes

- 509eb41: feat: setting `options.path` to null respond on every path

## 0.6.3

### Patch Changes

- 4da89ef: chore: bump version to install new version automatically

## 0.6.2

### Patch Changes

- bc21ef1: fix: respond with 200 to delete requests

## 0.6.1

### Patch Changes

- c0f7d7f: fix: try catch closing controller in case it's already closed
- Updated dependencies [c0f7d7f]
    - @tmcp/session-manager@0.1.2

## 0.6.0

### Minor Changes

- 5a38a23: feat: add custom context

### Patch Changes

- Updated dependencies [5a38a23]
- Updated dependencies [5a38a23]
    - tmcp@1.11.0

## 0.5.6

### Patch Changes

- 957805b: fix: await session manager calls
- Updated dependencies [957805b]
    - @tmcp/session-manager@0.1.1

## 0.5.5

### Patch Changes

- e55b816: fix: abstract session manager to allow for multi-server deployments
- 65b88fc: fix: remove unneded `streams` map

## 0.5.4

### Patch Changes

- b297315: feat: add cors handling to http transports

## 0.5.3

### Patch Changes

- d4dcd27: chore: update readme
- Updated dependencies [d4dcd27]
- Updated dependencies [d4dcd27]
    - tmcp@1.10.2

## 0.5.2

### Patch Changes

- 55916ac: fix: encode strings before enqueueing them

## 0.5.1

### Patch Changes

- 297b783: fix: silently fail in case a controller is missing

## 0.5.0

### Minor Changes

- a99b45a: feat: authentication

### Patch Changes

- Updated dependencies [a99b45a]
- Updated dependencies [a99b45a]
    - tmcp@1.9.0

## 0.4.2

### Patch Changes

- feb8f62: chore: use `dts-buddy` to generate better types
- Updated dependencies [feb8f62]
    - tmcp@1.8.1

## 0.4.1

### Patch Changes

- 77d3257: fix: respond immediately to allow for requests from the server

## 0.4.0

### Minor Changes

- 8f09cd2: fix: send requests back on the same stream if available

## 0.3.0

### Minor Changes

- 3847654: fix: answer with conflict for second SSE connection

### Patch Changes

- Updated dependencies [1b50780]
    - tmcp@1.7.1

## 0.2.1

### Patch Changes

- f5d8390: fix: optional `getSessionId`

## 0.2.0

### Minor Changes

- d12964e: breaking: correctly handle http requests

### Patch Changes

- Updated dependencies [d921480]
    - tmcp@1.7.0

## 0.1.1

### Patch Changes

- 41fb096: fix: use new sessions management
- Updated dependencies [41fb096]
    - tmcp@1.4.0
