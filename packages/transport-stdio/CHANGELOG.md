# @tmcp/transport-stdio

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
