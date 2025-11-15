```ts
import { server } from './my-mcp-server.js';
import { HttpTransport } from '@tmcp/http-transport';
import {
	RedisStreamSessionManager,
	RedisInfoSessionManager,
} from '@tmcp/session-manager-redis';

const transport = new HttpTransport(server, {
	// only respond on the mcp path
	path: '/mcp',
	// built in session management, even for serverless
	sessionManager: {
		streams: new RedisStreamSessionManager('redis://localhost:6379'),
		info: new RedisInfoSessionManager('redis://localhost:6379'),
	},
});

Bun.serve({
	async fetch(request) {
		return (await transport.respond(request)) ?? render_website(request);
	},
});
```
