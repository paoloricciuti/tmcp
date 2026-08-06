# @tmcp/session-manager-durable-objects

## 0.3.0-next.0

### Minor Changes

- 149b730: feat: add subscription managers

    Add distributed per-request subscription managers for Redis, PostgreSQL, and Cloudflare Durable Objects.

    The managers fan notifications out through their shared broker while each replica keeps registration, filtering, acknowledgement ordering, and closure local to the process holding the response stream.

### Patch Changes

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0-next.0

## 0.2.3

### Patch Changes

- 77be8a1: chore: add license
- Updated dependencies [77be8a1]
    - @tmcp/session-manager@0.2.2

## 0.2.2

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- Updated dependencies [5613d43]
    - @tmcp/session-manager@0.2.1

## 0.2.1

### Patch Changes

- 5119b33: fix: use `waitUntil`in info session manager

## 0.2.0

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
    - @tmcp/session-manager@0.2.0

## 0.1.2

### Patch Changes

- c0f7d7f: fix: try catch closing controller in case it's already closed
- Updated dependencies [c0f7d7f]
    - @tmcp/session-manager@0.1.2

## 0.1.1

### Patch Changes

- 062c314: docs: add readme for durable object
