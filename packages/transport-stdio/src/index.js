/**
 * @import { McpServer, Context, Subscriptions } from "tmcp";
 */
import process from 'node:process';
import { InMemorySubscriptionManager } from '@tmcp/session-manager';

const PROCESSING_DRAIN_TIMEOUT_MS = 1000;

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
	 * @type {NonNullable<Partial<Context["sessionInfo"]>>}
	 */
	#session_info = {};

	/**
	 * @type {Subscriptions}
	 */
	#subscriptions = {
		resource: [],
	};

	#subscription_manager = new InMemorySubscriptionManager();
	#subscription_origin = crypto.randomUUID();
	#initialized = false;
	/** @type {Map<string | number, { cancelled: boolean }>} */
	#listen_tasks = new Map();
	#write_queue = Promise.resolve();
	#legacy_queue = Promise.resolve();
	/** @type {Set<Promise<void>>} */
	#processing_tasks = new Set();
	/** @type {Promise<void> | undefined} */
	#closing;
	#listening = false;
	#writes_enabled = true;

	/**
	 *
	 * @param {McpServer<any, TCustom>} server
	 */
	constructor(server) {
		this.#server = server;
		this.#cleaners.add(
			this.#server.on('send', ({ request, subscriptionOrigin }) => {
				if (
					subscriptionOrigin !== undefined &&
					subscriptionOrigin !== this.#subscription_origin
				) {
					return;
				}
				void this.#write(request).catch(() => {});
			}),
		);
		this.#cleaners.add(
			this.#server.on('broadcast', ({ request, subscriptionOnly }) => {
				this.#subscription_manager.send(request);
				if (!this.#initialized || subscriptionOnly) return;
				if (
					request.method === 'notifications/resources/updated' &&
					!this.#subscriptions.resource.includes(request.params.uri)
				) {
					return;
				}
				this.#write(request);
			}),
		);
		this.#cleaners.add(
			this.#server.on('loglevelchange', ({ level }) => {
				this.#session_info.logLevel = level;
			}),
		);
		this.#cleaners.add(
			this.#server.on('subscription', ({ uri, action }) => {
				this.#subscriptions ??= {
					resource: [],
				};
				if (action === 'remove') {
					this.#subscriptions.resource =
						this.#subscriptions.resource?.filter(
							(item) => item !== uri,
						);
				} else {
					this.#subscriptions.resource?.push(uri);
				}
			}),
		);
		this.#cleaners.add(
			this.#server.on('initialize', ({ capabilities, clientInfo }) => {
				this.#initialized = true;
				this.#session_info.clientCapabilities = capabilities;
				this.#session_info.clientInfo = clientInfo;
			}),
		);
	}

	/** @param {unknown} message */
	#write(message) {
		if (!this.#writes_enabled) return Promise.resolve();
		const write = this.#write_queue.then(() => {
			if (!this.#writes_enabled) return;
			process.stdout.write(JSON.stringify(message) + '\n');
		});
		this.#write_queue = write.catch(() => {});
		return write;
	}

	/**
	 * @param {Record<string, any>} message
	 * @param {TCustom} [ctx]
	 */
	async #handle_message(message, ctx) {
		const is_init = message.method === 'initialize';
		const session_info = is_init
			? {
					clientCapabilities: message.params?.capabilities,
					clientInfo: message.params?.clientInfo,
				}
			: this.#session_info;
		const is_listen =
			message.method === 'subscriptions/listen' &&
			(typeof message.id === 'string' || typeof message.id === 'number');
		const task =
			is_listen && !this.#listen_tasks.has(message.id)
				? { cancelled: false }
				: undefined;
		if (task) this.#listen_tasks.set(message.id, task);

		if (message.method === 'notifications/cancelled') {
			const request_id = message.params?.requestId;
			if (
				(typeof request_id === 'string' ||
					typeof request_id === 'number') &&
				(message.params?.reason === undefined ||
					typeof message.params.reason === 'string')
			) {
				const cancelled = this.#listen_tasks.get(request_id);
				if (cancelled) cancelled.cancelled = true;
			}
		}

		try {
			const response = await this.#server.receive(
				/** @type {*} */ (message),
				{
					custom: ctx,
					sessionInfo: /** @type {Context["sessionInfo"]} */ (
						session_info
					),
					subscriptionOrigin: this.#subscription_origin,
					subscriptionManager: this.#subscription_manager,
				},
			);
			if (response && !task?.cancelled) await this.#write(response);
		} finally {
			if (task && this.#listen_tasks.get(message.id) === task) {
				this.#listen_tasks.delete(message.id);
			}
		}
	}

	#shutdown() {
		if (this.#closing) return this.#closing;
		this.#closing = (async () => {
			for (const task of this.#listen_tasks.values()) {
				task.cancelled = true;
			}
			await this.#subscription_manager.closeAll(
				this.#subscription_origin,
				'cancelled',
			);
			/** @type {ReturnType<typeof setTimeout> | undefined} */
			let timeout;
			const drained = await Promise.race([
				Promise.allSettled([
					this.#legacy_queue,
					...this.#processing_tasks,
				]).then(() => true),
				new Promise((resolve) => {
					timeout = setTimeout(
						() => resolve(false),
						PROCESSING_DRAIN_TIMEOUT_MS,
					);
				}),
			]);
			clearTimeout(timeout);
			if (!drained) this.#writes_enabled = false;
			await this.#write_queue;
			for (const cleaner of this.#cleaners) cleaner();
			this.#cleaners.clear();
		})();
		return this.#closing;
	}

	/**
	 * @param {TCustom} [ctx]
	 */
	listen(ctx) {
		if (this.#listening || this.#closing) return;
		this.#listening = true;
		// Handle stdio communication
		process.stdin.setEncoding('utf8');

		let buffer = '';

		/** @param {string} chunk */
		const on_data = (chunk) => {
			if (this.#closing) return;
			buffer += chunk;

			// Process complete JSON-RPC messages
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // Keep the incomplete line in buffer

			for (const line of lines) {
				if (line.trim()) {
					try {
						const message = JSON.parse(line);
						const per_request =
							typeof message.params?._meta?.[
								'io.modelcontextprotocol/protocolVersion'
							] === 'string';
						const cancels_listen =
							message.method === 'notifications/cancelled' &&
							this.#listen_tasks.has(message.params?.requestId);
						const is_response = typeof message.method !== 'string';
						const is_control_notification =
							message.method === 'notifications/cancelled' ||
							message.method === 'notifications/progress';
						if (
							per_request ||
							cancels_listen ||
							is_response ||
							is_control_notification
						) {
							const task = this.#handle_message(
								message,
								ctx,
							).catch(() => {});
							this.#processing_tasks.add(task);
							void task.finally(() =>
								this.#processing_tasks.delete(task),
							);
						} else {
							this.#legacy_queue = this.#legacy_queue
								.then(() => this.#handle_message(message, ctx))
								.catch(() => {});
						}
					} catch {
						/** empty */
					}
				}
			}
		};

		const on_end = () => {
			void this.#shutdown().then(() => process.exit(0));
		};

		// Handle process termination
		const on_sigint = () => {
			void this.#shutdown().then(() => process.exit(0));
		};

		const on_sigterm = () => {
			void this.#shutdown().then(() => process.exit(0));
		};

		process.stdin.on('data', on_data);
		process.stdin.on('end', on_end);
		process.on('SIGINT', on_sigint);
		process.on('SIGTERM', on_sigterm);
		this.#cleaners.add(() => process.stdin.off('data', on_data));
		this.#cleaners.add(() => process.stdin.off('end', on_end));
		this.#cleaners.add(() => process.off('SIGINT', on_sigint));
		this.#cleaners.add(() => process.off('SIGTERM', on_sigterm));
	}

	/**
	 * @param {string | number} id
	 * @returns {boolean | Promise<boolean>}
	 */
	closeSubscription(id) {
		return this.#subscription_manager.close(
			id,
			this.#subscription_origin,
			'closed',
		);
	}

	close() {
		return this.#shutdown();
	}
}
