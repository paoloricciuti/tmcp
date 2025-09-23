/**
 * @import { McpServer, ClientCapabilities } from "tmcp";
 */
import process from 'node:process';

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 */
export class StdioTransport {
	/**
	 * @type {McpServer<any, TCustom>}
	 */
	#server;

	/**
	 * @type {Set<() => void>}
	 */
	#cleaners = new Set();

	/**
	 *
	 * @param {McpServer<any, TCustom>} server
	 */
	constructor(server) {
		this.#server = server;
		this.#cleaners.add(
			this.#server.on('initialize', () => {
				this.#cleaners.add(
					this.#server.on('send', ({ request }) => {
						process.stdout.write(JSON.stringify(request) + '\n');
					}),
				);
			}),
		);
	}

	#close() {
		for (const cleaner of this.#cleaners) {
			cleaner();
		}
		process.exit(0);
	}

	/**
	 * @param {TCustom} [ctx]
	 */
	listen(ctx) {
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
						const response = await this.#server.receive(message, {
							custom: ctx,
						});
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
			this.#close();
		});

		// Handle process termination
		process.on('SIGINT', () => {
			this.#close();
		});

		process.on('SIGTERM', () => {
			this.#close();
		});
	}
}
