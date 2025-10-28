---
'@tmcp/session-manager-durable-objects': minor
'@tmcp/session-manager-postgres': minor
'@tmcp/session-manager-redis': minor
'@tmcp/session-manager': minor
'@tmcp/transport-stdio': minor
'@tmcp/transport-http': minor
'@tmcp/transport-sse': minor
'tmcp': minor
---

breaking: move sessions out of core into the transports and allow for persistent mcp state

This release moves the session management out of the core package into the SSE and HTTP transport separately.
While technically a breaking change if you update both `tmcp` AND your transport be it `@tmcp/transport-http`
`@tmcp/transport-sse` or `@tmcp/transport-stdio` you will not face a breaking change unless you were using a
session manager.

If you were testing your `McpServer` instance manually you might need to update them to pass the `sessionInfo`
in the context parameter (only if you were reading them in the tool/resource/prompt).

Sorry for the "breaking" but this was a necessary step to unlock persistent state. 🧡
