---
'@tmcp/transport-http': minor
---

feat: add `response` option to answer requests with a single JSON object instead of SSE

`new HttpTransport(server, { response: 'json' })` answers JSON-RPC requests with `Content-Type: application/json` and the response as the body, for session-based and per-request clients alike. Notifications still return HTTP 202 and `subscriptions/listen` keeps its SSE stream. Messages a handler emits before its response (logs, progress, sampling, elicitation) are dropped in this mode, matching the JSON response mode of the official SDKs. The default stays `'sse'`.
