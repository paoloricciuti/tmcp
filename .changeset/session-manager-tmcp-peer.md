---
'@tmcp/session-manager-durable-objects': minor
'@tmcp/session-manager-postgres': minor
'@tmcp/session-manager-redis': minor
---

fix: add `tmcp` as a peer dependency

Their type declarations import from `tmcp`, so it's now a required peer dependency (`^1.20.0`). npm refuses to install them next to an older `tmcp`.
