---
'tmcp': minor
'@tmcp/session-manager': minor
'@tmcp/transport-http': minor
'@tmcp/transport-stdio': minor
'@tmcp/transport-in-memory': minor
'@tmcp/transport-sse': minor
---

feat: add the core per-request subscription model

Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.
