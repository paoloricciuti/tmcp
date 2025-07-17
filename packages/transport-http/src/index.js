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
		const method = request.method;
		const session_id =
			request.headers.get('mcp-session-id') ||
			this.#options.getSessionId();

		// Handle DELETE request - disconnect session
		if (method === 'DELETE') {
			const controller = sessions.get(session_id);
			if (controller) {
				controller.close();
				sessions.delete(session_id);
				streams.delete(session_id);
			}
			return new Response(null, {
				status: 204,
				headers: {
					'mcp-session-id': session_id,
				},
			});
		}

		// Handle GET request - establish long-lived connection for notifications
		if (method === 'GET') {
			// If session already exists, return existing stream
			const existing_stream = streams.get(session_id);
			if (existing_stream) {
				return new Response(existing_stream, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
						'mcp-session-id': session_id,
					},
					status: 200,
				});
			}

			// Create new long-lived stream for notifications
			const stream = new ReadableStream({
				start(controller) {
					sessions.set(session_id, controller);
				},
				cancel() {
					sessions.delete(session_id);
					streams.delete(session_id);
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

		// Handle POST request - process message and respond through event stream
		if (method === 'POST') {
			const body = await request.json();
			const response = await this.#server.receive(body, session_id);

			// Create a short-lived stream that closes after sending the response
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(
						'data: ' + JSON.stringify(response) + '\n\n',
					);
					controller.close();
				},
			});

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'mcp-session-id': session_id,
				},
				status: 200,
			});
		}

		// Method not supported
		return new Response('Method not allowed', {
			status: 405,
			headers: {
				Allow: 'GET, POST, DELETE',
			},
		});
	}
}
