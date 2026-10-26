---
'@tmcp/transport-stdio': patch
---

fix: abort `ctx.signal` of a request on `notifications/cancelled`

A handler running over stdio now sees `server.ctx.signal` abort when the client cancels its request, including a request that is still queued, and the cancelled request gets no response.
