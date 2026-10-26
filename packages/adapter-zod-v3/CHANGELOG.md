# @tmcp/adapter-zod-v3

## 0.2.3

### Patch Changes

- 0bb36e8: chore: generate the type declarations with `tsc`

    The declarations are now in `types/`, one file per module, instead of a single bundled `src/types/index.d.ts`. The exported names are unchanged. `InMemorySubscriptionManager`, `InMemoryStreamSessionManager` and `InMemoryInfoSessionManager` can now be subclassed, and `tmcp` lists `@types/json-schema` as a dependency, since its declarations import it.

    The bundled declarations hid that the packages are ESM-only: CommonJS projects using `module: "node16"`, or `module: "nodenext"` with TypeScript older than 5.8, now get TS1479 when importing them.

## 0.2.2

### Patch Changes

- 77be8a1: chore: add license

## 0.2.1

### Patch Changes

- d4dcd27: chore: update readme
- Updated dependencies [d4dcd27]
- Updated dependencies [d4dcd27]
    - tmcp@1.10.2

## 0.2.0

### Minor Changes

- b8b17e9: breaking: remove export default for adapters that have it

## 0.1.4

### Patch Changes

- feb8f62: chore: use `dts-buddy` to generate better types
- Updated dependencies [feb8f62]
    - tmcp@1.8.1

## 0.1.3

### Patch Changes

- 9e06169: fix: add tmcp as a dev dependency

## 1.0.0

### Patch Changes

- Updated dependencies [9073ae4]
    - tmcp@1.1.0

## 0.1.2

### Patch Changes

- d5fc7fb: fix: update readme
