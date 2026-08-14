---
'@tmcp/transport-in-memory': minor
---

feat: add a sessionless client for the per-request protocol

Add `transport.stateless()` with discovery, explicit request metadata, strict JSON-RPC errors, isolated notification capture, and automatic MRTR input retries. Its ordinary high-level MCP methods share their signatures and implementation with `Session`, allowing tests to switch between session-negotiated and per-request clients without rewriting calls.

This API requires tmcp 1.20 or newer, where the `2026-07-28` per-request protocol is available.
