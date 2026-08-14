import { beforeEach, describe, expect, it, vi } from 'vitest';

const postgres = vi.hoisted(() => {
	const messages = new Map();
	const clients = new Set();
	const notify_payloads = [];
	let listen_delay;

	class Client {
		#listeners = new Map();

		constructor() {
			clients.add(this);
		}

		connect() {
			return Promise.resolve();
		}

		on(event, callback) {
			this.#listeners.set(event, callback);
		}

		emit(event, value) {
			this.#listeners.get(event)?.(value);
		}

		async query(sql, parameters = []) {
			const normalized = sql.replaceAll(/\s+/g, ' ').trim();
			if (normalized.startsWith('LISTEN')) {
				listen_delay?.started.resolve();
				await listen_delay?.release.promise;
				return { rows: [], rowCount: 0 };
			}
			if (
				normalized.startsWith('CREATE TABLE') ||
				normalized.startsWith('DELETE FROM')
			) {
				return { rows: [], rowCount: 0 };
			}
			if (normalized.startsWith('INSERT INTO')) {
				messages.set(parameters[0], parameters[1]);
				return { rows: [], rowCount: 1 };
			}
			if (normalized.startsWith('SELECT value FROM')) {
				const value = messages.get(parameters[0]);
				return value === undefined
					? { rows: [], rowCount: 0 }
					: { rows: [{ value }], rowCount: 1 };
			}
			if (normalized.startsWith('SELECT pg_notify')) {
				notify_payloads.push(parameters[1]);
				for (const client of clients) {
					client.emit('notification', {
						channel: parameters[0],
						payload: parameters[1],
					});
				}
				return { rows: [], rowCount: 1 };
			}
			throw new Error(`Unexpected query: ${normalized}`);
		}
	}

	return {
		Client,
		get messageCount() {
			return messages.size;
		},
		get notifyPayloads() {
			return notify_payloads;
		},
		delayListen() {
			const started = Promise.withResolvers();
			const release = Promise.withResolvers();
			listen_delay = { started, release };
			return listen_delay;
		},
		reset() {
			messages.clear();
			clients.clear();
			notify_payloads.length = 0;
			listen_delay = undefined;
		},
	};
});

vi.mock('pg', () => ({ Client: postgres.Client }));

import { PostgresSubscriptionManager } from '../src/index.js';

describe('PostgresSubscriptionManager', () => {
	beforeEach(() => postgres.reset());

	it('waits for LISTEN before acknowledging', async () => {
		const delay = postgres.delayListen();
		const listener = new PostgresSubscriptionManager({
			connectionString: 'postgresql://test',
		});
		const acknowledge = vi.fn();
		const creating = listener.create(
			{ id: 1, origin: 'listener', filters: {} },
			{ acknowledge, send() {}, close() {} },
		);

		await delay.started.promise;
		expect(acknowledge).not.toHaveBeenCalled();
		delay.release.resolve();
		await expect(creating).resolves.toBe(true);
		expect(acknowledge).toHaveBeenCalledOnce();
	});

	it('fans out inline notifications and filters locally', async () => {
		const options = { connectionString: 'postgresql://test' };
		const listener = new PostgresSubscriptionManager(options);
		const publisher = new PostgresSubscriptionManager(options);
		const received = [];
		await listener.create(
			{
				id: 1,
				origin: 'listener',
				filters: { promptsListChanged: true },
			},
			{
				acknowledge() {},
				send(notification) {
					received.push(notification.method);
				},
				close() {},
			},
		);

		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
		});
		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/prompts/list_changed',
		});
		await vi.waitFor(() =>
			expect(received).toEqual(['notifications/prompts/list_changed']),
		);
		expect(postgres.messageCount).toBe(0);
	});

	it('stores oversized notifications outside the NOTIFY payload', async () => {
		const options = { connectionString: 'postgresql://test' };
		const listener = new PostgresSubscriptionManager(options);
		const publisher = new PostgresSubscriptionManager(options);
		const received = [];
		await listener.create(
			{
				id: 1,
				origin: 'listener',
				filters: { toolsListChanged: true },
			},
			{
				acknowledge() {},
				send(notification) {
					received.push(notification.params.padding.length);
				},
				close() {},
			},
		);

		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
			params: { padding: 'x'.repeat(9000) },
		});
		await vi.waitFor(() => expect(received).toEqual([9000]));
		expect(postgres.messageCount).toBe(1);
		expect(
			new TextEncoder().encode(postgres.notifyPayloads[0]).byteLength,
		).toBeLessThan(8000);
	});
});
