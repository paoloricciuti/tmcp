---
'@tmcp/session-manager': patch
'@tmcp/session-manager-redis': minor
'@tmcp/session-manager-postgres': minor
'@tmcp/session-manager-durable-objects': minor
---

feat: add subscription managers

Add distributed per-request subscription managers for Redis, PostgreSQL, and Cloudflare Durable Objects.

The managers fan notifications out through their shared broker while each replica keeps registration, filtering, acknowledgement ordering, and closure local to the process holding the response stream.
