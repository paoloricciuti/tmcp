/**
 * @import { McpServer, ClientCapabilities } from "tmcp";
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

	/**
	 * @type {Map<string, ReadableStreamDefaultController>}
	 */
	#session = new Map();
	/**
	 * @type {Map<string, ReadableStream>}
	 */
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
		this.#server.on('send', ({ request, context: { sessions } }) => {
			for (let [session_id, controller] of this.#session.entries()) {
				if (sessions === undefined || sessions.includes(session_id)) {
					controller.enqueue(
						'data: ' + JSON.stringify(request) + '\n\n',
					);
				}
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
		const response = await this.#server.receive(body, session_id);

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
