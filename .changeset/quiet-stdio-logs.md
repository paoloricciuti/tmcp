---
'@tmcp/transport-stdio': patch
---

fix: forward standalone server notifications before initialization

Register the stdio `send` listener when the transport is created so per-request protocol logs and progress can be written before a legacy `initialize` request. This also forwards standalone notifications emitted outside a request before initialization; legacy broadcast and session-state listeners still start after initialization.
