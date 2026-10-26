---
'@tmcp/auth': patch
---

fix: give no client secret to public clients on registration and make it from a CSPRNG

Dynamic client registration no longer gives a secret to a client with `token_endpoint_auth_method: "none"`, and a confidential client's secret comes from `crypto.randomUUID()` instead of `Math.random()`.
