/**
 * @import { McpServer, ClientCapabilities } from "tmcp";
 */
import process from 'node:process';

export class StdioTransport {
	/**
	 * @type {McpServer<any>}
	 */
	#server;

	/**
	 *
	 * @param {McpServer<any>} server
	 */
	constructor(server) {
		this.#server = server;
		this.#server.on('send', ({ request }) => {
			process.stdout.write(JSON.stringify(request) + '\n');
		});
	}

	listen() {
		// Handle stdio communication
		process.stdin.setEncoding('utf8');

		let buffer = '';

		process.stdin.on('data', async (chunk) => {
			buffer += chunk;

			// Process complete JSON-RPC messages
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // Keep the incomplete line in buffer

			for (const line of lines) {
				if (line.trim()) {
					try {
						const message = JSON.parse(line);
						const response = await this.#server.receive(message);
						if (response) {
							process.stdout.write(
								JSON.stringify(response) + '\n',
							);
						}
					} catch {
						/** empty */
					}
				}
			}
		});

		process.stdin.on('end', () => {
			process.exit(0);
		});

		// Handle process termination
		process.on('SIGINT', () => {
			process.exit(0);
		});

		process.on('SIGTERM', () => {
			process.exit(0);
		});
	}
}
