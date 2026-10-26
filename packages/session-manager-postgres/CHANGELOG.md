# @tmcp/session-manager-postgres

## 0.4.0

### Minor Changes

- 0bb36e8: fix: add `tmcp` as a peer dependency

    Their type declarations import from `tmcp`, so it's now a required peer dependency (`^1.20.0`). npm refuses to install them next to an older `tmcp`.

### Patch Changes

- 0bb36e8: chore: generate the type declarations with `tsc`

    The declarations are now in `types/`, one file per module, instead of a single bundled `src/types/index.d.ts`. The exported names are unchanged. `InMemorySubscriptionManager`, `InMemoryStreamSessionManager` and `InMemoryInfoSessionManager` can now be subclassed, and `tmcp` lists `@types/json-schema` as a dependency, since its declarations import it.

    The bundled declarations hid that the packages are ESM-only: CommonJS projects using `module: "node16"`, or `module: "nodenext"` with TypeScript older than 5.8, now get TS1479 when importing them.

- Updated dependencies [0bb36e8]
    - @tmcp/session-manager@0.3.1

## 0.3.0

### Minor Changes

- 149b730: feat: add subscription managers

    Add distributed per-request subscription managers for Redis, PostgreSQL, and Cloudflare Durable Objects.

    The managers fan notifications out through their shared broker while each replica keeps registration, filtering, acknowledgement ordering, and closure local to the process holding the response stream.

### Patch Changes

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0

## 0.3.0-next.0

### Minor Changes

- 149b730: feat: add subscription managers

    Add distributed per-request subscription managers for Redis, PostgreSQL, and Cloudflare Durable Objects.

    The managers fan notifications out through their shared broker while each replica keeps registration, filtering, acknowledgement ordering, and closure local to the process holding the response stream.

### Patch Changes

- Updated dependencies [a6b9606]
- Updated dependencies [149b730]
    - @tmcp/session-manager@0.3.0-next.0

## 0.2.2

### Patch Changes

- 77be8a1: chore: add license
- Updated dependencies [77be8a1]
    - @tmcp/session-manager@0.2.2

## 0.2.1

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- Updated dependencies [5613d43]
    - @tmcp/session-manager@0.2.1

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
