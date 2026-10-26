---
'tmcp': patch
---

fix: keep server options out of the `initialize` result

The `initialize` result no longer carries `adapter`, `pagination`, `logging` or `requestStateCodec`: only `protocolVersion`, `capabilities`, `instructions` and `serverInfo`.
