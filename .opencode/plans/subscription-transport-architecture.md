# Subscription transport architecture

## Objective

Implement MCP `2026-07-28` `subscriptions/listen` using the same ownership model as existing session-negotiated notifications: core owns protocol semantics, transports own connections and stream managers, and distributed managers keep response sinks local while routing serialized messages through pub/sub.

This replaces the current work-in-progress design where one `SubscriptionManager` is configured globally on `McpServer`.

## Decisions

- Do not add new server event names or a parallel transport lifecycle.
- Reuse the existing `broadcast` event for list/resource change publication.
- Reuse the existing `send` event for acknowledgment and subscription notification delivery.
- Keep the existing `subscription` event unchanged for legacy `resources/subscribe` and `resources/unsubscribe` bookkeeping.
- The transport owns its `SubscriptionManager`; it is not a `McpServer` option.
- HTTP accepts an injectable manager and defaults to an in-memory implementation, like its existing stream/info session managers.
- Stdio and the in-memory transport own process-local subscription state directly.
- Deprecated SSE remains session-negotiated-only and receives no modern subscription support.

## Existing events

### `broadcast`

`McpServer.changed()` already emits `broadcast` events containing `notifications/tools/list_changed`, `notifications/prompts/list_changed`, `notifications/resources/list_changed`, or `notifications/resources/updated`.

Each transport listener should use that same event for both paths:

- Existing session-negotiated behavior remains unchanged.
- A modern-capable transport additionally calls its `SubscriptionManager.send(request)`.

The manager owns filter matching and distributed publication. Core must not call one global manager from `changed()`.

### `send`

Reuse `send` for all point-to-point outgoing messages. Extend its event detail with optional routing fields:

```ts
type SendEvent = {
	request: JSONRPCRequest;
	subscriptionId?: string | number;
	subscriptionOrigin?: string;
};
```

- Without routing fields, transports retain the current request/session-scoped behavior.
- With routing fields, a modern-capable transport routes the message to the response sink identified by the subscription origin and listen request ID.

Acknowledgment and later subscription notifications both use `send`. No separate `subscriptionsend` event is needed.

### `subscription`

Leave this event unchanged. It remains the legacy `resources/subscribe`/`resources/unsubscribe` signal carrying `{ uri, action }`.

Modern subscription registration happens through the transport-owned manager supplied in the internal receive context, not through this event.

## Ownership

### `McpServer`

Core remains responsible for:

- Validating `subscriptions/listen` and its required per-request metadata.
- Reducing requested filters against configured capabilities and known resources/templates.
- Using the JSON-RPC listen request ID as the wire subscription ID.
- Building `notifications/subscriptions/acknowledged`.
- Tagging subscription notifications with `io.modelcontextprotocol/subscriptionId`.
- Producing the graceful completion result.
- Handling schema-valid `notifications/cancelled` by asking the current transport manager to close the matching registration.

Core must not own persistent subscription registrations, connection controllers, or a global manager.

### Transport

The transport remains responsible for:

- Supplying a stable, serializable `subscriptionOrigin` for each connection.
- Supplying its manager/coordinator through the internal `receive()` context.
- Holding the listen response sink open while `receive()` remains pending.
- Routing subscription-aware `send` events to the correct sink.
- Calling manager cancellation when the response stream disconnects.
- Suppressing the settled listen response after client cancellation.
- Closing all owned subscriptions during transport shutdown.
- Advertising subscription capabilities only after this wiring exists.

The transport manager should be stripped from `server.ctx`, like other internal receive bookkeeping.

### `SubscriptionManager`

The manager contract mirrors `StreamSessionManager` rather than exposing registrations through `matching()`:

```ts
type Subscription = {
	id: string | number;
	origin: string;
	filters: SubscriptionFilter;
};

class SubscriptionManager {
	create(subscription, callbacks): boolean | Promise<boolean>;
	send(notification): void | Promise<void>;
	close(id, origin, reason): boolean | Promise<boolean>;
	closeAll(origin?, reason?): void | Promise<void>;
}
```

Registrations and callbacks passed to `create()` remain local to the process serving the response stream, exactly like the controller passed to `StreamSessionManager.create()`.

A Redis/Postgres/Durable Object implementation should:

- Subscribe each active manager instance to a shared broker channel.
- Publish notifications from `send()` to every active manager instance.
- Let each instance's local in-memory manager filter and deliver matching notifications.
- Keep `create()`, `close()`, and `closeAll()` local; the transport that owns the response sink also owns its lifecycle.
- Persist no descriptors, claims, leases, or close commands.

## Listen flow

1. The transport parses the request enough to establish its response sink and creates a stable origin. HTTP generates an opaque origin per listen POST; stdio reuses its process connection origin.
2. The transport calls `server.receive(message, { subscriptionOrigin, subscriptionManager, ...context })`.
3. Core validates and reduces the filter.
4. Core calls the context manager's local `create()` with the subscription and callbacks.
5. The manager registers before acknowledgment and buffers matching notifications until acknowledgment completes.
6. Core's acknowledgment callback emits the existing `send` event with subscription routing metadata.
7. The listen handler remains pending until the manager invokes its local close callback.
8. A graceful close settles the handler with the required complete result.

The manager must preserve acknowledgment-first and per-stream FIFO ordering even when callbacks are asynchronous.

## Change flow

1. Application code calls `server.changed(...)`.
2. Core emits the existing legacy `broadcast` event exactly as today.
3. Each transport listener preserves its existing legacy behavior.
4. Modern-capable transports also call their manager's `send(request)`.
5. A distributed manager publishes to every active instance, which matches local filters.
6. The owning callback asks core to tag the notification and emit the existing `send` event with explicit subscription routing fields.

Concrete template URIs may use the modern subscription path, but must not change the existing legacy broadcast behavior. Literal template patterns must not be acknowledged as modern resource subscriptions.

## Cancellation and closure

### HTTP

- Response-stream cancellation calls `subscriptionManager.close(id, origin, 'cancelled')`.
- The stream is already gone, so the eventual settled core response is discarded.
- Closure remains on the transport instance holding the response sink.

### Stdio

- Incoming lines must be processed concurrently for per-request methods so a listen request does not block cancellation or other calls.
- On `notifications/cancelled`, stdio marks that listen task as cancelled before/while core asks the same manager to close it.
- When the original `receive()` resolves, stdio suppresses that response using task identity, not merely `(origin, id)`, to avoid confusing a later reused request ID.
- Stdout writes remain serialized.

### In-memory transport

- The transport owns an in-memory manager and exposes a subscription helper after core/transport wiring is complete.
- Closing the helper invokes manager close and awaits the pending listen request.

### Graceful shutdown

The transport closes all managers/streams it owns through the manager's required `closeAll()` operation; do not add a global manager to `McpServer` solely for shutdown.

## Refactor from current WIP

The current work-in-progress must be adjusted as follows:

- Remove `subscriptionManager` from `McpServer` constructor options.
- Remove global manager publication from `McpServer.changed()`.
- Remove `subscriptionsend` and `subscriptionclose` events.
- Extend the existing `send` event detail with optional subscription routing metadata.
- Continue using the existing `broadcast` event for raw change notifications.
- Pass the transport manager/coordinator through internal `ReceiveContext` for listen and cancellation requests.
- Move `SubscriptionManager` and `InMemorySubscriptionManager` to `@tmcp/session-manager` if package dependency boundaries remain clean; otherwise keep the protocol-facing structural type in core and put concrete managers in the session-manager package.
- Move graceful/cancel lifecycle ownership from global `McpServer.closeSubscription()`/`cancelSubscription()` APIs to the transport-owned manager unless a concrete non-transport use case requires those server methods.
- Keep `matchesSubscription()` available to manager adapters or move it alongside the manager implementation.

## Required tests

- Acknowledgment is first, including a change racing asynchronous acknowledgment.
- Independent filters and FIFO delivery for concurrent subscriptions.
- Numeric and string request IDs do not collide in manager keys.
- Duplicate create is atomic.
- Acknowledge failure cleans registration and permits retry.
- Close during acknowledgment does not leak or emit after close.
- Slow async send preserves FIFO ordering.
- Send/close races never write after closure.
- Re-listen with the same ID cannot receive/suppress the old stream's close/result.
- Literal template patterns are rejected; concrete template URIs work only on the modern path.
- HTTP disconnect cancels and removes the registration.
- Stdio handles other requests and cancellation while listen remains open.
- Existing session-negotiated subscriptions and broadcasts remain unchanged.
- Multiple server replicas sharing one distributed manager backend fan out to the owning instance.

## Current baseline

Before this transport-owned refactor, the work-in-progress passes:

- 344 package tests, including 211 core tests.
- 40 conformance checks.
- Workspace typecheck, targeted ESLint/Prettier, generated declarations, publint, and `git diff --check`.

The latest Fable review found no protocol or serialization violations in the manager contract, but identified these items to preserve during the refactor:

- Prevent close/re-listen races for the same `(origin, id)`.
- Preserve request ID type identity in distributed keys.
- Add coverage for acknowledge failure, close during acknowledgment, notification-form listen without an ID, and FIFO under slow async sends.
- Cancellation response suppression remains a hard transport responsibility.

## Next implementation order

1. Refactor core to use a transport manager from internal receive context and reuse `send`/`broadcast`.
2. Relocate or split manager interfaces/implementations along package boundaries.
3. Integrate HTTP with injectable in-memory/distributed manager support and stream cancellation.
4. Integrate stdio concurrency, task-scoped cancellation suppression, and serialized output.
5. Add in-memory transport subscription helpers.
6. Re-enable subscription capability flags in `server/discover` only for transports that can deliver them.
7. Run the complete dual-era workspace and conformance suites, then request another Fable review.
