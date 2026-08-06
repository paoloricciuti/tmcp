# Plan: harden Client ID Metadata Document retrieval in `@tmcp/auth`

## Status

Future, optional hardening work. This is deliberately separate from the MCP `2026-07-28` migration so the protocol release contains only mandatory conformance changes.

## Background

`@tmcp/auth` already supports OAuth Client ID Metadata Documents by treating an unknown URL-form `client_id` as a metadata document URL. The current implementation provides the mandatory behavior needed for the mechanism:

- Advertises `client_id_metadata_document_supported: true`.
- Requires an HTTPS client ID URL with a path and no userinfo, fragment, or dot segments.
- Requires `client_id`, `client_name`, and at least one `redirect_uri`.
- Requires the document's `client_id` to exactly equal the requested URL.
- Validates an authorization request's redirect URI against the document.
- Rejects shared-secret client metadata and supports unauthenticated public clients.
- Fetches a fresh document for each authorization, token, or revocation request.

The MCP profile recommends additional operational protections, but they are not mandatory protocol behavior. This plan adds those protections without coupling them to the main protocol migration.

## Goals

- Bound attacker-controlled outbound metadata requests by time and response size.
- Give deployments a portable way to enforce DNS and network egress policy.
- Allow CIMD support to be disabled when an authorization proxy cannot guarantee upstream support.
- Keep capability advertisement synchronized with actual runtime behavior.
- Preserve browser, serverless, Node.js, and other Web API runtimes.
- Keep the public API as small as possible.
- Avoid process-local security or identity state.

## Non-goals

- Do not implement RFC 9207 authorization-response `iss`; that needs a separate callback-model design.
- Do not change Dynamic Client Registration behavior or enforce the client-side `application_type` requirement on servers.
- Do not add client-registration provenance to authorization handler inputs.
- Do not add a built-in metadata cache by default.
- Do not implement DNS resolution with Node.js-only APIs in core.
- Do not add a general-purpose HTTP client abstraction for the package.
- Do not fetch `logo_uri`, `jwks_uri`, or other URLs referenced by metadata documents.

## Standards and threat model

Before implementation, re-check the then-current versions of:

- The MCP authorization specification.
- OAuth Client ID Metadata Documents.
- OAuth 2.0 Security Best Current Practice.
- Fetch and HTTP caching behavior in supported runtimes.

Threats to cover:

- Server-Side Request Forgery through literal or DNS-resolved private addresses.
- DNS rebinding between validation and connection establishment.
- Redirects from an allowed URL to a disallowed network destination.
- Slow headers or bodies that retain authorization-server resources indefinitely.
- Unbounded response bodies and decompression expansion.
- Invalid JSON, misleading content types, and malformed metadata.
- Concurrent request amplification against one metadata host.
- Stale metadata after redirect URI or key changes.
- Capability advertisement that claims support when a proxy cannot honor URL client IDs.

## API design

### Principle

Do not restore the previous collection of independent fluent options. Add only the controls that cannot be implemented safely inside the package.

### Proposed minimum surface

Use the existing `.features()` method rather than adding `.clientMetadataDocuments()`:

```js
OAuth.issuer('https://auth.example.com').features({
	clientMetadataDocuments: {
		fetch: policy_fetch,
	},
});
```

Allow the mechanism to be disabled:

```js
OAuth.issuer('https://auth.example.com').features({
	clientMetadataDocuments: false,
});
```

Proposed type:

```js
/**
 * @typedef {Object} ClientMetadataDocumentOptions
 * @property {typeof fetch} [fetch]
 */
```

```js
/** @type {boolean | ClientMetadataDocumentOptions | undefined} */
clientMetadataDocuments;
```

The package should use fixed internal defaults for timeout and maximum response size. Do not expose those as public options unless a concrete deployment demonstrates that the defaults are unsuitable.

### Default behavior

- CIMD remains enabled for ordinary `OAuth` instances.
- The global `fetch` implementation is used when no override is supplied.
- `client_id_metadata_document_supported` is `true` only when CIMD is enabled.
- A pass-through `ProxyOAuthServerProvider.build()` disables CIMD by default because it cannot know whether the upstream accepts URL client IDs.
- Proxy builds may explicitly enable CIMD when the upstream is known to support it.

### Fetch contract

An injected fetch must honor `AbortSignal` and should enforce deployment-specific DNS and egress policy. Document that this is the portable boundary for:

- Resolving hostnames and rejecting private, loopback, link-local, multicast, and otherwise disallowed destinations.
- Protecting against DNS rebinding at connection time.
- Applying domain allowlists or reputation policy.
- Controlling outbound proxies and network routes.

Do not add a separate `validateUrl` callback. A pre-fetch URL callback cannot reliably prevent DNS rebinding and duplicates policy that belongs at the connection boundary.

## Implementation phases

### Phase 1: isolate retrieval

Move CIMD-specific retrieval into one internal module, for example:

```text
packages/auth/src/client-metadata-document.js
```

The module should own:

- Client ID URL validation.
- Fetch execution.
- Response status and media-type validation.
- Response-size enforcement.
- JSON parsing.
- Metadata schema validation.
- Exact `client_id` comparison.

Keep local client-store lookup and authorization redirect matching in `OAuth`.

Do not export the internal module or its schema from the package root unless an external consumer requirement appears.

### Phase 2: bounded fetch

Add fixed internal limits initially:

- Total fetch deadline: 5 seconds.
- Maximum decoded metadata body: 5 KiB, matching the OAuth draft recommendation.
- Redirect policy: reject redirects.

The deadline must cover both response headers and full body consumption. Clearing the timer after headers arrive is insufficient.

Read the body as a stream and stop once the byte limit is exceeded. Check `Content-Length` early when present, but do not trust it as the only limit.

Accept JSON media types supported by the specification:

- `application/json`
- `application/*+json`

Decide explicitly whether a missing content type is rejected or accepted for compatibility, and cover that decision with tests.

### Phase 3: SSRF posture

Keep mandatory syntactic URL checks in core.

Add cheap literal-host protections only if they remain small and thoroughly tested:

- IPv4 private, loopback, link-local, carrier-grade NAT, multicast, and reserved ranges.
- IPv6 loopback, unspecified, unique-local, link-local, multicast, and IPv4-mapped forms.
- `localhost` and trailing-dot variants.

Treat these checks as defense in depth, not complete SSRF prevention. The injected fetch or deployment network policy remains responsible for DNS-resolved destinations and rebinding.

Avoid Node.js DNS APIs in package source because tmcp must run in serverless and non-Node Web API runtimes.

### Phase 4: capability and proxy behavior

Tie metadata advertisement directly to the feature setting:

```js
client_id_metadata_document_supported: features.clientMetadataDocuments !==
	false;
```

When disabled:

- Do not fetch URL-form client IDs.
- Return the existing `invalid_client` response for unknown clients.
- Continue allowing pre-registered clients whose identifiers happen to be URLs.

For `ProxyOAuthServerProvider.build()`:

- Default CIMD to disabled.
- Permit explicit enabling through the build options only when the upstream supports URL client IDs.
- Document that metadata validation performed by the proxy does not make an incompatible upstream accept the URL client ID.

### Phase 5: caching decision

Do not add a built-in cache in the first hardening implementation.

Reasons:

- Caching is not mandatory.
- Process-local caches behave inconsistently across long-running, serverless, and multi-replica deployments.
- Metadata changes can alter redirect URIs and authentication keys.
- A policy-aware injected fetch can provide standards-compliant HTTP caching without adding another public abstraction.

Document that deployments may supply a caching fetch implementation. If repeated production use later justifies a package abstraction, design a pluggable cache in a separate change with explicit invalidation and HTTP freshness semantics.

### Phase 6: documentation

Document:

- Why CIMD causes outbound requests to attacker-selected hosts.
- Which protections are built in and which require deployment network policy.
- That remote `client_name`, `logo_uri`, and other display fields are untrusted.
- That consent interfaces must display client ID and redirect URI hostnames.
- Why redirects are rejected.
- Why caching is delegated.
- Why pass-through proxies disable CIMD by default.
- How to inject a policy-aware or caching fetch.

Avoid claiming complete SSRF prevention.

## Test matrix

### URL validation

- Reject non-HTTPS URLs.
- Reject missing path components.
- Reject fragments.
- Reject username and password components.
- Reject literal and percent-encoded single-dot and double-dot path segments.
- Define and test query-string handling.
- Test ports and URL canonicalization without replacing exact string comparison.

### Network policy

- Reject every supported literal private and loopback IPv4 form.
- Reject private, loopback, link-local, multicast, and mapped IPv6 forms.
- Reject `localhost` and trailing-dot variants.
- Prove the custom fetch receives the original client ID and an abort signal.
- Prove fetch redirects are rejected.
- Prove a policy-fetch rejection becomes `invalid_client` without leaking internal details.

### Response handling

- Accept valid `application/json` documents.
- Accept valid `application/*+json` documents.
- Cover the chosen missing-content-type behavior.
- Reject non-success HTTP responses.
- Reject malformed JSON.
- Reject oversized `Content-Length` before reading.
- Reject a streamed body that crosses the byte limit.
- Abort a body that never completes after the total deadline.
- Ensure timers and readers are cleaned up after success and failure.

### Metadata validation

- Require `client_id`, `client_name`, and non-empty `redirect_uris`.
- Require exact `client_id` string equality.
- Reject `client_secret` and `client_secret_expires_at`.
- Reject shared-secret token endpoint authentication methods.
- Preserve supported unknown metadata fields without trusting them.
- Continue exact redirect URI matching.

### Runtime behavior

- Resolve CIMD clients at authorization, token, and revocation endpoints.
- Never fetch when the local client store contains the client ID.
- Fetch on every request when no caching fetch is supplied.
- Advertise support only when enabled.
- Reject unknown URL clients without fetching when disabled.
- Preserve pre-registered URL-form client IDs when disabled.
- Default proxy builds to disabled and cover explicit opt-in.
- Keep concurrent OAuth instances isolated.

## Verification

Run:

```bash
pnpm --filter @tmcp/auth test
pnpm exec eslint packages/auth/src packages/auth/test
pnpm typecheck
pnpm --filter @tmcp/auth generate:types
pnpm exec prettier --check "packages/auth/**/*.{js,md,json}"
pnpm test
git diff --check
```

Review generated declarations and publint output after any public option changes.

## Release requirements

- Add a focused `@tmcp/auth` changeset.
- Describe the SSRF boundary and fixed limits without claiming complete prevention.
- Call out proxy default behavior if it changes.
- Do not bundle RFC 9207 callback work, DCR changes, or unrelated OAuth cleanup.
- Keep the feature additive except for intentionally rejecting unsafe CIMD requests.

## Acceptance criteria

- The public surface adds no more than one CIMD feature option and one optional fetch override.
- Timeout and size limits are fixed internal policy, not public configuration.
- The deadline covers headers and body consumption.
- Response bodies are bounded while streaming.
- Capability advertisement exactly matches whether runtime retrieval is enabled.
- Pass-through proxies do not claim unsupported CIMD behavior by default.
- No process-local metadata cache is added.
- DNS/egress responsibility is explicit and testable through injected fetch.
- Existing pre-registered and DCR clients remain compatible.
- Auth package tests, workspace tests, lint, type generation, formatting, and publint pass.
