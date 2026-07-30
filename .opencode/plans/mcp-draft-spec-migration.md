# Plan: dual-era tmcp support for the MCP modern protocol

Source: https://modelcontextprotocol.io/specification/draft/changelog.md

This plan originally targeted a draft revision. **Update (2026-07-29): protocol version `2026-07-28` has been published upstream** — it is tagged `2026-07-28` in modelcontextprotocol/modelcontextprotocol (commit `5f5440bb26a62e2cf3440b92da5a667efa03b267`). tmcp is pinned to that tag's schema snapshot; the "mutable draft" caveats below are obsolete.

tmcp supports legacy, initialization-based versions through `2025-06-18`. It does not need to implement or recognize `2025-11-25` before adding the modern version. Unsupported versions are handled generically and only versions that actually work may be advertised.

## Implementation status (2026-07-30)

Phases 0–3 are **implemented** in `packages/tmcp` (core only; transports untouched). Decisions taken during implementation:

- **No opt-in flag.** The `unstableProtocolVersions` option from Phase 0 was implemented and then removed once the revision was published: per-request `2026-07-28` support is enabled by default. `LATEST_PROTOCOL_VERSION` stays `2025-06-18` for legacy negotiation. `KNOWN_PER_REQUEST_PROTOCOL_VERSIONS` in `validation/version.js` is the source of truth for per-request versions.
- **Terminology**: the code deliberately avoids "modern vs legacy" / `era` naming (future revisions may add new exceptions). Requests are classified as *session-negotiated* vs *per-request (stateless)*. The classification lives in exactly one place: an internal `stateless: boolean` flag on the existing `AsyncLocalStorage` store (same pattern as `progress_token`, stripped from the public `ctx` getter, transport-provided values discarded). `ctx.protocolVersion` is purely informational and NOT used for classification — legacy sessions also have a negotiated version and may expose it there later.
- **Handlers stay profile-unaware**: for stateless requests the ALS `sessionInfo` slot is fully *replaced* from the request `_meta` (parsed `clientCapabilities`/`clientInfo`/`logLevel`), so `#client_capabilities`, `log()`, etc. work with zero branching. Transport-provided session info never fills missing per-request fields.
- Version-sensitive logic is confined to three seams: classification/validation in `receive`, the pre-dispatch method policy (`validation/method-policy.js`, declarative `{ session, stateless }` map + `CACHEABLE_METHODS`), and the post-dispatch result encoder (`#decorate_result`).
- **Classification/validation**: presence of ANY reserved per-request `_meta` key (`protocolVersion`, `clientCapabilities`, `clientInfo`, `logLevel`) enters the per-request path; missing either required key or invalid values → `-32602` (never silently downgraded to the session path). Values are validated with the existing valibot schemas. Non-exact/unknown version → `-32022` with `{ supported, requested }`.
- **Errors**: `McpError` now extends `json-rpc-2.0`'s `JSONRPCErrorException` so real `code`/`data` reach the wire (previously everything collapsed to `-32603`). Caveat found in review: `JSONRPCErrorException` rewrites the instance prototype, so the constructor restores it with `Object.setPrototypeOf(this, new.target.prototype)` — without this, `instanceof McpError` is false and the initialize catch path breaks. Constants `-32020/-32021/-32022` are exported from the package root. The `-32601`→`-32602` unknown prompt/resource fix shipped for BOTH eras as a changeset-documented bug fix.
- **`server/discover`**: exact `DiscoverResult` shape (serverInfo only in `_meta`, `supportedVersions`). Advertised capabilities strip `resources.subscribe`, all `listChanged` flags, and `logging` — features whose stateless delivery mechanism (Phase 4 subscriptions / Phase 6 log gating) is not implemented must not be advertised.
- **Result encoding**: stateless results get `resultType: 'complete'` (handler-provided values preserved only when they are strings), serverInfo merged into `_meta` without clobbering app keys, and `ttlMs`/`cacheScope` on cacheable methods. The encoder ALWAYS overwrites cache fields from the configured `cache` option (`{ ttlMs?, cacheScope?, methods? }`, defaults `{ ttlMs: 0, cacheScope: 'private' }`) — profile-unaware handlers must not be able to opt results into public caching. Null/non-object stateless results are coerced to `{}` and decorated.
- **MRTR**: `tools/call`, `prompts/get`, and `resources/read` can suspend stateless execution with keyed elicitation/sampling `inputRequests`; retries consume matching `inputResponses` and re-execute handlers from the top. The per-registration `replayable: true` acknowledgment gates input calls and clearly documents duplicated-side-effect risk. Stable keys support conditional flow, concurrent input preparation is batched, and broad catch blocks must rethrow the private signal (detectable with `isInputRequired`). Session-negotiated input requests keep the existing awaitable path. Stateless input calls from any other method fail immediately instead of falling through to a server-to-client request that cannot complete. Clients only need to answer the latest `inputRequests`: tmcp carries responses already consumed by the handler in its `requestState` envelope, then merges them beneath newly supplied responses on retry. Elicitation carries the original wire response rather than the handler’s transformed schema output, so coercing/non-idempotent schemas are safely revalidated on later attempts.
- **MRTR request-local state**: a fresh ALS value is created for each `receive()` attempt and discarded afterward. The keyed `pending` map owns both unfinished schema conversion promises and completed input requests; `used_keys` reserves answered and unanswered keys; `consumed_responses` records only validated answers actually used during this attempt; one `registration` object owns handler identity plus its replay flag; `outgoing_state !== undefined` is the only source of truth for handler state. There is no separate preparation set, outgoing-state flag, or split entity/replay flag.
- **Request state**: handlers can use `setRequestState()` / `ctx.requestState`; the pluggable codec defaults to plain JSON with explicit client-tampering warnings and encoded-size bounds. No cross-request state is retained in memory. Stateless roots fail clearly, low-level `request()` stays blocked, and session-negotiated requests reject MRTR-only `inputResponses`/`requestState` fields with `-32602`.
- Result wire schemas were loosened `v.object` → `v.looseObject` (needed to preserve handler-provided `resultType`/extension fields). Side effect, documented in the changeset: unknown top-level handler fields now pass through instead of being stripped.
- `structuredContent` is loosened at the type level too: the `CallToolResult` generic no longer constrains it to `Record<string, unknown>`, so non-object output schemas (e.g. a string) type-check. Pure widening — existing tools unaffected.
- The Phase 1.3 HTTP status mapping (`-32020/-32021/-32022` → 400, `-32601` → 404) was **moved to Phase 5.1**: core exports the constants and produces correct error bodies; shipping only status codes without the modern header validation buys nothing. Until 5.1, these errors travel as JSON-RPC errors over HTTP 200.
- Other packages need NO changes for phases 0–3. Verified after MRTR: stdio serializes `receive()` responses unchanged; HTTP and SSE stream the returned JSON-RPC response without inspecting `resultType`; the in-memory transport returns `response.result`; schema adapters already expose asynchronous `toJsonSchema()`; session managers, auth, and persistence are not involved because no MRTR state survives a request. Transport-level MRTR tests would only test transparent serialization and are optional, not a Phase 3 requirement.
- **Phase 3 review/quality**: delayed concurrent schema conversion, simultaneous `receive()` isolation, latest-only sequential answers, three-attempt coercing-schema replay, prototype-like input keys (`constructor`, `toString`, `__proto__`), unrelated malformed responses, invalid elicitation/sampling responses, elicitation decline/cancel, request-state decode/envelope/encode/size failures, adapter preparation failures, expected-signal logging, stateless roots, unsupported stateless input methods, unknown-method precedence, deterministic simultaneous duplicate keys, URL-only elicitation capabilities, invalid nested form schemas, and un-awaited input calls all have regression coverage. Pending schema promises are resolved only when tmcp is building `InputRequiredResult`, so they cannot replace an unrelated handler result/error. Public comments/JSDoc explain concrete client/handler behavior rather than internal jargon. Redundant always-successful schema assertions were removed; focused validation tests only cover tmcp-specific restrictions that can regress.
- **Current verification**: 176/176 package tests across four files; package TypeScript check, ESLint, Prettier, generated declarations, publint, full workspace typecheck, and `git diff --check` all pass.
- **Release/worktree status**: Phase 3 was committed in `f81f7ca`; final Fable review fixes after that commit are implemented and verified but not yet committed. Generated core declarations are current. `.changeset/warm-onions-repeat.md` covers the overall `2026-07-28` protocol feature and `.changeset/mrtr-input-required.md` covers Phase 3 MRTR behavior and follow-up fixes.
- `2024-10-07` was dropped when consolidating the two disagreeing version lists (`validation/version.js` won — it was never actually negotiable).
- Deferred deliberately: `_meta` key-syntax/reserved-prefix enforcement, extension-advertisement validation for extension `resultType` values, Phase 6 per-request logLevel gating (stateless requests currently fall back to the server default log level).

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

### 1.3 Error model — DONE (core side; HTTP status mapping moved to 5.1)

- ~~Add constants and structured error helpers~~ Done: `HEADER_MISMATCH` (`-32020`), `MISSING_REQUIRED_CLIENT_CAPABILITY` (`-32021`), `UNSUPPORTED_PROTOCOL_VERSION` (`-32022`) exported from the package root, with internal helper constructors carrying the required `data` shapes (`{ supported, requested }`, `{ requiredCapabilities }`).
- ~~Ensure the error abstraction preserves `code`/`data`~~ Done: `McpError` extends `json-rpc-2.0`'s `JSONRPCErrorException` (with a `Object.setPrototypeOf(this, new.target.prototype)` fix — the parent rewrites the prototype and breaks `instanceof`).
- ~~Transport-level HTTP status mapping~~ **Moved to 5.1**: core exports the constants; the actual `-32020/-32021/-32022` → 400 / `-32601` → 404 mapping ships with the rest of the modern HTTP runtime, since compliant clients need the header validation anyway. Until then these errors travel as JSON-RPC errors over HTTP 200.
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

## Phase 4: subscriptions

### 4.1 Core subscription model

- Add `subscriptions/listen` as a long-lived modern request.
- Use the listen request's JSON-RPC ID as `io.modelcontextprotocol/subscriptionId`; do not mint a separate ID.
- Validate the requested `notifications` filter and reduce it to the subset the server can honor.
- Send `notifications/subscriptions/acknowledged` as the first notification for that subscription ID.
- Tag every subsequent listen-stream notification with the subscription ID.
- On graceful server closure, return an empty complete result whose `_meta` contains that same subscription ID.
- Keep request-scoped progress/logging notifications on their originating request stream, never on a listen stream.

### 4.2 Dedicated registry

- Introduce a new `SubscriptionRegistry`/`SubscriptionStreamRegistry` abstraction keyed by request ID plus connection/origin as necessary.
- Store accepted typed filters independently for each concurrent subscription.
- Route list changes and resource updates only to matching subscriptions.
- Keep `StreamSessionManager` and `InfoSessionManager` unchanged and legacy-only. Do not repurpose their public contracts.
- Provide distributed registry/pub-sub adapters later if multi-node fan-out is required; the first implementation may be in-memory.

### 4.3 Cancellation

- HTTP: closing the response stream aborts the listen request, removes the subscription, and stops further writes.
- Stdio: `notifications/cancelled` referencing the listen request ID closes that subscription. It must not be treated as a generic server-to-client cancellation mechanism.
- Add cancellation handling to core; currently only the schema exists.

## Phase 5: transports

### 5.1 `@tmcp/transport-http`

Status note: stateless requests already flow through the current transport (POSTs reach `McpServer.receive` unconditionally and core replaces `sessionInfo` for per-request profiles), but none of the strict modern runtime below is implemented.

Parse a single body message first, validate its headers, classify its era, then choose the runtime.

#### Modern runtime

- **(Moved here from 1.3)** Map modern protocol errors to required HTTP statuses; core already exports the constants and produces the correct JSON-RPC error bodies:
    - HTTP 400 with `-32020` for missing, malformed, or mismatched required headers.
    - HTTP 400 with `-32021` for missing required client capabilities.
    - HTTP 400 with `-32022` for unsupported protocol versions.
    - HTTP 404 with `-32601` for unknown RPC methods.
- Accept one JSON-RPC request or notification per POST. Reject batches and client JSON-RPC responses.
- Require and validate `MCP-Protocol-Version` against body `_meta`.
- Require and validate `Mcp-Method` for all requests.
- Require and validate `Mcp-Name` for `tools/call`, `prompts/get`, and `resources/read`.
- Decode the Base64 sentinel format before comparing `Mcp-Name` and custom header values.
- Validate recognized `Mcp-Param-*` headers generated by `x-mcp-header` annotations against tool arguments, including omission/null rules, primitive types, safe integers, annotation paths, and case-insensitive header names.
- Return 202 with no body for accepted notifications.
- Return either JSON or request-scoped SSE for requests. Add `X-Accel-Buffering: no` for SSE and optional keepalive comments for long-lived streams.
- Treat response-stream closure as cancellation and stop writes/work.
- Ignore `Mcp-Session-Id` and `Last-Event-ID`; do not mint or echo a session ID.
- Return 405 for modern GET and DELETE.
- Validate a present `Origin` against an explicit allowed-origin policy and return 403 when invalid. Do not confuse CORS response headers with origin security validation.

#### Legacy runtime

- Preserve existing initialize/session, GET stream, DELETE, and session-manager behavior for negotiated legacy clients.
- Select legacy mode from `initialize` or established legacy transport state, not merely from the presence of a session header.

#### CORS

- Add modern `Mcp-*` headers to configurable allow/expose defaults where applicable.
- Keep CORS behavior separate from mandatory request-header and Origin validation.

### 5.2 `@tmcp/transport-stdio`

Status note: stateless request/response (including a pre-initialize `server/discover` probe) already works today, because responses are written from `receive`'s return value; only the items below remain.

- Wire `send`/`broadcast` output listeners immediately rather than waiting for `initialize`.
- Process incoming requests concurrently so a long-lived `subscriptions/listen` request cannot block later messages. Caution: switching from sequential to concurrent processing is a behavioral change for legacy stdio clients too — existing handlers may assume serialized execution. Make concurrency modern-request-only (legacy requests stay serialized) or opt-in, and document it either way.
- Serialize stdout writes even while request processing is concurrent.
- Add request-ID cancellation and modern subscription routing.
- Continue storing process-scoped identity only after a legacy `initialize`.

### 5.3 `@tmcp/transport-in-memory`

- Add modern `discover()`, per-request metadata, strict version errors, subscription helpers, and MRTR retry helpers.
- Keep legacy initialization/session helpers unchanged.
- Let tests select an explicit protocol era/version.

### 5.4 `@tmcp/transport-sse`

- Mark HTTP+SSE deprecated in docs and package metadata according to the project's release policy.
- Do not add modern support to this deprecated transport.

### 5.5 Session managers

- Keep all existing session-manager interfaces and adapters for legacy HTTP behavior.
- Add a new subscription registry interface rather than changing the meaning of session IDs or stream managers.
- Document server-minted handles passed as tool arguments as the modern pattern for application cross-call state. Consider a utility only after concrete repeated use appears.

## Phase 6: per-request logging and notification behavior

- For modern requests, emit `notifications/message` only when `io.modelcontextprotocol/logLevel` was explicitly included on that request.
- Use that request's level only; never fall back to a previous modern request or session default.
- For legacy requests, retain `logging/setLevel` and the existing session/default behavior.
- Ensure progress and logging notifications are delivered only to the originating request response sink.
- Keep legacy list/resource broadcasts unchanged while routing modern changes through the subscription registry.

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
- Subscription acknowledgment ordering, filtering, IDs, concurrent subscriptions, cancellation, and graceful closure.
- Stdio concurrency while a subscription is open.
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
5. Add the dedicated subscription registry, transport streaming, cancellation, and stdio concurrency.
6. Complete per-request logging/deprecation behavior and in-memory helpers.
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

## Open decisions

- Whether the first subscription registry is core-only/in-memory or ships with distributed adapters (per the standing constraints, any state must be pluggable from the transports like the existing session managers — serverless deployments cannot rely on process memory).
