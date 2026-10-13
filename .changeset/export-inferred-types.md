---
'tmcp': patch
'@tmcp/auth': patch
---

fix: export the types that appear in inferred types

Projects that emit declarations can export values created with `defineTool`, `definePrompt`, `defineResource` and `defineTemplate`, `OAuth` handlers and verifiers, and bound server methods without TS2742 errors. `tmcp/tool`, `tmcp/prompt`, `tmcp/resource` and `tmcp/template` now export `CreatedTool`, `CreatedPrompt`, `CreatedResource` and `CreatedTemplate`, and `tmcp` exports `McpEvents` and `ChangedArgs`. `@tmcp/auth` now exports `AuthInfo`, `SimplifiedHandlers` and the other types of its handlers and options.

The `tmcp` subpath entry points also resolve with `moduleResolution: "node"` again.
