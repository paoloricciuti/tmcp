/**
 * @import { McpServer } from "tmcp";
 * @import { OAuth  } from "@tmcp/auth";
 */

/**
 * @typedef {{
 * 	getSessionId?: () => string
 * 	path?: string
 * 	oauth?: OAuth
 * }} HttpTransportOptions
 */

import { AsyncLocalStorage } from 'node:async_hooks';
export class HttpTransport {
	/**
	 * @type {McpServer<any>}
	 */
	#server;

	/**
	 * @type {Required<Omit<HttpTransportOptions, 'oauth'>>}
	 */
	#options;

	/**
	 * @type {string}
	 */
	#path;

	/**
	 * @type {Map<string, ReadableStreamDefaultController>}
	 */
	#session = new Map();
	/**
	 * @type {Map<string, ReadableStream>}
	 */
	#streams = new Map();

	/**
	 * @type {AsyncLocalStorage<ReadableStreamDefaultController | undefined>}
	 */
	#controller_storage = new AsyncLocalStorage();

	/**
	 * @type {OAuth | undefined}
	 */
	#oauth;

	/**
	 *
	 * @param {McpServer<any>} server
	 * @param {HttpTransportOptions} [options]
	 */
	constructor(server, options) {
		this.#server = server;
		const {
			getSessionId = () => crypto.randomUUID(),
			path = '/mcp',
			oauth,
		} = options ?? {
			getSessionId: () => crypto.randomUUID(),
		};

		if (oauth) {
			this.#oauth = oauth;
		}

		this.#options = { getSessionId, path };
		this.#path = path;
		this.#server.on('send', ({ request, context: { sessions } }) => {
			// use the current controller if the request has an id (it means it's a request and not a notification)
			if (request.id != null) {
				const controller = this.#controller_storage.getStore();
				if (!controller)
					throw new Error('Controller not found in storage');

				controller.enqueue('data: ' + JSON.stringify(request) + '\n\n');
				return;
			}
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
	 * @param {string} session_id
	 */
	#handle_delete(session_id) {
		const controller = this.#session.get(session_id);
		if (controller) {
			controller.close();
			this.#session.delete(session_id);
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
	 *
	 * @param {string} session_id
	 * @returns
	 */
	#handle_get(session_id) {
		const sessions = this.#session;
		const streams = this.#streams;
		// If session already exists, return existing stream
		const existing_stream = this.#streams.get(session_id);
		if (existing_stream) {
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32000,
						message:
							'Conflict: Only one SSE stream is allowed per session',
					},
					id: null,
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
					status: 409,
				},
			);
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

	/**
	 *
	 * @param {string} session_id
	 * @param {Request} request
	 */
	async #handle_post(session_id, request) {
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

			/**
			 * @type {ReadableStreamDefaultController | undefined}
			 */
			let controller;

			// Create a short-lived stream that closes after sending the response
			const stream = new ReadableStream({
				start(_controller) {
					controller = _controller;
				},
			});

			const handle = async () => {
				const response = await this.#controller_storage.run(
					controller,
					() => this.#server.receive(body, session_id),
				);

				controller?.enqueue(
					'data: ' + JSON.stringify(response) + '\n\n',
				);
				controller?.close();
			};

			handle();

			const messages = Array.isArray(body) ? body : [body];

			// Determine status code based on response type
			// 202 Accepted for notifications/responses, 200 OK for standard requests
			const status = !messages.some((message) => message.id != null)
				? 202
				: 200;

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'mcp-session-id': session_id,
				},
				status,
			});
		} catch (error) {
			// Handle JSON parsing errors
			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					error: {
						code: -32700,
						message: 'Parse error',
						data: /** @type {Error} */ (error).message,
					},
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'mcp-session-id': session_id,
					},
				},
			);
		}
	}

	/**
	 *
	 * @param {string} method
	 * @returns
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
					Allow: 'GET, POST, DELETE',
				},
			},
		);
	}

	/**
	 *
	 * @param {Request} request
	 * @returns {Promise<Response | null>}
	 */
	async respond(request) {
		const url = new URL(request.url);

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
		}

		// Check if the request path matches the configured MCP path
		if (url.pathname !== this.#path) {
			return null;
		}

		const method = request.method;
		const session_id =
			request.headers.get('mcp-session-id') ||
			this.#options.getSessionId();

		// Handle DELETE request - disconnect session
		if (method === 'DELETE') {
			return this.#handle_delete(session_id);
		}

		// Handle GET request - establish long-lived connection for notifications
		if (method === 'GET') {
			return this.#handle_get(session_id);
		}

		// Handle POST request - process message and respond through event stream
		if (method === 'POST') {
			return this.#handle_post(session_id, request);
		}

		// Method not supported
		return this.#handle_default(method);
	}
}
