/**
 * @import { McpServer } from "tmcp";
 */

/**
 * @typedef {{
 * 	getSessionId: () => string
 * }} HttpTransportOptions
 */

export class HttpTransport {
	/**
	 * @type {McpServer<any>}
	 */
	#server;

	/**
	 * @type {HttpTransportOptions}
	 */
	#options;

	#session = new Map();
	#streams = new Map();

	/**
	 *
	 * @param {McpServer<any>} server
	 * @param {HttpTransportOptions} [options]
	 */
	constructor(server, options) {
		this.#server = server;
		this.#options = options || {
			getSessionId: () => crypto.randomUUID(),
		};
		this.#server.on('send', (response) => {
			for (let controller of this.#session.values()) {
				controller.enqueue(
					'data: ' + JSON.stringify(response) + '\n\n',
				);
			}
		});
	}

	/**
	 *
	 * @param {Request} request
	 * @returns
	 */
	async respond(request) {
		const sessions = this.#session;
		const streams = this.#streams;

		const body = await request.json();
		const session_id =
			request.headers.get('mcp-session-id') ||
			this.#options.getSessionId();
		const controller = sessions.get(session_id);
		const response = await this.#server.receive(body);

		if (controller) {
			controller.enqueue('data: ' + JSON.stringify(response) + '\n\n');
			return new Response(null, {
				status: 204,
				headers: {
					'Content-Type': 'text/event-stream',
					'mcp-session-id': session_id,
				},
			});
		}

		const stream = new ReadableStream({
			start(controller) {
				sessions.set(session_id, controller);
				controller.enqueue(
					'data: ' + JSON.stringify(response) + '\n\n',
				);
			},
			cancel() {
				sessions.delete(session_id);
			},
		});

		streams.set(session_id, stream);
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'mcp-session-id': session_id,
			},
			status: 200,
		});
	}
}
