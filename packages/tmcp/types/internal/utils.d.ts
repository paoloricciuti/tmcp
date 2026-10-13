export function event<Key extends keyof McpEvents>(type: Key, detail: Parameters<McpEvents[Key]>[0]): CustomEvent<Parameters<McpEvents[Key]>[0]>;
import type { McpEvents } from "./internal.js";
//# sourceMappingURL=utils.d.ts.map