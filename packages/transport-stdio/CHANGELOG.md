# @tmcp/transport-stdio

## 0.5.0-next.0

### Minor Changes

- a6b9606: feat: add the core per-request subscription model

    Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
    HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.

### Patch Changes

- 2117694: fix: forward standalone server notifications before initialization

    Register the stdio `send` listener when the transport is created so per-request protocol logs and progress can be written before a legacy `initialize` request. This also forwards standalone notifications emitted outside a request before initialization; legacy broadcast and session-state listeners still start after initialization.

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0-next.0

## 0.4.3

### Patch Changes

- 77be8a1: chore: add license

## 0.4.2

### Patch Changes

- 475a408: fix: initialize ctx.sessionInfo with info from request on initialize

## 0.4.1

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- Updated dependencies [5613d43]
    - tmcp@1.16.3

## 0.4.0

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
    - tmcp@1.16.0

## 0.3.1

### Patch Changes

- 4da89ef: chore: bump version to install new version automatically

## 0.3.0

### Minor Changes

- be7a1dc: feat: allow for custom context in stdio transport

## 0.2.0

### Minor Changes

- e4f00e3: fix: only add send event listener after initialization

### Patch Changes

- Updated dependencies [3ff8c61]
    - tmcp@1.13.0

## 0.1.3

### Patch Changes

- d4dcd27: chore: update readme
- Updated dependencies [d4dcd27]
- Updated dependencies [d4dcd27]
    - tmcp@1.10.2

## 0.1.2

### Patch Changes

- feb8f62: chore: use `dts-buddy` to generate better types
- Updated dependencies [feb8f62]
    - tmcp@1.8.1

## 0.1.1

### Patch Changes

- 41fb096: fix: use new sessions management
- Updated dependencies [41fb096]
    - tmcp@1.4.0
