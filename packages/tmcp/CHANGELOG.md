# tmcp

## 1.18.1

### Patch Changes

- 743b531: fix: deprecate various and implement fine grained prompt methods

## 1.18.0

### Minor Changes

- 1d72e60: feat: utils entrypoint

## 1.17.0

### Minor Changes

- 61d7c9e: feat: expose low level `request` api

## 1.16.4

### Patch Changes

- bc56fbc: fix: allow tools pagination

## 1.16.3

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`

## 1.16.2

### Patch Changes

- 0152bae: chore: export more types

## 1.16.1

### Patch Changes

- 4465e9d: fix: allow explicitly passing undefined adapter for simple servers
- ce38e88: fix: receive argument type

## 1.16.0

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

- a9254cb: fix: allow for `_meta` field on tools

## 1.15.5

### Patch Changes

- 0aeddf8: fix: only send logs to current session

## 1.15.4

### Patch Changes

- 98de0e6: fix: return `isError` result from `tools/call` instead of `MCPError`

## 1.15.3

### Patch Changes

- 5b62c34: fix: use `looseObject` for all `_meta` fields

## 1.15.2

### Patch Changes

- dfa29f2: fix: export more types

## 1.15.1

### Patch Changes

- b9a0498: fix: export `Icons` types

## 1.15.0

### Minor Changes

- b7065e1: feat: support icons for server, tools, prompts and resources

## 1.14.0

### Minor Changes

- e81efc2: breaking: don't automatically refresh roots on init + support error responses

## 1.13.0

### Minor Changes

- 3ff8c61: breaking: return proper type from `elicitation`

## 1.12.2

### Patch Changes

- 056a268: fix: don't force `structuredContent` if `isError`

## 1.12.1

### Patch Changes

- 89c666b: feat: allow manual list changed notification

## 1.12.0

### Minor Changes

- c38ee66: breaking: fix elicitation signature (n.b. it's only breaking if you are using elicitation)

## 1.11.0

### Minor Changes

- 5a38a23: feat: add custom context
- 5a38a23: feat: allow to pass `undefined` to adapter in case you don't want to use schemas

## 1.10.3

### Patch Changes

- 05203d9: feat: add `getClientInfo` to retrieve information about the mcp client
- f2aa0dd: feat: progress notifications
- 9512cad: feat: add `enabled` function to all server functionalities

## 1.10.2

### Patch Changes

- d4dcd27: fix: bump `uri-template-matcher`
- d4dcd27: chore: update readme

## 1.10.1

### Patch Changes

- 8891069: fix: remove console.log

## 1.10.0

### Minor Changes

- ea63a2b: feat: support `structuredContent`

## 1.9.1

### Patch Changes

- 05e7631: fix: `Completion` can be a Promise

## 1.9.0

### Minor Changes

- a99b45a: breaking: accept context with auth info as second argument of receive
- a99b45a: feat: authentication

## 1.8.2

### Patch Changes

- ccf38f8: fix: patch `dts-buddy` to properly generate types derived by `valibot`

## 1.8.1

### Patch Changes

- feb8f62: chore: use `dts-buddy` to generate better types

## 1.8.0

### Minor Changes

- 3aad285: breaking: use `object` instead of `looseObject` to unify with official sdk stance

### Patch Changes

- 1ab5536: fix: losen up params validation

## 1.7.1

### Patch Changes

- 1b50780: fix: return off function from `on`

## 1.7.0

### Minor Changes

- d921480: feat: add tool annotations

## 1.6.2

### Patch Changes

- d35f9b0: fix: better errors

## 1.6.1

### Patch Changes

- 90309ab: fix: correctly validate incoming request to handle notifications

## 1.6.0

### Minor Changes

- 2ba5afe: feat: version validation and negotiation
- fa7c615: feat: add logging
- e473636: feat: add pagination support
- 2151837: feat: allow `list` in template resources

### Patch Changes

- 73aef3c: fix: allow user to pass `title`

## 1.5.0

### Minor Changes

- f541e35: feat: add `roots` support
- 524e7c0: feat: add `sampling`

## 1.4.0

### Minor Changes

- 41fb096: breaking: handle sessions + `elicitations`

## 1.3.0

### Minor Changes

- a95336f: breaking: initial validation for exposed methods

## 1.2.0

### Minor Changes

- ae4a79c: breaking: way better complete api and initial typesafe

## 1.1.0

### Minor Changes

- 9073ae4: breaking: refactor how send works

## 1.0.2

### Patch Changes

- 1c5ae08: chore: add readme to main package
