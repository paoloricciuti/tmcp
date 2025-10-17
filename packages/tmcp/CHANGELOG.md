# tmcp

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
