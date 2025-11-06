# @tmcp/transport-sse

## 0.5.1

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`
- Updated dependencies [5613d43]
    - @tmcp/session-manager@0.2.1
    - tmcp@1.16.3

## 0.5.0

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

## 0.4.0

### Minor Changes

- 509eb41: feat: setting `options.path` to null respond on every path

## 0.3.3

### Patch Changes

- 4da89ef: chore: bump version to install new version automatically

## 0.3.2

### Patch Changes

- bc21ef1: fix: respond with 200 to delete requests

## 0.3.1

### Patch Changes

- c0f7d7f: fix: try catch closing controller in case it's already closed
- Updated dependencies [c0f7d7f]
    - @tmcp/session-manager@0.1.2

## 0.3.0

### Minor Changes

- 5a38a23: feat: add custom context

### Patch Changes

- Updated dependencies [5a38a23]
- Updated dependencies [5a38a23]
    - tmcp@1.11.0

## 0.2.7

### Patch Changes

- 957805b: fix: await session manager calls
- Updated dependencies [957805b]
    - @tmcp/session-manager@0.1.1

## 0.2.6

### Patch Changes

- e55b816: fix: abstract session manager to allow for multi-server deployments
- 65b88fc: fix: remove unneded `streams` map

## 0.2.5

### Patch Changes

- b297315: feat: add cors handling to http transports

## 0.2.4

### Patch Changes

- d4dcd27: chore: update readme
- Updated dependencies [d4dcd27]
- Updated dependencies [d4dcd27]
    - tmcp@1.10.2

## 0.2.3

### Patch Changes

- 55916ac: fix: encode strings before enqueueing them

## 0.2.2

### Patch Changes

- 62f09d3: fix: auth as dev dependency

## 0.2.1

## 0.2.0

### Minor Changes

- a99b45a: feat: authentication

### Patch Changes

- Updated dependencies [a99b45a]
- Updated dependencies [a99b45a]
    - tmcp@1.9.0

## 0.1.2

### Patch Changes

- feb8f62: chore: use `dts-buddy` to generate better types
- Updated dependencies [feb8f62]
    - tmcp@1.8.1

## 0.1.1

### Patch Changes

- 3847654: fix: clone request before reading body
- Updated dependencies [1b50780]
    - tmcp@1.7.1
