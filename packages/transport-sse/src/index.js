/**
 * @import { AuthInfo, McpServer } from "tmcp";
 * @import { OAuth } from "@tmcp/auth";
 */

/**
 * @typedef {{
 * 	getSessionId?: () => string
 * 	path?: string
 * 	endpoint?: string
 * 	oauth?: OAuth<"built">
 * }} SseTransportOptions
 */

export class SseTransport {
	/**
	 * @type {McpServer<any>}
	 */
	#server;

	/**
	 * @type {Required<Omit<SseTransportOptions, 'oauth'>>}
	 */
	#options;

	/**
	 * @type {string}
	 */
	#path;

	/**
	 * @type {string}
	 */
	#endpoint;

	/**
	 * @type {Map<string, ReadableStreamDefaultController>}
	 */
	#sessions = new Map();

	/**
	 * @type {Map<string, ReadableStream>}
	 */
	#streams = new Map();

	/**
	 * @type {OAuth<"built"> | undefined}
	 */
	#oauth;

	#text_encoder = new TextEncoder();

	/**
	 * @param {McpServer<any>} server
	 * @param {SseTransportOptions} [options]
	 */
	constructor(server, options) {
		this.#server = server;
		const {
			getSessionId = () => crypto.randomUUID(),
			path = '/sse',
			endpoint = '/message',
			oauth,
		} = options ?? {
			getSessionId: () => crypto.randomUUID(),
			path: '/sse',
			endpoint: '/message',
		};
		if (oauth) {
			this.#oauth = oauth;
		}
		this.#options = {
			getSessionId,
			path,
			endpoint,
		};
		this.#path = this.#options.path;
		this.#endpoint = this.#options.endpoint;

		// Listen for server send events
		this.#server.on('send', ({ request, context: { sessions } }) => {
			for (let [session_id, controller] of this.#sessions.entries()) {
				if (sessions === undefined || sessions.includes(session_id)) {
					controller.enqueue(
						this.#text_encoder.encode(
							`data: ${JSON.stringify(request)}\n\n`,
						),
					);
				}
			}
		});
	}

	/**
	 * @param {string} session_id
	 */
	#handle_get(session_id) {
		// If session already exists, close it first
		const existing_controller = this.#sessions.get(session_id);
		if (existing_controller) {
			existing_controller.close();
			this.#sessions.delete(session_id);
			this.#streams.delete(session_id);
		}

		// Create new SSE stream
		const stream = new ReadableStream({
			start: (controller) => {
				this.#sessions.set(session_id, controller);

				// Send initial endpoint event with session info
				const endpoint_url = new URL(
					this.#endpoint,
					'http://localhost',
				);
				endpoint_url.searchParams.set('session_id', session_id);

				const endpoint_event = `event: endpoint\ndata: ${endpoint_url.pathname + endpoint_url.search + endpoint_url.hash}\n\n`;

				controller.enqueue(this.#text_encoder.encode(endpoint_event));
			},
			cancel: () => {
				this.#sessions.delete(session_id);
				this.#streams.delete(session_id);
			},
		});

		this.#streams.set(session_id, stream);

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
				'mcp-session-id': session_id,
			},
			status: 200,
		});
	}

	/**
	 * @param {string} session_id
	 * @param {Request} request
	 * @param {AuthInfo | null} auth_info
	 */
	async #handle_post(session_id, request, auth_info) {
		// Check Content-Type header
		const content_type = request.headers.get('content-type');
		if (!content_type || !content_type.includes('application/json')) {
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32600,
						message: 'Invalid Request',
						data: 'Content-Type must be application/json',
					},
				}),
				{
					status: 415,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				},
			);
		}

		try {
			const body = await request.clone().json();
			const response = await this.#server.receive(body, {
				sessionId: session_id,
				auth: auth_info ?? undefined,
			});

			const controller = this.#sessions.get(session_id);

			if (!controller) {
				return new Response('SSE connection not established', {
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				});
			}

			if (response != null) {
				controller.enqueue(
					this.#text_encoder.encode(
						`data: ${JSON.stringify(response)}\n\n`,
					),
				);
			}

			// Return JSON response for requests
			return new Response(null, {
				status: 202,
				headers: {
					'Content-Type': 'application/json',
					'mcp-session-id': session_id,
				},
			});
		} catch (error) {
			// Handle JSON parsing errors
			return new Response(`${error}`, {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'mcp-session-id': session_id,
				},
			});
		}
	}

	/**
	 * @param {string} session_id
	 */
	#handle_delete(session_id) {
		const controller = this.#sessions.get(session_id);
		if (controller) {
			controller.close();
			this.#sessions.delete(session_id);
			this.#streams.delete(session_id);
		}

		return new Response(null, {
			status: 204,
			headers: {
				'mcp-session-id': session_id,
			},
		});
	}

	/**
	 * @param {string} method
	 */
	#handle_default(method) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32601,
					message: 'Method not found',
					data: `HTTP method ${method} not supported`,
				},
			}),
			{
				status: 405,
				headers: {
					'Content-Type': 'application/json',
					Allow: 'GET, POST, DELETE, OPTIONS',
				},
			},
		);
	}

	/**
	 * @param {Request} request
	 * @returns {Promise<Response | null>}
	 */
	async respond(request) {
		const url = new URL(request.url);

		/**
		 * @type {AuthInfo | null}
		 */
		let auth_info = null;

		// Check if OAuth helper should handle this request
		if (this.#oauth) {
			try {
				const response = await this.#oauth.respond(request);
				if (response) {
					return response;
				}
			} catch (error) {
				return new Response(
					JSON.stringify({
						error: 'server_error',
						error_description: /** @type {Error} */ (error).message,
					}),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}
			auth_info = await this.#oauth.verify(request);
		}

		// Check if the request path matches the configured SSE path
		if (
			request.method === 'GET'
				? url.pathname !== this.#path
				: url.pathname !== this.#endpoint
		) {
			return null;
		}

		const method = request.method;
		const session_id =
			url.searchParams.get('session_id') ||
			request.headers.get('mcp-session-id') ||
			this.#options.getSessionId();

		// Handle DELETE request - disconnect session
		if (method === 'DELETE') {
			return this.#handle_delete(session_id);
		}

		// Handle GET request - establish SSE connection
		if (method === 'GET') {
			return this.#handle_get(session_id);
		}

		// Handle POST request - process message
		if (method === 'POST') {
			return this.#handle_post(session_id, request, auth_info);
		}

		// Method not supported
		return this.#handle_default(method);
	}

	/**
	 * Close all active sessions
	 */
	close() {
		for (const controller of this.#sessions.values()) {
			controller.close();
		}
		this.#sessions.clear();
		this.#streams.clear();
	}
}
