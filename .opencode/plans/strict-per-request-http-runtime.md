# Strict per-request HTTP runtime

Status: implemented on 2026-08-04. Final verification results are recorded in the migration plan.

## Goal

Finish the MCP `2026-07-28` HTTP behavior while keeping older initialization-based clients working.

Spec: [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

## What already works

Do not rewrite these parts:

- POST, GET, DELETE, and OPTIONS routing on one endpoint.
- JSON parsing, content-type checks, malformed request errors, and batch rejection.
- HTTP 202 with no body for accepted notifications and legacy client responses.
- SSE delivery for logs, progress, and subscriptions.
- `subscriptions/listen`, including cancellation and graceful closure.
- `Origin` checks, CORS configuration, OAuth, and custom context.
- Legacy initialization, sessions, GET streams, DELETE, and client responses.

Distributed subscription managers, auth hardening, the deprecated HTTP+SSE transport, and periodic SSE keepalives are outside this work.

## Changes

### 1. Decide whether each request is legacy or per-request

The transport currently reads or creates `Mcp-Session-Id` before it knows which protocol the body uses. That is wrong for `2026-07-28`, where requests have no protocol session.

For every POST:

1. Parse the JSON body once.
2. Check whether it is a request, notification, response, batch, or malformed object.
3. Inspect the reserved `_meta.io.modelcontextprotocol/*` fields and `MCP-Protocol-Version` header.
4. Choose either legacy session behavior or `2026-07-28` per-request behavior.

Per-request traffic must never read, create, or return a session ID. If it includes a stale `Mcp-Session-Id`, ignore it. Legacy traffic keeps the existing session behavior.

GET and DELETE with the `2026-07-28` protocol header return 405. Legacy GET and DELETE continue to work.

Use the core package's existing supported-version list in both HTTP and in-memory transports. Do not add another hard-coded date.

### 2. Check the required HTTP headers

Only per-request traffic gets these checks.

- `MCP-Protocol-Version` must match `_meta.io.modelcontextprotocol/protocolVersion`.
- `Mcp-Method` must match the JSON-RPC method.
- `Mcp-Name` is required for `tools/call`, `prompts/get`, and `resources/read`. It must match `params.name` or `params.uri`.
- Header names are case-insensitive. Header values are case-sensitive.
- `Mcp-Name` may use the spec's `=?base64?...?=` encoding. Decode it before comparison.

Missing, malformed, or mismatched headers return HTTP 400 with JSON-RPC error `-32020` (`HeaderMismatch`). Keep the request ID in the error when the body contains a valid ID.

Put the Base64 and comparison code in `packages/transport-http/src/request-headers.js`. It is pure validation code and should have table-driven unit tests.

Do not reject requests based on `Accept`. The spec requires clients to send both supported content types but does not define a server error for an invalid `Accept` header.

### 3. Keep modern and legacy message rules separate

The same transport must support both protocol generations:

- A per-request client may send requests and notifications, but not JSON-RPC responses. A response body on this path returns HTTP 400 with JSON-RPC `-32600`.
- Legacy clients may still POST responses to server-to-client requests.
- Per-request responses never include `mcp-session-id`.
- Per-request traffic ignores `Last-Event-ID` because streams are not resumable.
- Accepted notifications still return HTTP 202 with no body.

Add tests where a legacy session and a per-request client use the same transport concurrently. A modern request carrying the legacy client's session ID must not read or change that session.

### 4. Keep successful requests on SSE

The spec allows every request to use SSE, even when the stream contains only the final response. Clients are required to support it, and the transport already works this way. Keep that behavior rather than adding a separate JSON response path.

Errors that require a non-200 HTTP status must be found before opening the SSE response. Perform these checks first:

- Validate the required headers in the HTTP transport.
- Compare the requested version with the core package's supported per-request versions.
- Check `server.hasMethod()` for raw registry membership and apply the shared `isPerRequestMethodAllowed()` policy before dispatch. `McpServer.receive()` uses the same policy internally.

Return these errors directly before creating the SSE response:

- `-32020` (`HeaderMismatch`) to HTTP 400.
- `-32022` (`UnsupportedProtocolVersion`) to HTTP 400.
- `-32601` (`Method not found`) to HTTP 404.

Then open the SSE response immediately and run `McpServer.receive()` exactly as today. Logs, progress, subscription notifications, and the final response keep their current ordering.

Errors produced during handler execution, including `-32021` (`MissingRequiredClientCapability`), stay inside the HTTP 200 SSE stream because the response has already started. Changing that would require delaying all streaming output until the handler finishes, which is not worth the added machinery. Revisit this only if conformance tests require a different result.

### 5. Check `Mcp-Param-*` headers

The HTTP transport needs the registered tool's JSON Schema to find `x-mcp-header` annotations. Expose this generic server method:

```ts
server.validateToolCall(
	name: string,
	args: Record<string, unknown>,
	validator: (
		inputSchema: Record<string, unknown>,
		args: Record<string, unknown>,
	) => void | Promise<void>,
): Promise<boolean>;
```

`validateToolCall()` does the following:

- Finds the registered tool and converts its input schema with the configured adapter.
- Uses the same empty object schema as `tools/list` when the tool has no input schema.
- Calls and awaits the supplied validator.
- Returns `true` after validation.
- Returns `false` without calling the validator when the tool does not exist.
- Propagates adapter and validator errors.

It does not check `enabled`, run Standard Schema validation, or execute the tool. Those still happen once during the real `tools/call` request.

Before dispatching a per-request `tools/call`, the HTTP transport calls this method with a validator that checks the request headers. If the method returns `false`, dispatch normally so core returns its existing unknown-tool error.

The header validator must support:

- String, boolean, and safe-integer properties.
- Nested properties reached only through JSON Schema `properties` entries.
- Case-insensitively unique `x-mcp-header` names using valid HTTP token characters.
- Exact string comparison after optional Base64 decoding.
- Lowercase `true` and `false`.
- Numeric integer comparison within JavaScript's safe range.
- Header omission when the body value is missing or null.

Reject invalid annotations that are empty, duplicated, attached to unsupported types, or placed behind arrays, `$ref`, composition keywords, or conditionals. Ignore request headers that do not match any valid annotation.

A recognized header mismatch throws `McpError` with code `-32020`. The tool handler must not run.

### 6. Let handlers observe cancellation

Add `signal?: AbortSignal` to `server.ctx`.

For each HTTP request:

- Create an `AbortController`.
- Abort it if the incoming `Request.signal` aborts.
- Abort it if the client closes an open SSE response.
- Stop sending notifications and the final response after cancellation.
- Keep the existing subscription-manager cleanup for `subscriptions/listen`.

Cancellation is cooperative. tmcp tells handlers that the request was cancelled through `server.ctx.signal`; it does not forcibly stop their promises.

Add `X-Accel-Buffering: no` to every SSE response. Periodic keepalive comments remain optional and are not part of this work.

## Implementation order

### Step 1: request classification

Change:

- `packages/transport-http/src/index.js`
- `packages/tmcp/src/validation/version.js`
- `packages/tmcp/src/index.js`
- `packages/transport-in-memory/src/index.js`

Tests must prove:

- Legacy initialize, session POST, GET, DELETE, and response messages still work.
- Per-request calls do not create or return session IDs.
- Incomplete per-request metadata does not fall back to legacy behavior.
- Modern GET and DELETE return 405.

### Step 2: standard headers

Add:

- `packages/transport-http/src/request-headers.js`
- `packages/transport-http/test/request-headers.test.js`
- `packages/transport-http/test/stateless-runtime.test.js`

Tests must cover missing and mismatched headers, header-name casing, Base64 names, Unicode, whitespace, control characters, malformed Base64, and values that look like the Base64 sentinel.

### Step 3: HTTP statuses and SSE responses

Add the side-effect-free `server.hasMethod()` registry check, apply the shared per-request method policy before opening SSE, and otherwise keep the current streaming code.

Tests must prove:

- A simple `server/discover` result is returned on SSE as it is today.
- Unsupported versions return HTTP 400.
- Unknown methods return HTTP 404.
- Logs and progress are sent before the final response on SSE.
- Subscription acknowledgment opens SSE promptly.
- Existing logging and subscription ordering does not change.

### Step 4: tool parameter headers

Add `McpServer.validateToolCall()` and its generated types. Use it from the HTTP transport before dispatching modern tool calls.

Tests must cover strings, booleans, positive and negative integers, safe-integer limits, null, missing values, nested properties, duplicate aliases, invalid annotation paths, unknown headers, and handler non-execution after mismatch.

Core tests must also prove that `validateToolCall()`:

- Converts the registered schema.
- Awaits asynchronous validators.
- Propagates errors.
- Returns `false` for unknown tools without calling the validator.
- Does not call enabled checks or execute the handler.

### Step 5: cancellation and SSE headers

Add `Context.signal`, connect it to HTTP cancellation, and add `X-Accel-Buffering: no`.

Tests must cover cancellation before dispatch, during a handler, after SSE starts, and during subscription registration. No messages may be written after cancellation, and subscription cleanup must happen once.

### Step 6: docs and release files

Update:

- `packages/transport-http/README.md`
- `packages/tmcp/README.md`
- Generated declarations and declaration maps.
- Changesets for the HTTP behavior and new server/context APIs.
- `.opencode/plans/mcp-draft-spec-migration.md` after verification.

Document required headers, SSE responses, coexistence with legacy clients, `validateToolCall()`, `server.ctx.signal`, `allowedOrigins`, and CORS.

## Final checks

```bash
pnpm --filter @tmcp/transport-http test
pnpm --filter tmcp test
pnpm typecheck
pnpm --filter @tmcp/transport-http generate:types
pnpm --filter tmcp generate:types
pnpm test
git diff --check
```

Also run ESLint and Prettier on every changed source, test, README, changeset, and plan file. Update recorded test counts from the final command output.
