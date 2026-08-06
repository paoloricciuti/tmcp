# tmcp

## 1.20.0-next.0

### Minor Changes

- a6b9606: feat: add the core per-request subscription model

    Implement `subscriptions/listen` for MCP `2026-07-28`, including capability-based filter acknowledgment, subscription-ID metadata, independent concurrent streams, change filtering, cancellation, and graceful completion. Subscription managers are transport-owned, with an in-memory default and a distributed pub/sub-compatible create/send/close contract in `@tmcp/session-manager`. HTTP assigns every listen stream an opaque internal origin instead of trusting `Mcp-Session-Id`; stdio and in-memory transports own equivalent local routing. Existing session-negotiated resource subscriptions and broadcasts remain unchanged.
    HTTP transports accept all origins by default with a warning on the first implicit cross-origin request. Configure an explicit allowlist to restrict access, or `true` to intentionally allow every origin without a warning. This request policy remains independent from CORS response configuration. The legacy SSE transport remains deprecated and receives only lifecycle compatibility changes.

- f81f7ca: feat: MRTR for the per-request (stateless) `2026-07-28` protocol

    `server.elicitation()` and `server.message()` now work on per-request (stateless) requests. Since there is no server→client JSON-RPC channel, an input call without a matching response ends the request with a successful `InputRequiredResult` (`resultType: 'input_required'`, keyed `inputRequests`, optional opaque `requestState`); the client fulfills the requests and retries the original request with `inputResponses` (and the echoed `requestState`) in the params. Only `tools/call`, `prompts/get` and `resources/read` participate. Session-negotiated requests are unaffected by MRTR and keep the awaitable path.
    - **Replay acknowledgment gate**: on a stateless retry the handler re-executes FROM THE TOP, so side effects before an input call run once per attempt. A stateless request that reaches `elicitation()`/`message()` fails with a structured error unless the tool/prompt/resource/template definition sets the new `replayable: true` flag, which asserts that code before the handler's input points is idempotent or deferred. This gate is a tmcp safety measure, not a spec requirement.
    - **Keys**: input requests/responses are keyed maps. Default keys are per-execution ordinals (`"1"`, `"2"`, … reset each attempt) so straight-line handlers work unchanged; handlers with conditional control flow can pass a stable key via the new additive options argument: `elicitation(message, schema, { key })` / `message(request, { key })`. Responses are validated per key; unrelated extra entries are ignored per spec.
    - **`requestState`**: tmcp carries validated answers forward so clients only need to answer the latest `inputRequests`; handlers can also persist their own data with `server.setRequestState(state)` and read it back via `server.ctx.requestState`. Both are serialized through the new pluggable `requestStateCodec` server option. ⚠️ The default codec is plain `JSON.stringify`/`JSON.parse` with NO integrity protection — round-tripped state is attacker-controlled; plug a signed/encrypted codec if you need to trust it. Encoded state is size-bounded in both directions.
    - **`isInputRequired(error)`**: new exported helper. The stateless input flow works by throwing an internal signal that must reach the dispatch boundary; broad `catch` blocks in handlers must rethrow it (a swallowed signal is detected and fails the request with a descriptive error).
    - `inputResponses`/`requestState` params on non-MRTR methods are rejected with `-32602`; input-required results never carry cache fields (`ttlMs`/`cacheScope`).
    - Roots are never emitted as input requests (deprecated in `2026-07-28`); the low-level `request()` stays blocked on stateless requests.
    - Elicitation decline and cancel responses now bypass content-schema validation because those valid responses carry no content.
    - Stateless input calls outside `tools/call`, `prompts/get`, and `resources/read` now fail immediately instead of falling through to an unavailable server-to-client channel. Stateless roots requests are rejected for the same reason, and MRTR-only retry fields are rejected on session-negotiated requests.
    - Carried elicitation answers retain their original wire values, so schemas that coerce or transform input are applied exactly once per handler attempt. Form elicitation also requires the client’s `elicitation.form` capability (an empty elicitation capability remains backward-compatible form support), and outgoing form schemas are checked against MCP’s flat primitive-field restrictions.
    - URL elicitation also participates in stateless retries through `elicitation(message, url, { key? })`; its keyed `inputRequest` uses `{ mode: 'url', message, url }` and accepts an action-only response without applying form validation. Client-supplied form content is removed from URL responses before handlers or retry state can observe it.
    - Failed input-request preparation no longer leaves a stale pending request or reserved key, so handlers can catch an invalid URL/schema error and either return a fallback or retry the key safely.
    - Invalid elicitation and sampling answers are removed before their validation errors reach the handler, allowing recovery code to ask again with the same key instead of re-consuming the bad answer or triggering a duplicate-key error.

- 79e445e: feat: implement strict MCP 2026-07-28 HTTP requests

    Classify sessionless requests before accessing session state, require and validate the protocol, method, name, and annotated tool parameter headers, and return protocol errors with their required HTTP status before opening SSE. Successful requests remain request-scoped SSE streams, now with proxy buffering disabled and cooperative cancellation exposed through `server.ctx.signal`. Initialization-based session behavior remains available on the same transport.

    Add `McpServer.hasMethod()`, `McpServer.validateToolCall()`, the `tmcp/method-policy` entry point, and `getPerRequestProtocolVersions()` so transports can reuse core registration, method policy, schema, and version behavior without executing handlers. The in-memory transport now uses the same exported per-request version list.

- a449bc9: feat: support `2026-07-28` protocol version

    Add support for the per-request (stateless) MCP protocol version `2026-07-28` (Phases 0–2), plus a few deliberate fixes:
    - Per-request protocol handling is enabled by default for version `2026-07-28` (pinned to upstream spec tag `2026-07-28`, commit `5f5440bb26a62e2cf3440b92da5a667efa03b267`) and advertised via the new `server/discover` method. Requests carrying `_meta` protocol metadata with any other version receive `-32022 UNSUPPORTED_PROTOCOL_VERSION`. Legacy `initialize` negotiation is unchanged and `LATEST_PROTOCOL_VERSION` stays `2025-06-18`.
    - New `cache` server option (`{ ttlMs?, cacheScope?, methods? }`, defaults `{ ttlMs: 0, cacheScope: 'private' }`) controlling the `ttlMs`/`cacheScope` fields required on cacheable per-request results.
    - Per-request results are decorated at the wire boundary (`resultType`, `_meta['io.modelcontextprotocol/serverInfo']`, cache fields); handler return types are unchanged.
    - New exported error constants `HEADER_MISMATCH` (-32020), `MISSING_REQUIRED_CLIENT_CAPABILITY` (-32021) and `UNSUPPORTED_PROTOCOL_VERSION` (-32022), and `McpError` is now exported from the package root.
    - **Bug fix**: `McpError` now carries its real `code` (and optional `data`) onto JSON-RPC error responses. Previously every thrown `McpError` collapsed to `-32603` on the wire.
    - **Bug fix (legacy-visible, deliberate)**: unknown prompt (`prompts/get`) and unknown resource (`resources/read`) names now return `-32602` (Invalid params) instead of the incorrect `-32601` (Method not found), for both session-negotiated and per-request profiles.
    - **Bug fix**: the advertised supported protocol version list no longer includes `2024-10-07` — it appeared in one of two disagreeing internal lists and was never actually negotiable. `validation/version.js` is now the single source of truth.
    - Client/server capability schemas now accept `extensions` maps and the modern elicitation `{ form?, url? }` sub-shapes (legacy bare `{}` still means form support). URL elicitation is available through `server.elicitation(message, url, options?)` and sends the published `{ mode: 'url', message, url }` request shape; form and URL capabilities are checked independently, malformed transport-provided capability values fail cleanly, and form validation supports the complete published primitive/single-select/multi-select schema subset. Extra JSON Schema keywords emitted by adapters are removed from outgoing elicitation requests instead of rejecting the request or sending unsupported fields. Tool `inputSchema`/`outputSchema` wire schemas accept any JSON Schema 2020-12 keywords, and `structuredContent` may be any JSON value — both at runtime and at the type level (the `CallToolResult` generic no longer constrains `structuredContent` to objects; a widening, so existing tools are unaffected).
    - Stateless logging is advertised through `server/discover` and follows the request's explicit `io.modelcontextprotocol/logLevel`. Requests that omit it receive no log notifications and never inherit a server default, transport session level, or earlier request level; session-negotiated logging behavior is unchanged.
    - Result wire schemas were loosened (`v.object` → `v.looseObject`), so unknown top-level fields returned by handlers are now passed through to the client instead of being silently stripped. This is intentional: it is needed to preserve `resultType` extension values and forward-compatible result fields.

## 1.19.4

### Patch Changes

- 77be8a1: chore: add license

## 1.19.3

### Patch Changes

- 2cf40fc: fix: use `looseObject` for client capabilities

## 1.19.2

### Patch Changes

- 5d3b51d: fix: refactor to allow for getters to be passed in as options

## 1.19.1

### Patch Changes

- 8dd3152: fix: allow `mimeType` for `resource` and `template`

## 1.19.0

### Minor Changes

- 918e40c: feat: add `server.tools` api to allow you to create reusable tools
  feat: add `server.prompts` api to allow you to create reusable prompts
  feat: add `server.resources` api to allow you to create reusable resources
  feat: add `server.templates` api to allow you to create reusable templates

## 1.18.1

### Patch Changes

- 743b531: fix: deprecate various and implement fine grained prompt methods

## 1.18.0

### Minor Changes

- 1d72e60: feat: utils entrypoint

## 1.17.0

### Minor Changes

- 61d7c9e: feat: expose low level `request` api

## 1.16.4

### Patch Changes

- bc56fbc: fix: allow tools pagination

## 1.16.3

### Patch Changes

- 5613d43: fix: handle `resources/unsubscribe`

## 1.16.2

### Patch Changes

- 0152bae: chore: export more types

## 1.16.1

### Patch Changes

- 4465e9d: fix: allow explicitly passing undefined adapter for simple servers
- ce38e88: fix: receive argument type

## 1.16.0

### Minor Changes

- 8a04ee2: breaking: move sessions out of core into the transports and allow for persistent mcp state

    This release moves the session management out of the core package into the SSE and HTTP transport separately.
    While technically a breaking change if you update both `tmcp` and your transport (`@tmcp/transport-http`,
    `@tmcp/transport-sse`, or `@tmcp/transport-stdio`), you will not face a breaking change unless you were using a
    session manager.

    If you were testing your `McpServer` instance manually you might need to update them to pass the `sessionInfo`
    in the context parameter (only if you were reading them in the tool/resource/prompt).

    Sorry for the "breaking" but this was a necessary step to unlock persistent state. 🧡

### Patch Changes

- a9254cb: fix: allow for `_meta` field on tools

## 1.15.5

### Patch Changes

- 0aeddf8: fix: only send logs to current session

## 1.15.4

### Patch Changes

- 98de0e6: fix: return `isError` result from `tools/call` instead of `MCPError`

## 1.15.3

### Patch Changes

- 5b62c34: fix: use `looseObject` for all `_meta` fields

## 1.15.2

### Patch Changes

- dfa29f2: fix: export more types

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
