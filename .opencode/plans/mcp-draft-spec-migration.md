# Plan: dual-era tmcp support for the MCP modern protocol

Source: https://modelcontextprotocol.io/specification/draft/changelog.md

This plan originally targeted a draft revision. **Update (2026-07-29): protocol version `2026-07-28` has been published upstream** — it is tagged `2026-07-28` in modelcontextprotocol/modelcontextprotocol (commit `5f5440bb26a62e2cf3440b92da5a667efa03b267`). tmcp is pinned to that tag's schema snapshot; the "mutable draft" caveats below are obsolete.

tmcp supports legacy, initialization-based versions through `2025-06-18`. It does not need to implement or recognize `2025-11-25` before adding the modern version. Unsupported versions are handled generically and only versions that actually work may be advertised.

## Implementation status (2026-08-04)

Phases 0–5 and the Phase 6 per-request logging and in-memory client paths are **implemented for process-local subscriptions**. Core, strict dual-profile HTTP request routing, stdio delivery/concurrency, sessionless in-memory testing, and transport-owned subscription routing are covered. No bundled distributed `SubscriptionManager` adapter exists yet, so multi-replica subscription delivery remains incomplete. Decisions taken during implementation:

- **No opt-in flag.** The `unstableProtocolVersions` option from Phase 0 was implemented and then removed once the revision was published: per-request `2026-07-28` support is enabled by default. `LATEST_PROTOCOL_VERSION` stays `2025-06-18` for legacy negotiation. `KNOWN_PER_REQUEST_PROTOCOL_VERSIONS` in `validation/version.js` is the source of truth for per-request versions.
- **Terminology**: the code deliberately avoids "modern vs legacy" / `era` naming (future revisions may add new exceptions). Requests are classified as _session-negotiated_ vs _per-request (stateless)_. The classification lives in exactly one place: an internal `stateless: boolean` flag on the existing `AsyncLocalStorage` store (same pattern as `progress_token`, stripped from the public `ctx` getter, transport-provided values discarded). `ctx.protocolVersion` is purely informational and NOT used for classification — legacy sessions also have a negotiated version and may expose it there later.
- **Handlers stay profile-unaware**: for stateless requests the ALS `sessionInfo` slot is fully _replaced_ from the request `_meta` (parsed `clientCapabilities`/`clientInfo`/`logLevel`), so `#client_capabilities`, `log()`, etc. work with zero branching. Transport-provided session info never fills missing per-request fields.
- Version-sensitive logic is confined to three seams: classification/validation in `receive`, the pre-dispatch method policy (`validation/method-policy.js`, declarative `{ session, stateless }` map + `CACHEABLE_METHODS`), and the post-dispatch result encoder (`#decorate_result`).
- **Classification/validation**: presence of ANY reserved per-request `_meta` key (`protocolVersion`, `clientCapabilities`, `clientInfo`, `logLevel`) enters the per-request path; missing either required key or invalid values → `-32602` (never silently downgraded to the session path). Values are validated with the existing valibot schemas. Non-exact/unknown version → `-32022` with `{ supported, requested }`.
- **Errors**: `McpError` now extends `json-rpc-2.0`'s `JSONRPCErrorException` so real `code`/`data` reach the wire (previously everything collapsed to `-32603`). Caveat found in review: `JSONRPCErrorException` rewrites the instance prototype, so the constructor restores it with `Object.setPrototypeOf(this, new.target.prototype)` — without this, `instanceof McpError` is false and the initialize catch path breaks. Constants `-32020/-32021/-32022` are exported from the package root. The `-32601`→`-32602` unknown prompt/resource fix shipped for BOTH eras as a changeset-documented bug fix.
- **`server/discover`**: exact `DiscoverResult` shape (serverInfo only in `_meta`, `supportedVersions`). Notification capability flags are advertised only when the receive context contains a transport-owned subscription manager; direct core/SSE calls continue to strip them. Configured `logging` support is preserved by the Phase 6 per-request gate.
- **Result encoding**: stateless results get `resultType: 'complete'` (handler-provided values preserved only when they are strings), serverInfo merged into `_meta` without clobbering app keys, and `ttlMs`/`cacheScope` on cacheable methods. The encoder ALWAYS overwrites cache fields from the configured `cache` option (`{ ttlMs?, cacheScope?, methods? }`, defaults `{ ttlMs: 0, cacheScope: 'private' }`) — profile-unaware handlers must not be able to opt results into public caching. Null/non-object stateless results are coerced to `{}` and decorated.
- **MRTR**: `tools/call`, `prompts/get`, and `resources/read` can suspend stateless execution with keyed elicitation/sampling `inputRequests`; retries consume matching `inputResponses` and re-execute handlers from the top. Both form and URL elicitation are supported; URL mode uses `elicitation(message, url, { key? })` and the published action-only response flow. The per-registration `replayable: true` acknowledgment gates input calls and clearly documents duplicated-side-effect risk. Stable keys support conditional flow, concurrent input preparation is batched, and broad catch blocks must rethrow the private signal (detectable with `isInputRequired`). Session-negotiated input requests keep the existing awaitable path. Stateless input calls from any other method fail immediately instead of falling through to a server-to-client request that cannot complete. Clients only need to answer the latest `inputRequests`: tmcp carries responses already consumed by the handler in its `requestState` envelope, then merges them beneath newly supplied responses on retry. Elicitation carries the original wire response rather than the handler’s transformed schema output, so coercing/non-idempotent schemas are safely revalidated on later attempts.
- **MRTR request-local state**: a fresh ALS value is created for each `receive()` attempt and discarded afterward. The keyed `pending` map owns both unfinished schema conversion promises and completed input requests; `used_keys` reserves answered and unanswered keys; `consumed_responses` records only validated answers actually used during this attempt; one `registration` object owns handler identity plus its replay flag; `outgoing_state !== undefined` is the only source of truth for handler state. There is no separate preparation set, outgoing-state flag, or split entity/replay flag.
- **Phase 4 subscriptions**: `subscriptions/listen` is per-request-only and uses its typed JSON-RPC request ID as the subscription ID. Filters are validated, deduplicated, reduced against configured capabilities, and limited to registered static/template resource URIs before acknowledgment. `SubscriptionManager` and its in-memory implementation live in `@tmcp/session-manager`; HTTP accepts an injectable manager while stdio and in-memory transports own local managers. Core receives the active manager and stable origin through transport-only request context, reuses `send` for routed output, and reuses `broadcast` for change publication. HTTP creates an opaque origin for each listen POST instead of trusting the legacy `Mcp-Session-Id` header; graceful closure targets the exact returned `Response` and waits for a racing registration attempt. Concrete template updates carry `subscriptionOnly` so legacy broadcasts remain unchanged. Managers buffer until acknowledgment, preserve FIFO delivery and ID type identity, and retain registrations until close dispatch completes. HTTP cancellation is response-stream closure; stdio uses schema-valid, origin-scoped cancellation. Transport shutdown closes owned registrations. SSE remains session-negotiated-only. **Deliberately deferred:** PostgreSQL, Redis, and Durable Objects implementations of `SubscriptionManager`; the bundled implementation is currently in-memory only.
- **Request state**: handlers can use `setRequestState()` / `ctx.requestState`; the pluggable codec defaults to plain JSON with explicit client-tampering warnings and encoded-size bounds. No cross-request state is retained in memory. Stateless roots fail clearly, low-level `request()` stays blocked, and session-negotiated requests reject MRTR-only `inputResponses`/`requestState` fields with `-32602`.
- Result wire schemas were loosened `v.object` → `v.looseObject` (needed to preserve handler-provided `resultType`/extension fields). Side effect, documented in the changeset: unknown top-level handler fields now pass through instead of being stripped.
- `structuredContent` is loosened at the type level too: the `CallToolResult` generic no longer constrains it to `Record<string, unknown>`, so non-object output schemas (e.g. a string) type-check. Pure widening — existing tools unaffected.
- **Strict per-request HTTP runtime**: POST bodies are classified before session allocation, so per-request traffic never reads, creates, or returns a session ID. The transport validates standard and annotated tool parameter headers before dispatch, returns `-32020/-32022` as HTTP 400 and unavailable methods as HTTP 404, keeps successful requests on ordered SSE, and exposes disconnects through `ctx.signal`. Handler-generated errors, including `-32021`, remain inside HTTP 200 SSE because streaming has already started.
- Other packages need NO changes for phases 0–3. Verified after MRTR: stdio serializes `receive()` responses unchanged; HTTP and SSE stream the returned JSON-RPC response without inspecting `resultType`; the in-memory transport returns `response.result`; schema adapters already expose asynchronous `toJsonSchema()`; session managers, auth, and persistence are not involved because no MRTR state survives a request. Transport-level MRTR tests would only test transparent serialization and are optional, not a Phase 3 requirement.
- **Phase 3 review/quality**: delayed concurrent schema conversion, simultaneous `receive()` isolation, latest-only sequential answers, three-attempt coercing-schema replay, prototype-like input keys (`constructor`, `toString`, `__proto__`), unrelated malformed responses, invalid elicitation/sampling response recovery, elicitation decline/cancel, request-state decode/envelope/encode/size failures, adapter preparation failures and recovery, adapter-specific schema keyword stripping, expected-signal logging, stateless roots, unsupported stateless input methods, unknown-method precedence, deterministic simultaneous duplicate keys, URL/form mode-specific elicitation capabilities, malformed session capabilities, URL wire requests plus handler/retry-state content stripping, invalid elicitation URLs, all published enum schema shapes, invalid nested form schemas, and un-awaited input calls all have regression coverage. Pending schema promises are resolved only when tmcp is building `InputRequiredResult`, so they cannot replace an unrelated handler result/error. Public comments/JSDoc explain concrete client/handler behavior rather than internal jargon. Redundant always-successful schema assertions were removed; focused validation tests only cover tmcp-specific restrictions that can regress.
- **Current verification**: the full workspace suite passes 429/429 Vitest tests plus 40/40 conformance checks (469 total), including 223 core, 97 HTTP transport, 45 in-memory transport, five stdio transport, five session-manager, and 54 auth tests. Package source ESLint, touched-file Prettier, generated declarations, publint, full workspace typecheck, and `git diff --check` all pass. The root-wide lint/format commands also scan ignored generated docs output and unparseable create-tmcp templates, so they are not currently clean validation commands. The in-memory legacy elicitation tests now wait for asynchronous request preparation instead of assuming adapter conversion finishes within one microtask.
- **CI package manager**: the root manifest and package-level pins use pnpm 11.2.2. Every workflow lets `pnpm/action-setup` resolve that root pin instead of duplicating a version input. `pnpm install --frozen-lockfile` succeeds with that exact version, matching the lockfile generator.
- **Phase 6 logging**: `server/discover` now advertises configured logging support. Stateless log notifications require the current request's explicit `io.modelcontextprotocol/logLevel`; server defaults, transport session levels, and earlier stateless requests cannot leak into the decision. Regression coverage includes request-over-transport precedence, stateless-to-session isolation, and an MRTR opt-in → omitted → opt-in sequence proving every retry round is evaluated independently in both directions. Session-negotiated logging remains unchanged.
- **Phase 6 transport audit**: HTTP routes `send` notifications through the originating POST controller's `AsyncLocalStorage`; concurrent stateless requests prove logs stay on their own response streams. Stdio registers `send` immediately, so stateless logs work before legacy initialization, while legacy broadcasts and session-state listeners still wait for `initialize`. The listener also forwards standalone/background `send` events before initialization; this broader stdout behavior is intentional and changes servers that construct a transport but never initialize it. The in-memory transport now provides `stateless()` clients with discovery, explicit per-request metadata, strict JSON-RPC errors, automatic MRTR retries, and isolated concurrent notification capture. `Session` and `StatelessClient` inherit one shared set of compatible high-level MCP methods; stateless high-level calls reject input-required results and direct callers to `requestWithInput()` so their successful return types stay compatible. Separate transports sharing one server ignore `send` events outside their own request context. The internal `client_id` exists only to select each client's captured-message bucket; it is never protocol or session state. Subscription helpers remain coupled to Phase 4. SSE will not gain modern support. No schema adapter or session-manager changes are needed for logging.
- **Release/worktree status**: Phase 3, its final review fixes, URL elicitation, the Phase 6 logging slice, HTTP coverage, stdio delivery, in-memory test synchronization, pnpm 11 CI alignment, and the sessionless in-memory client are committed through `4c0b6f8`. The process-local Phase 4 subscription implementation and latest plan updates are unstaged. `.changeset/warm-onions-repeat.md` covers the overall `2026-07-28` protocol feature and Phase 6 logging; `.changeset/mrtr-input-required.md` covers Phase 3 MRTR behavior and follow-up fixes; `.changeset/quiet-stdio-logs.md` covers immediate stdio request-notification delivery; `.changeset/tidy-stateless-clients.md` covers the in-memory client API; `.changeset/calm-streams-listen.md` covers subscriptions.
- `2024-10-07` was dropped when consolidating the two disagreeing version lists (`validation/version.js` won — it was never actually negotiable).
- Deferred deliberately: `_meta` key-syntax/reserved-prefix enforcement and extension-advertisement validation for extension `resultType` values.

## Standing maintainer constraints (apply to all remaining phases)

- tmcp must run everywhere: stdio, long-running servers, serverless. Never keep per-client state in memory; if state is unavoidable, follow the existing pattern of making a persistent store pluggable from the transports (like the session managers).
- Do not add public API that exists only for tests or only for one transport; prefer solving transport needs inside `McpServer`.
- Minimize version branching inside `McpServer` methods — old versions will be removed in a future major and the code should not need refactoring then. Ideal: methods totally unaware of version differences.
- For sampling-with-tools (and its finnicky types), refer to the unmerged `new-protocol-version` branch, which targeted the previous revision.

## Goals and constraints

- Keep all existing legacy clients and server handlers working unchanged.
- Add modern, per-request protocol support without spreading version checks through every handler.
- Keep author-facing handler return types unchanged; add modern-only wire fields after handlers return.
- Do not repurpose exported session-manager interfaces.
- End state is automatic dual-era support: a single server serves legacy and modern clients concurrently with no per-request configuration. Classification is automatic (`initialize`/session selects legacy, valid modern `_meta` selects modern) and modern support is enabled by default (done — the opt-in gate was dropped once the revision was published). The only remaining author-facing switch is the narrow MRTR replay acknowledgment (see 3.5), not a version toggle.
- Ship additively in a minor release. Any required changes to existing public handler types or session-manager contracts require a major release instead.

## Architecture: classify once, adapt at the boundaries

The core abstraction is an immutable request profile created before JSON-RPC dispatch and stored in the existing `AsyncLocalStorage` context:

```js
{
	era: ('legacy' | 'modern',
		protocolVersion,
		clientCapabilities,
		clientInfo,
		logLevel,
		requestId);
}
```

### Request classification

- A request with valid modern `_meta` is modern and stateless.
- Modern requests MUST include both `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`. `clientInfo` and `logLevel` remain optional.
- Modern capabilities are per-request and MUST NOT be inferred from a session or previous request.
- An `initialize` request opens legacy semantics. Subsequent legacy requests use the version and client data negotiated for that stdio process or HTTP session.
- A request is never made modern by merging incomplete `_meta` with legacy session state. Missing required modern metadata is invalid params.
- On HTTP, header/body validation happens before core dispatch. A stale `Mcp-Session-Id` on an otherwise modern request is ignored rather than selecting legacy mode.

### Central protocol policy

Replace the minimum-only `feature_versions` map with a declarative method/feature policy that can express eras and bounded ranges:

```js
const method_policy = {
	initialize: { legacy: true, modern: false },
	ping: { legacy: true, modern: false },
	'server/discover': { legacy: false, modern: true },
	'tools/call': { legacy: true, modern: true },
};
```

A central pre-dispatch guard enforces this policy. Shared method implementations remain branch-free. Protocol-sensitive behavior is isolated to four seams:

1. Request classification and validation
2. Transport behavior
3. Server-to-client input requests (legacy JSON-RPC vs modern MRTR)
4. Notification delivery (legacy sessions vs modern listen subscriptions)

### Central result encoding

After a handler returns, a request-profile-aware encoder produces the wire result:

- Legacy results remain unchanged.
- Modern successful results gain `resultType: "complete"` unless already `input_required`.
- Modern results merge `_meta['io.modelcontextprotocol/serverInfo']` without overwriting application `_meta`.
- Cacheable modern methods gain `ttlMs` and `cacheScope`.
- Author-facing handler schemas/types continue accepting their existing result shapes. Separate modern wire schemas enforce modern required fields.

---

## Phase 0: pin the target and protect the release boundary — DONE (opt-in dropped)

- ~~Pin the draft schema~~ Done: pinned to upstream tag `2026-07-28`, commit `5f5440bb26a62e2cf3440b92da5a667efa03b267`, recorded in `validation/version.js`.
- ~~Explicit opt-in (`unstableProtocolVersions`)~~ Implemented, then removed: the revision was published upstream, so per-request support is on by default with no option.
- `LATEST_PROTOCOL_VERSION` stays `2025-06-18` for legacy negotiation (done).
- Changeset added (`.changeset/warm-onions-repeat.md`); the handler-replay warning belongs to the future MRTR changeset.

## Phase 1: versions, request profiles, and errors (`packages/tmcp`) — DONE (see Implementation status)

### 1.1 Version plumbing — DONE

- Consolidate `validation/index.js:2-9` and `validation/version.js` into one source of truth. The lists currently disagree (`2024-10-07` appears only in `validation/index.js`); decide its fate explicitly and mention it in the changeset.
- Add the pinned modern version only to the opt-in supported set.
- Do not add `2025-11-25` as supported or "recognized but unsupported." Any unimplemented version follows the same unsupported path.
- Preserve legacy `initialize` negotiation. Modern requests do not negotiate: they either use a supported exact version or receive `UnsupportedProtocolVersionError`.
- Replace minimum-version feature checks with era/range policies so removed methods cannot accidentally become supported again as dates increase.

### 1.2 Request profile and modern metadata — DONE

- In `McpServer.receive` (`src/index.js:1111`), validate and extract the modern reserved `_meta` keys before dispatch.
- Put `era`, exact protocol version, request ID, client identity, capabilities, and log level in ALS.
- Continue exposing identity through `ctx.sessionInfo` for source compatibility, but document that it is request-scoped for modern calls. Consider adding clearer aliases such as `ctx.protocolVersion` and `ctx.protocolEra` additively.
- Keep transport-provided auth/custom context. Do not let transport-provided legacy client information fill missing modern fields.
- Pass through OpenTelemetry `traceparent`, `tracestate`, and `baggage`; optionally expose them through a typed context field.

### 1.3 Error model — DONE

- ~~Add constants and structured error helpers~~ Done: `HEADER_MISMATCH` (`-32020`), `MISSING_REQUIRED_CLIENT_CAPABILITY` (`-32021`), `UNSUPPORTED_PROTOCOL_VERSION` (`-32022`) exported from the package root, with internal helper constructors carrying the required `data` shapes (`{ supported, requested }`, `{ requiredCapabilities }`).
- ~~Ensure the error abstraction preserves `code`/`data`~~ Done: `McpError` extends `json-rpc-2.0`'s `JSONRPCErrorException` (with a `Object.setPrototypeOf(this, new.target.prototype)` fix — the parent rewrites the prototype and breaks `instanceof`).
- **Done in 5.1:** preflight `-32020/-32022` errors map to HTTP 400 and unavailable methods map to HTTP 404. Handler-generated errors, including `-32021`, remain in the already-open HTTP 200 SSE stream.
- ~~Not-found error codes~~ Done: unknown prompt/resource now return `-32602` for BOTH eras (deliberate, changeset-documented bug fix). Tool execution failures remain successful `CallToolResult`s with `isError: true`.

### 1.4 Method policy — DONE

- Allow `initialize`, `notifications/initialized`, `ping`, `logging/setLevel`, `resources/subscribe`, and `resources/unsubscribe` only for legacy profiles.
- Register `server/discover` for modern requests before any initialization. A legacy client does not call it; a dual-era client uses a modern request as a probe.
- Keep shared methods (`tools/*`, `prompts/*`, `resources/*`, completion) registered once and guarded centrally.
- Make low-level `server.request()` legacy-only in a modern request context unless a future typed API can safely translate that request into MRTR.

## Phase 2: discovery, result encoding, caching, and schemas — DONE (see Implementation status)

### 2.1 `server/discover` — DONE

Implement the exact modern `DiscoverResult` shape:

```js
{
	resultType: 'complete',
	supportedVersions: [...],
	capabilities: { ... },
	instructions,
	ttlMs,
	cacheScope,
	_meta: {
		'io.modelcontextprotocol/serverInfo': serverInfo
	}
}
```

- Do not return top-level `serverInfo` or a `protocolVersions` field.
- Field names above (`supportedVersions`, serverInfo only inside `_meta`) are asserted from the changelog prose, not verified against the schema — implement 2.1 from the pinned schema snapshot (Phase 0), not from this example.
- Advertise only enabled, actually supported versions.
- Derive modern capabilities separately from legacy initialization capabilities so obsolete transport/session behavior is not advertised.

### 2.2 Modern result decoration — DONE

- Add `resultType: "complete"` to every ordinary modern result at the wire boundary, including empty results.
- Keep `resultType` optional in existing author-facing result inputs to avoid breaking handlers.
- Add strict modern wire schemas where `resultType` is required.
- Preserve extension result types rather than validating only the two core string literals.
- Merge server identity into existing result `_meta` instead of replacing it.

### 2.3 `CacheableResult` — DONE

Add required modern wire fields to:

- `server/discover`
- `tools/list`
- `prompts/list`
- `resources/list`
- `resources/read`
- `resources/templates/list`

Add a cache policy option with safe defaults (`ttlMs: 0`, `cacheScope: "private"`). Allow method-level configuration and a resource-specific read policy where useful. Public caching must be explicit because enabled callbacks, auth context, and dynamic resource/template listing can make otherwise identical methods user-specific.

### 2.4 JSON Schema 2020-12 and JSON values — DONE (except `$ref`/dialect handling, deferred)

- Loosen tool `inputSchema` and `outputSchema` wire schemas to accept any JSON Schema 2020-12 keywords while retaining the protocol's object-root requirements where applicable.
- Allow `structuredContent` to contain any JSON value, not only objects.
- Define default and declared dialect handling.
- Do not automatically dereference network `$ref` values.
- Add documented/resource-bounded handling for `$ref` and composition keywords.
- Preserve adapter output rather than normalizing away unknown keywords such as `x-mcp-header`.

### 2.5 Capability schemas and deprecations — DONE (modern roots: decided, not supported on stateless — see Decided)

- Add `extensions` maps to client and server capabilities using prefixed extension identifiers.
- Update modern sampling, elicitation, and roots capability shapes to the pinned schema.
- Mark Roots, Sampling, Logging, and sampling `includeContext` values `thisServer`/`allServers` deprecated without removing legacy support.
- Decide explicitly whether modern roots support is implemented through MRTR. Deprecation alone does not remove roots from the modern draft.

## Phase 3: Multi Round-Trip Requests (MRTR) — DONE (see Implementation status)

MRTR is the highest-risk part and the only feature that changes handler execution semantics.

### 3.1 Scope

- Only `tools/call`, `prompts/get`, and `resources/read` may return `InputRequiredResult`.
- Session-negotiated calls keep using the existing awaitable JSON-RPC client path.
- Stateless `elicitation()` and `message()` (roots are not supported) consume a matching `inputResponses` entry or stop the current execution so tmcp can return `InputRequiredResult`.
- The dispatch boundary catches that signal and emits an `InputRequiredResult`; arbitrary user errors continue through normal error handling.

### 3.2 Stable input identity

- `inputRequests` and `inputResponses` are keyed maps, not ordered arrays.
- Generate deterministic unique keys for source-compatible calls and add an optional stable key to public input APIs for handlers with conditional control flow.
- Validate every supplied response against the corresponding response schema and ignore unrelated extra entries as required by the draft.
- Never emit an input request unless the current stateless request declares the required client capability. Return `-32021` when a required capability is absent.

### 3.3 Replay contract

- A retry re-executes the handler from the top. Side effects before the last unresolved input request may execute more than once.
- Document that code before an MRTR input point must be idempotent or deferred until all required input is available.
- Document that broad `catch` blocks must rethrow the internal input-required signal; add tests for accidental swallowing and make the signal identifiable without exposing a forgeable public protocol object.
- Do not claim transparent continuation semantics: JavaScript async continuations cannot be serialized across stateless retries.

### 3.4 `requestState` security — DECIDED: pluggable codec, unopinionated default

Decision: tmcp ships with as few opinions as possible by default — the default codec is plain `JSON.stringify`/`JSON.parse` (no signing, no encryption), and the codec is pluggable so advanced deployments can substitute an integrity-protected implementation. Consequences:

- The default codec provides NO integrity protection: returned `requestState` is attacker-controlled. The JSDoc on the codec option and on the state APIs must say this explicitly, and tmcp must never put trusted/secret data into default-encoded state.
- Omit `requestState` entirely when keyed replay needs no additional state.
- The guidance below applies to custom codec implementations (documented, not enforced by tmcp): bind protected state to the authenticated principal, short expiry, originating method, and a digest of salient request parameters; use shared key material for state that must survive retries across nodes; enforce server-side single-use where a signed expiry is insufficient.
- Bound the encoded state size before decode and after encode. Custom codecs
  are responsible for bounding decoded application values because tmcp cannot
  measure arbitrary decoded representations meaningfully.

### 3.5 Replay acknowledgment gate — DECIDED: per-registration flag

Replay risk only exists for handlers that actually request input: a handler that never calls `elicitation()` or `message()` is replay-safe by construction, because no retry ever occurs. (Roots are NOT supported on stateless requests — see Decided.)

Decision: the exact implemented flag is `{ replayable: true }` on tool, prompt, resource, and template definitions. Requirements from the maintainer:

- The JSDoc for the flag must explain the WHOLE problem clearly: stateless retries re-execute the handler from the top, so side effects before an input call run once per attempt; the flag is the author asserting that code before input points is idempotent or deferred. This gate is a tmcp safety measure, NOT a spec requirement.
- The structured error raised when a stateless request reaches an un-acknowledged input call must likewise explain WHY it exists (handler re-execution / duplicated side effects) and name the flag to set — not just "not allowed".
- Legacy requests are unaffected (they keep the awaitable JSON-RPC path).
- This keeps the default-on posture safe: discovery, stateless requests, and result decoration are automatic; only input-requesting handlers need author action.

## Phase 4: subscriptions — DONE for process-local managers

### 4.1 Core subscription model

- **Done:** add `subscriptions/listen` as a long-lived per-request method.
- **Done:** use the listen request's JSON-RPC ID as `io.modelcontextprotocol/subscriptionId`; do not mint a separate ID.
- **Done:** validate the requested `notifications` filter and reduce it to the subset the server can honor.
- **Done:** send `notifications/subscriptions/acknowledged` as the first notification for that subscription ID.
- **Done:** tag every subsequent listen-stream notification with the subscription ID.
- **Done:** on graceful server closure, return an empty complete result whose `_meta` contains that same subscription ID.
- **Done:** keep request-scoped progress/logging notifications on their originating request event path, never on a listen event; existing transports have isolation coverage.

### 4.2 Dedicated manager

- **Done:** introduce a new `SubscriptionManager` abstraction keyed by request ID plus a stable serializable transport origin, with create/send/close semantics matching the existing stream-manager architecture.
- **Done:** store accepted typed filters independently for each concurrent subscription.
- **Done:** route list changes and resource updates only to matching subscriptions.
- **Done:** keep `StreamSessionManager` and `InfoSessionManager` unchanged and legacy-only. Their public contracts were not repurposed.
- **Done:** assign each HTTP listen stream an opaque transport-generated origin; caller-provided legacy session IDs never participate in modern subscription identity.
- **Deliberately deferred:** provide Redis, PostgreSQL, and Durable Objects `SubscriptionManager` adapters. The repository currently ships only `InMemorySubscriptionManager`; injecting the existing distributed stream/info managers does not distribute per-request subscriptions.

### 4.3 Distributed subscription managers — DELIBERATELY DEFERRED

Each bundled distributed session-manager package needs a separate implementation of the new contract:

- `@tmcp/session-manager-postgres`: add `PostgresSubscriptionManager`.
- `@tmcp/session-manager-redis`: add `RedisSubscriptionManager`.
- `@tmcp/session-manager-durable-objects`: add `DurableObjectSubscriptionManager`.

The adapters must persist only serializable subscription descriptors while keeping response callbacks local to the replica holding the stream. They must atomically claim `(origin, typed request ID)`, preserve numeric-versus-string ID identity, buffer publication until acknowledgment, preserve per-subscription FIFO order, publish matching changes to the owning replica, route close commands back to that replica, and keep a key occupied until close dispatch completes.

Until at least one of these adapters exists, HTTP's injectable manager supports custom implementations but the built-in `subscriptions/listen` path is process-local and cannot guarantee delivery when listen requests and change publication reach different replicas.

### 4.4 Cancellation

- **Done:** HTTP response-stream closure aborts the listen request, removes the subscription, and stops further writes; graceful closure by exact `Response` waits for pending registration.
- **Done:** stdio `notifications/cancelled` referencing the listen request ID closes that subscription. It is not treated as a generic server-to-client cancellation mechanism.
- **Done:** core handles `notifications/cancelled` for stdio listen requests; HTTP uses response-stream closure and does not route protocol cancellation POSTs. Transport-owned APIs provide graceful shutdown.

## Phase 5: transports

### 5.1 `@tmcp/transport-http`

Status: implemented. Request-scoped `send` notifications, including logs and progress, use the originating POST sink through transport-local `AsyncLocalStorage`; cancellation changes the sink state before aborting handler context so no later messages are written.

Detailed execution plan: [`strict-per-request-http-runtime.md`](./strict-per-request-http-runtime.md).

Parse a single body message first, validate its headers, classify its era, then choose the runtime.

#### Modern runtime

- **Done:** map preflight protocol errors to required HTTP statuses: HTTP 400 with `-32020` for headers, HTTP 400 with `-32022` for versions, and HTTP 404 with `-32601` for unavailable methods. Handler-generated `-32021` errors stay in the already-open HTTP 200 SSE stream.
- **Done:** accept one JSON-RPC request or notification per POST; reject batches and per-request client JSON-RPC responses.
- **Done:** validate `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, Base64 sentinel values, and recognized `Mcp-Param-*` headers against the body.
- **Done:** return 202 with no body for accepted notifications and request-scoped SSE with `X-Accel-Buffering: no` for requests.
- **Done:** treat response-stream closure as cooperative cancellation, abort `ctx.signal`, and stop writes after cancellation.
- **Done:** ignore `Mcp-Session-Id` and `Last-Event-ID`, never mint or echo a per-request session ID, and return 405 for modern GET and DELETE.
- **Done:** validate `Origin` independently from CORS response headers.

#### Legacy runtime

- **Done:** preserve existing initialize/session, GET stream, DELETE, client-response, and session-manager behavior for negotiated legacy clients.
- **Done:** classify from per-request metadata and protocol versions rather than treating a session header as modern state.

#### CORS

- Add modern `Mcp-*` headers to configurable allow/expose defaults where applicable.
- Keep CORS behavior separate from mandatory request-header and Origin validation.

### 5.2 `@tmcp/transport-stdio`

Status note: stateless request/response, subscription routing, cancellation, and graceful closure are implemented. Per-request work runs concurrently so long-lived listens do not block later messages, while legacy requests remain serialized.

- **Done:** wire `send` output immediately rather than waiting for `initialize`. Stateless logs and progress can be written before initialization. This forwards all standalone `send` events, including background notifications emitted without a request; that pre-initialize stdout behavior is accepted. Legacy `broadcast` output remains intentionally initialization-gated, while per-request list/resource changes use subscriptions.
- **Done:** register transport listeners once in the constructor so repeated `initialize` requests do not duplicate them.
- **Done:** process per-request calls concurrently while preserving serialized execution for legacy requests.
- **Done:** serialize stdout writes while request processing is concurrent.
- **Done:** route subscription notifications, support request-ID cancellation, suppress cancelled listen results by task identity, and expose graceful closure through `closeSubscription(id)`.
- **Done:** continue storing process-scoped identity only after a legacy `initialize`.

### 5.3 `@tmcp/transport-in-memory`

- **Done:** `transport.stateless()` creates a sessionless client with `discover()`, explicit client metadata, strict `JSONRPCErrorException` failures, isolated notification capture, and bounded `requestWithInput()` MRTR retries. Its ordinary MCP methods share signatures and implementation with `Session`.
- **Done:** concurrent sessionless clients, including clients owned by separate transports sharing one server, have explicit coverage proving request notifications do not cross clients; session-negotiated behavior remains covered.
- **Done:** expose `StatelessClient.listen()` and `StatelessSubscription` helpers for per-request subscriptions.
- **Done:** keep legacy initialization/session helpers unchanged.
- **Done:** let stateless tests select an explicit protocol version through client options.

### 5.4 `@tmcp/transport-sse`

- Mark HTTP+SSE deprecated in docs and package metadata according to the project's release policy.
- Do not add modern support to this deprecated transport.

### 5.5 Session managers

- **Done:** keep all existing session-manager interfaces and adapters unchanged for legacy HTTP behavior.
- **Done:** add a separate subscription manager interface rather than changing the meaning of session IDs or existing stream managers.
- **Deliberately deferred:** add bundled distributed implementations for PostgreSQL, Redis, and Durable Objects. They remain required before claiming built-in multi-replica subscription support.
- Document server-minted handles passed as tool arguments as the modern pattern for application cross-call state. Consider a utility only after concrete repeated use appears.

## Phase 6: per-request logging and notification behavior

- For modern requests, emit `notifications/message` only when `io.modelcontextprotocol/logLevel` was explicitly included on that request. **Done in core.**
- Use that request's level only; never fall back to a previous modern request or session default. **Done in core.**
- For legacy requests, retain `logging/setLevel` and the existing session/default behavior. **Unchanged and covered by the existing session tests.**
- Ensure progress and logging notifications are delivered only to the originating request response sink. **Done for existing transports:** HTTP has concurrent request-stream isolation coverage, stdio immediately writes `send` notifications to its single protocol stream, and in-memory sessionless clients isolate concurrent notification routes.
- **Done:** keep legacy list/resource broadcasts unchanged while routing per-request changes through the subscription manager.

## Phase 7: auth (`@tmcp/auth`)

Audit and extend the existing implementation rather than adding duplicate paths:

- `application_type` already exists in `src/schemas.js`; constrain and require the appropriate value where the draft requires clients to supply it.
- Client ID Metadata Document fetching already exists in `src/oauth.js`; harden it with HTTPS/path requirements, complete metadata validation, timeout, response-size limit, redirect policy, caching, and SSRF-safe URL handling.
- Keep Dynamic Client Registration for backward compatibility while documenting its deprecation.
- Add `iss` to built-in authorization responses and define how custom provider redirects can safely opt into the same behavior.
- Issuer-keyed persisted credentials remain a client-side requirement; document it without adding unrelated server storage.

## Phase 8: tasks extension (optional)

Tasks are an official extension, not part of core modern protocol support. If implemented later, add a separate `@tmcp/tasks` package advertising `io.modelcontextprotocol/tasks` through `extensions`, with `tasks/get` polling and `tasks/update`. Do not block the core migration on it.

## Phase 9: tests, docs, and release

### Test matrix

Add dual-era coverage for every shared method and transport:

- Legacy initialize, negotiated versions, sessions, server-initiated requests, GET streams, and DELETE remain unchanged.
- Modern exact-version validation and unsupported-version payloads.
- Required modern `_meta`; no capability/session leakage across requests.
- Correct `server/discover` shape and cache fields.
- Modern result decoration without changing handler return requirements.
- Method policy for removed modern methods.
- HTTP required/mismatched headers, Base64 values, custom parameter headers, status codes, batches, responses, Origin validation, and stream cancellation.
- **Done:** subscription acknowledgment ordering, filtering, IDs, concurrent subscriptions, cancellation, and graceful closure.
- **Done:** stdio concurrency and graceful closure while a subscription is open.
- MRTR keyed replay, multiple rounds, conditional calls, capability failures, invalid responses, side-effect documentation examples, state tampering, expiry, principal binding, and request binding.
- Legacy and modern clients operating concurrently against the same HTTP server.
- Deterministic tool ordering, while avoiding assertions that imply dynamic/auth-specific lists are publicly cacheable.

### Docs

- Add a dual-era architecture page and wire examples for both eras.
- Document modern opt-in, handler replay/idempotency, cache safety, subscription lifecycle, and transport security.
- Update READMEs, `apps/docs`, and `create-tmcp` templates only after the compatibility APIs stabilize.
- Clearly distinguish deprecated features from removed modern methods.

### Release conditions

This can ship as a minor release only if:

- Legacy behavior and exported handler input types remain compatible.
- Modern required fields are injected at the wire boundary.
- Existing session-manager contracts are unchanged.
- Published per-request support remains additive and enabled by default.
- MRTR replay occurs only for modern requests and is prominently documented.

Otherwise, defer the incompatible portion to the next major release.

## Suggested implementation order

1. ~~Pin the schema and add opt-in version plumbing~~ (done; opt-in later removed — default-on).
2. ~~Add request profiles, structured errors, and central method policy~~ (done).
3. ~~Add modern result encoding, exact `server/discover`, cache policy, capability schemas, and JSON Schema loosening~~ (done).
4. ~~Implement and harden MRTR after stateless request plumbing is fully tested~~ (done; core-only, transports forward it unchanged).
5. ~~Add the dedicated subscription manager, transport streaming, cancellation, and stdio concurrency~~ (done for process-local managers; distributed adapters remain open work).
6. ~~Complete per-request logging/deprecation behavior and in-memory helpers~~ (done, including subscription helpers).
7. Add HTTP validation/status handling and the remaining transport hardening from Phase 5 without splitting core behavior into duplicated runtimes.
8. Harden existing auth support independently.
9. Update docs/templates and release.
10. Consider the tasks extension separately.

## Decided (was open)

- ~~Modern versions gated behind an instability-marked option~~ Superseded: the revision was published upstream (tag `2026-07-28`), so per-request handling is enabled by default with no option at all. Only the MRTR replay acknowledgment (3.5) remains author-facing. Handlers without input requests get automatic dual-era support with no action.
- The legacy `-32601` → `-32602` not-found error fix shipped for BOTH eras as a changeset-documented bug fix (see 1.3).
- Roots are NOT implemented through MRTR: roots are deprecated in `2026-07-28`; session-negotiated roots keep working, and stateless `refreshRoots()` calls fail clearly instead of emitting a roots input request.
- `requestState` encoding: pluggable codec with an unopinionated `JSON.stringify` default — no built-in crypto (see 3.4).
- Replay protection: per-registration acknowledgment flag on tool, prompt, resource, and template definitions (see 3.5), with JSDoc and error messages that explain the re-execution problem, not just state the rule.
- Input identity: additive `{ key?: string }` options on existing `elicitation()` and `message()` APIs; automatic numeric keys remain source-compatible for straight-line handlers.

## Open work

- Implement the deliberately deferred PostgreSQL, Redis, and Durable Objects `SubscriptionManager` adapters described in Phase 4.3. The core currently ships an in-memory default and a pub/sub-compatible contract only; serverless and multi-replica deployments must provide a custom adapter until bundled implementations exist.
