---
'@tmcp/auth': patch
---

fix: don't send `code_challenge=undefined` from `ProxyOAuthServerProvider`

When the authorization request has no PKCE code challenge, the proxied authorization URL no longer contains `code_challenge=undefined&code_challenge_method=S256`: both parameters are omitted.
