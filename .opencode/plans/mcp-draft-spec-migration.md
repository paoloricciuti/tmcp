# Plan: tmcp support for the MCP draft spec

Source: https://modelcontextprotocol.io/specification/draft/changelog.md (changes relative to `2025-11-25`)

## Context and one big caveat

tmcp currently tops out at protocol `2025-06-18` (`packages/tmcp/src/validation/version.js:6`). The draft changelog is written **relative to `2025-11-25`**, a version tmcp never implemented. So a few draft changes "remove" things tmcp never had (URL-mode elicitation's `elicitationId`, experimental tasks, SSE resumability) — those are free. But it also means the version table needs `2025-11-25` awareness even if we only add it as a recognized-but-unsupported entry, and we should decide explicitly: **skip `2025-11-25` and jump from `2025-06-18` to the draft** (recommended — the draft deletes most of what `2025-11-25` added).

The draft is radically incompatible with all prior versions (no `initialize`, no sessions). The whole plan is therefore built around **dual-mode operation**: the existing handshake/session path stays for legacy clients, and a new stateless path is added, gated by the existing `feature_versions` mechanism in `version.js`.

---

## Phase 1 — Core protocol (`packages/tmcp`)

### 1.1 Version plumbing (`src/validation/version.js`)

- Add the draft version to `SUPPORTED_VERSIONS`; extend the `feature_versions` map with new features (`server/discover`, `subscriptions/listen`, `mrtr`, `cacheable_results`, `stateless_meta`) and version-ceilings for removed ones (`ping`, `logging/setLevel`, `resources/subscribe`, `initialize`, `notifications/roots/list_changed` are absent in draft).
- Fix the existing inconsistency: `validation/index.js:2-9` and `version.js` hold two *different* supported-version lists; consolidate to one source of truth.

### 1.2 Stateless request identity (SEP-2575)

- In `McpServer.receive` (`src/index.js:1111`), extract the reserved `_meta` keys from every request: `io.modelcontextprotocol/protocolVersion`, `.../clientInfo`, `.../clientCapabilities`, `.../logLevel`, and populate the per-request ALS context from them. This makes `ctx.sessionInfo` work with zero transport help.
- Precedence rule: `_meta`-derived identity (draft clients) > transport-provided `sessionInfo` (legacy clients that did `initialize`).
- On a `_meta` protocol version the server doesn't support, return the new `UnsupportedProtocolVersionError` (**-32022**).
- Keep the `initialize` / `notifications/initialized` handlers registered for legacy clients; the negotiated-per-message path decides which world each request lives in.

### 1.3 `server/discover` (mandatory)

- New method returning `{ protocolVersions: [...], capabilities, serverInfo }` — essentially the current `initialize` result reshaped, minus negotiation. Register unconditionally in the constructor.
- This also serves as the stdio backward-compat probe, so it must respond even to legacy-version clients.

### 1.4 `resultType` on all results (SEP-2322)

- Add a response post-processing layer (wrap the `JSONRPCServer` dispatch in `receive`) that stamps `resultType: "complete"` on every result when the request's negotiated version is draft+. Don't stamp for legacy versions.
- Update result schemas in `validation/index.js` accordingly (`CallToolResult`, `GetPromptResult`, etc. gain optional `resultType`).

### 1.5 MRTR — the big one (SEP-2322)

Replaces server-initiated requests (`elicitation/create`, `sampling/createMessage`, `roots/list`) with interim `input_required` results. This is the largest design change:

- **Mechanism**: when a handler calls `server.elicitation(...)` (or `.message(...)`) under a draft-version request and no matching response is available, throw an internal `InputRequiredInterrupt`. The `tools/call` (and `prompts/get`, `resources/read`) dispatchers catch it and return an `InputRequiredResult` (`resultType: "input_required"`, `inputRequests: [...]`, `requestState`).
- **Replay model**: on retry, the client re-sends the original request with `inputResponses` (+ echoed `requestState`). The handler **re-executes from the top**; each `elicitation()`/`message()` call consumes the matching response from `inputResponses` in deterministic call order (index encoded in `requestState`). Document clearly that handlers must be idempotent up to their last input request — same model the official SDKs are converging on.
- Keep the current awaitable JSON-RPC-client path (`#client.request(...)`, `src/index.js:350-364`) for legacy-version requests. The public API (`await server.elicitation(...)`) stays identical in both modes — only the wire mechanics differ.
- **Roots**: `roots/list` no longer exists in draft and Roots is deprecated anyway; `refreshRoots()`/`server.roots` stay legacy-only and get `@deprecated` JSDoc.
- `requestState` needs a size-bounded, opaque encoding (sign/HMAC it if it embeds server data — it round-trips through the client).

### 1.6 Removals / per-request logging (SEP-2575)

- `ping`, `logging/setLevel`, `notifications/roots/list_changed` handlers: keep registered, but reject when the request's version is draft+ (method-not-found) — gate via `feature_versions`.
- `server.log()` (`src/index.js:1279`): for draft requests, only emit `notifications/message` when the request carried `io.modelcontextprotocol/logLevel` in `_meta` (MUST NOT otherwise). Level source becomes `_meta` per-request, falling back to session log level for legacy.
- Mark `capabilities.logging` and sampling-related public API `@deprecated` in JSDoc (deprecation window — don't remove yet).

### 1.7 `CacheableResult` — `ttlMs` + `cacheScope` (SEP-2549)

- Add required fields to results of `tools/list`, `prompts/list`, `resources/list`, `resources/read`, `resources/templates/list` (draft requests only).
- New `ServerOptions.cache` config, e.g. `{ tools?: { ttlMs, cacheScope }, resources?: ..., default?: ... }`, with a safe default (`ttlMs: 0`, `cacheScope: "private"`), plus per-resource override on the definition objects.

### 1.8 Error codes & misc

- Add named error constants: `HeaderMismatchError` **-32020**, `MissingRequiredClientCapability` **-32021**, `UnsupportedProtocolVersion` **-32022**; export from `validation/index.js`.
- Resource-not-found in `resources/read` currently throws **-32601** (`src/index.js:750`) — change to **-32602** per the changelog (and it was arguably wrong before).
- Add `extensions` field to `ServerCapabilities`/`ClientCapabilities` schemas and to `ServerOptions.capabilities`.
- Verify tool `inputSchema`/`outputSchema` validation doesn't restrict JSON Schema 2020-12 keywords (SEP-2106) — tmcp passes adapter output through mostly untouched, so this is likely just loosening any Valibot schema that constrains it, and loosening `structuredContent` to any JSON value.
- `tools/list` ordering: `Map` iteration is already insertion-ordered (deterministic) — just add a test locking it in.
- Document OTel `_meta` keys (`traceparent`, `tracestate`, `baggage`) as pass-through; optionally expose them on `ctx`.

## Phase 2 — Subscriptions (`subscriptions/listen`, SEP-2575)

Replaces the HTTP GET stream and `resources/subscribe`/`unsubscribe`:

- New core method `subscriptions/listen` in `McpServer`: validates requested types (`toolsListChanged`, `promptsListChanged`, `resourcesListChanged`, `resourceSubscriptions` + URIs), mints a `subscriptionId`, sends an acknowledgment, then keeps the response stream open.
- Rework the internal event model: `broadcast` events (`#notify_*_list_changed`, `notifications/resources/updated`, `src/index.js:829-849`) get routed to matching **listen streams**, tagged with `io.modelcontextprotocol/subscriptionId` in `_meta`, instead of "all sessions".
- Request-scoped notifications (`notifications/progress`, `notifications/message`) keep flowing on the originating request's response stream — the existing `send` event path already does this correctly.
- Legacy `resources/subscribe`/`unsubscribe` stay, gated to pre-draft versions.

## Phase 3 — Transports

### 3.1 `@tmcp/transport-http` (biggest transport change)

- **Draft mode** (dual-mode with legacy, switched per-request by `Mcp-Protocol-Version`/`_meta`/presence of session header):
  - No `mcp-session-id` minting/reading; no per-session state lookups. POST body + `_meta` is everything.
  - `GET` returns 405 for draft clients (legacy GET-SSE stays for old clients).
  - `subscriptions/listen` POST → long-lived SSE/streamed response bound to that request's controller.
  - **Required headers**: validate `Mcp-Method` (and `Mcp-Name` for `tools/call`/`prompts/get`) against the body; mismatch → `HeaderMismatchError` -32020 (SEP-2243). Add `x-mcp-header` support: surface tool-parameter-driven custom headers.
  - No `Last-Event-ID`/event-id resumability to remove — tmcp never implemented it. Nothing to do.
  - `DELETE` becomes legacy-only.
- CORS defaults updated (expose/allow the new `Mcp-*` headers).

### 3.2 `@tmcp/transport-stdio`

- Currently refuses to wire up `send`/`broadcast` until `initialize` arrives (`src/index.js:39-80`) — draft clients never send it. Wire listeners immediately; treat `server/discover` as the compat probe; per-request identity comes from `_meta` via core.

### 3.3 `@tmcp/transport-sse`

- Formally deprecated by the spec (HTTP+SSE, deprecated since 2025-03-26). Mark the package deprecated (README + npm deprecation note in a later release); no draft support added.

### 3.4 `@tmcp/transport-in-memory`

- Update the `Session` test helper: add `discover()`, `_meta`-based identity, `subscriptions/listen`, MRTR retry helpers (`callTool` that auto-answers `input_required`), `resultType` assertions. Keep legacy methods for legacy-version tests.

### 3.5 Session managers (`@tmcp/session-manager*`)

- For draft clients they lose their original purpose (no sessions). They get repurposed rather than deleted:
  - `StreamSessionManager` → becomes the **listen-stream registry** (needed so multi-node deployments can still fan out list-changed notifications via Redis/Postgres/DO pub-sub to whichever node holds the `subscriptions/listen` stream).
  - `InfoSessionManager` (client info/capabilities/log level per session) → legacy-only; document as such.
- The spec's answer for cross-call state is **server-minted handles passed as tool arguments** — add a small documented pattern (and possibly a `createHandleStore` utility in `tmcp/utils`) rather than a new package.

## Phase 4 — Auth (`@tmcp/auth`)

- **`iss` in authorization responses** (RFC 9207, SEP-2468): add `iss` to the redirect back from `/authorize` — server-side SHOULD, easy win.
- **`application_type` in DCR** (SEP-837): accept/validate the field in the `/register` endpoint.
- **Client ID Metadata Documents** (PR #2858): DCR is now deprecated in favor of CIMD. Add CIMD support: accept an HTTPS URL as `client_id`, fetch + validate the metadata document, cache it. Keep DCR working for backward compat.
- Issuer-keyed credentials (SEP-2352) is a client-side MUST — docs only.

## Phase 5 — Tasks extension (optional, likely a new package)

Tasks moved out of core into the `io.modelcontextprotocol/tasks` extension (SEP-2663). tmcp has zero tasks code today, so this is greenfield and can ship after the core migration: a `@tmcp/tasks` package registering `tasks/get` (polling) and `tasks/update` via the new `extensions` capability, letting tool handlers return task handles unsolicited. Phase 5 / stretch, not a blocker.

## Phase 6 — Tests, docs, release

- Tests: dual-mode coverage matrix in `packages/tmcp/test/mcp-server.test.js` + transport tests (legacy client vs draft client for every feature); MRTR replay determinism tests; header-mismatch tests; `resultType`/`ttlMs` presence tests.
- Docs (`apps/docs`, READMEs) + `create-tmcp` templates updated for the stateless model.
- Changesets: **minor** while additive/dual-mode; the deprecations (SSE transport, roots/sampling/logging APIs) documented per the spec's 12-month lifecycle. Nothing removed yet.

## Suggested implementation order

1. Version plumbing + error codes + `resultType` + `_meta` identity + `server/discover` (foundation, low risk)
2. `CacheableResult`, schema loosening, `extensions` field (small, independent)
3. `subscriptions/listen` core + HTTP/stdio transport rework, `Mcp-Method`/`Mcp-Name` headers
4. MRTR engine (highest-risk piece — do it once the stateless plumbing is in and testable)
5. Auth changes (independent, can parallel anything)
6. Deprecation passes, in-memory transport/test helpers, docs
7. Tasks extension (optional)

## Open decisions

- **(a)** Confirm skipping `2025-11-25` as a negotiable version and jumping straight from `2025-06-18` to the draft.
- **(b)** The MRTR replay contract (re-execute handlers from the top with responses consumed in call order) — it's the only change that imposes a behavioral requirement (idempotency up to the input request) on existing user code.
