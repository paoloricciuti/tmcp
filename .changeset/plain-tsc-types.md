---
'tmcp': patch
'@tmcp/auth': patch
'@tmcp/adapter-arktype': patch
'@tmcp/adapter-effect': patch
'@tmcp/adapter-valibot': patch
'@tmcp/adapter-zod': patch
'@tmcp/adapter-zod-v3': patch
'@tmcp/session-manager': patch
'@tmcp/session-manager-durable-objects': patch
'@tmcp/session-manager-postgres': patch
'@tmcp/session-manager-redis': patch
'@tmcp/transport-http': patch
'@tmcp/transport-in-memory': patch
'@tmcp/transport-sse': patch
'@tmcp/transport-stdio': patch
---

chore: generate the type declarations with `tsc`

The declarations are now in `types/`, one file per module, instead of a single bundled `src/types/index.d.ts`. The exported names are unchanged. `InMemorySubscriptionManager`, `InMemoryStreamSessionManager` and `InMemoryInfoSessionManager` can now be subclassed, and `tmcp` lists `@types/json-schema` as a dependency, since its declarations import it.

The bundled declarations hid that the packages are ESM-only: CommonJS projects using `module: "node16"`, or `module: "nodenext"` with TypeScript older than 5.8, now get TS1479 when importing them.
