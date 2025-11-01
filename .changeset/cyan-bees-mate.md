---
'@tmcp/adapter-zod': patch
---

fix: explicitly set jsonschema 7 for zod adapter

VSCode specifically throws if you use the default of zod v4 (which is the latest JSON Schema spec)...I've seen reports of claude code throwing with draft 7 but from my tests it doesn't seem to happen. Please report in case it does.
