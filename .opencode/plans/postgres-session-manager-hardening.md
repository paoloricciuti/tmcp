# PostgreSQL Session Manager Hardening

## Goal

Harden `@tmcp/session-manager-postgres` in a dedicated change without modifying the `StreamSessionManager`, `InfoSessionManager`, or new per-request `SubscriptionManager` contracts.

This work applies only to the existing legacy PostgreSQL stream and info managers. A distributed PostgreSQL implementation of `SubscriptionManager` remains separate future work.

## Baseline

The released package currently:

- Stores stream liveness in `tmcp_sessions(id, updated_at)`.
- Routes stream payloads over `session:<id>` and `delete:session:<id>` LISTEN/NOTIFY channels.
- Stores client metadata in one table per metadata kind.
- Stores resource subscriptions in a table whose historical primary key is `id`.
- Exposes `create`, `delete`, `has`, and `send` through the unchanged `StreamSessionManager` interface.
- Exposes metadata and resource-subscription methods through the unchanged `InfoSessionManager` interface.

## Non-Goals

- Do not add or modify `SubscriptionManager`.
- Do not change shared session-manager return types.
- Do not require changes in HTTP, SSE, stdio, or in-memory transports.
- Do not mix origin validation, transport shutdown, or Durable Objects hardening into this change.
- Do not add compatibility for formats that were never released.

## Workstreams

### 1. Identifier Safety

- Add one `quote_identifier()` helper for configurable table names and LISTEN/UNLISTEN channels.
- Quote identifiers consistently; keep values parameterized.
- Derive fixed-length modern channel names from a SHA-256 hash of the complete session ID so PostgreSQL's 63-byte identifier limit cannot create collisions.
- Keep legacy channel handling explicitly scoped to rolling upgrades from released versions.

### 2. Stream Ownership

- Add nullable `protocol SMALLINT` and `owner TEXT` columns to the stream table.
- Create the complete schema directly for fresh installations.
- For existing released tables, provide an idempotent migration guarded by a PostgreSQL advisory transaction lock.
- If runtime schema migration is not desired, replace it with a documented SQL migration and fail clearly when required columns are absent.
- Generate a unique owner token for every claimed stream.
- Scope heartbeat updates and cleanup deletes to `(id, owner)` so delayed work cannot affect a replacement stream.

### 3. Atomic Lifecycle

- Serialize local create/delete work per session ID.
- Use a PostgreSQL advisory lock while claiming a session ID across replicas.
- Remove only expired rows before claiming.
- Establish LISTEN routes before publishing a visible ownership row.
- On partial LISTEN or claim failure, remove only routes installed by that attempt and leave replacement owners untouched.
- Keep session-manager method signatures unchanged; duplicate claims reject rather than introducing boolean return values.

### 4. Rolling-Upgrade Routing

- Persist the routing protocol with each stream row.
- Route current owners through collision-resistant channels.
- Route rows created by released workers through their legacy channels and raw payload format.
- Current owners may listen on legacy channels during a rolling upgrade, but ambiguous truncated legacy channels must be dropped rather than fan payloads across sessions.
- Remove compatibility code once the documented support window ends.

### 5. Ordered and Bounded Delivery

- Parameterize all `pg_notify` calls.
- Serialize complete sends per channel so chunked and ordinary payloads retain FIFO order.
- Keep ordinary legacy payloads raw.
- Frame current-protocol control payloads with a PostgreSQL-safe sentinel.
- Chunk payloads that exceed PostgreSQL's notification size limit, cap total chunks/message size, reassemble by channel and message ID, and expire incomplete assemblies.
- Treat malformed framed payloads as raw legacy data rather than silently dropping application payloads.

### 6. Stale Session Cleanup

- Refresh current rows on an interval shorter than the stale threshold.
- Include the owner token in heartbeat updates.
- If an owner-scoped heartbeat updates no row, close only that local controller and remove its routes.
- Delete stale rows when checking sessions and before broadcasts.
- Clear intervals, route maps, generation state, and chunk timers when no longer needed.

### 7. Info Manager Correctness

- Await connection readiness before every query.
- Quote every configurable table name.
- Preserve `@type {InfoSessionManager['method']}` annotations rather than duplicating parameter and return types.
- Store resource subscriptions with a composite primary key `(id, value)` so one session can subscribe to multiple resources.
- Make additions idempotent with `ON CONFLICT (id, value) DO NOTHING`.
- Return every session ID for a URI, including an empty result.
- Delete subscription rows by session ID when deleting session metadata.
- If migrating the released single-column primary key at runtime, guard it with advisory locks, validate the existing constraint shape, deduplicate rows, and perform the change transactionally.
- Ensure `create: false` performs no DDL or migration work.

## Tests

Add a package-local Vitest suite with a controlled `pg` client mock and, where practical, PostgreSQL integration coverage.

Required regressions:

- `create: false` issues no DDL.
- Configurable identifiers are quoted safely.
- Duplicate claims reject without changing shared interface types.
- Concurrent create/delete work for one ID is serialized.
- Partial LISTEN failure removes installed routes.
- Delayed owner-token deletion cannot close a replacement owner.
- A stale local cancel cannot delete a replacement row.
- Owner-scoped heartbeat loss closes only the stale local stream.
- Long IDs use collision-resistant modern channels.
- Colliding legacy channels never leak payloads across sessions.
- Legacy and current routing remain distinguishable during rolling upgrades.
- Application payloads resembling frame metadata round-trip unchanged.
- Concurrent and chunked sends preserve FIFO order.
- Oversized payloads fail with a bounded, documented error.
- Multiple resource subscriptions per session are returned and removed correctly.
- Session deletion removes subscriptions by session ID.

## Documentation

- Document fresh-install schemas and any external migration SQL.
- Explain the ownership token, protocol column, stale threshold, and heartbeat interval.
- Explain PostgreSQL's channel and payload limits.
- Document the rolling-upgrade compatibility window and its long-ID limitation.
- State that this package does not yet implement the new per-request `SubscriptionManager`.

## Release

- Publish as a focused patch or minor release based on migration policy.
- Add a dedicated changeset for `@tmcp/session-manager-postgres` only.
- Keep generated declarations tied to the unchanged shared manager interfaces.
- Run package tests, workspace typecheck, publint, full workspace tests, and MCP conformance before release.

## Completion Criteria

- PostgreSQL hardening is reviewable without subscription-transport changes.
- Shared session-manager APIs and generated types are unchanged.
- Existing installations have an explicit, tested schema-upgrade path.
- Fresh installations create the final schema without redundant follow-up DDL.
- Stream ownership, cleanup, delivery ordering, and legacy compatibility have dedicated regression coverage.
