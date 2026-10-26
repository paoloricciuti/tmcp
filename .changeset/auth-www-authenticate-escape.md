---
'@tmcp/auth': patch
---

fix: keep the error text in `WWW-Authenticate` to the characters a header allows

A token error with non-ASCII text, a `"` or a `\` now gets a 401 or 403 with a valid `WWW-Authenticate` header instead of a 500. The JSON body keeps the original text.
