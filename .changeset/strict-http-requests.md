---
'tmcp': minor
'@tmcp/transport-http': minor
'@tmcp/transport-in-memory': patch
---

feat: implement strict MCP 2026-07-28 HTTP requests

Classify sessionless requests before accessing session state, require and validate the protocol, method, name, and annotated tool parameter headers, and return protocol errors with their required HTTP status before opening SSE. Successful requests remain request-scoped SSE streams, now with proxy buffering disabled and cooperative cancellation exposed through `server.ctx.signal`. Initialization-based session behavior remains available on the same transport.

Add `McpServer.hasMethod()`, `McpServer.validateToolCall()`, the `tmcp/method-policy` entry point, and `getPerRequestProtocolVersions()` so transports can reuse core registration, method policy, schema, and version behavior without executing handlers. The in-memory transport now uses the same exported per-request version list.
