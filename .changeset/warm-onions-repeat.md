---
'tmcp': minor
---

feat: support `2026-07-28` protocol version

Add support for the per-request (stateless) MCP protocol version `2026-07-28` (Phases 0–2), plus a few deliberate fixes:

- Per-request protocol handling is enabled by default for version `2026-07-28` (pinned to upstream spec tag `2026-07-28`, commit `5f5440bb26a62e2cf3440b92da5a667efa03b267`) and advertised via the new `server/discover` method. Requests carrying `_meta` protocol metadata with any other version receive `-32022 UNSUPPORTED_PROTOCOL_VERSION`. Legacy `initialize` negotiation is unchanged and `LATEST_PROTOCOL_VERSION` stays `2025-06-18`.
- New `cache` server option (`{ ttlMs?, cacheScope?, methods? }`, defaults `{ ttlMs: 0, cacheScope: 'private' }`) controlling the `ttlMs`/`cacheScope` fields required on cacheable per-request results.
- Per-request results are decorated at the wire boundary (`resultType`, `_meta['io.modelcontextprotocol/serverInfo']`, cache fields); handler return types are unchanged.
- New exported error constants `HEADER_MISMATCH` (-32020), `MISSING_REQUIRED_CLIENT_CAPABILITY` (-32021) and `UNSUPPORTED_PROTOCOL_VERSION` (-32022), and `McpError` is now exported from the package root.
- **Bug fix**: `McpError` now carries its real `code` (and optional `data`) onto JSON-RPC error responses. Previously every thrown `McpError` collapsed to `-32603` on the wire.
- **Bug fix (legacy-visible, deliberate)**: unknown prompt (`prompts/get`) and unknown resource (`resources/read`) names now return `-32602` (Invalid params) instead of the incorrect `-32601` (Method not found), for both session-negotiated and per-request profiles.
- **Bug fix**: the advertised supported protocol version list no longer includes `2024-10-07` — it appeared in one of two disagreeing internal lists and was never actually negotiable. `validation/version.js` is now the single source of truth.
- Client/server capability schemas now accept `extensions` maps and the modern elicitation `{ form?, url? }` sub-shapes (legacy bare `{}` still means form support). URL elicitation is available through `server.elicitation(message, url, options?)` and sends the published `{ mode: 'url', message, url }` request shape; form and URL capabilities are checked independently. Tool `inputSchema`/`outputSchema` wire schemas accept any JSON Schema 2020-12 keywords, and `structuredContent` may be any JSON value — both at runtime and at the type level (the `CallToolResult` generic no longer constrains `structuredContent` to objects; a widening, so existing tools are unaffected).
- Result wire schemas were loosened (`v.object` → `v.looseObject`), so unknown top-level fields returned by handlers are now passed through to the client instead of being silently stripped. This is intentional: it is needed to preserve `resultType` extension values and forward-compatible result fields.
