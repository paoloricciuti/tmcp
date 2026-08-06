import { beforeEach, describe, expect, it, vi } from 'vitest';

const cloudflare = vi.hoisted(() => {
	const env = {};
	const owners = new Set();
	let fetch_delay;

	class Socket {
		#listeners = new Map();

		accept() {}

		addEventListener(event, callback) {
			this.#listeners.set(event, callback);
		}

		receive(value) {
			this.#listeners.get('message')?.({ data: value });
		}
	}

	const stub = {
		async fetch() {
			fetch_delay?.started.resolve();
			await fetch_delay?.release.promise;
			const socket = new Socket();
			owners.add(socket);
			return { status: 101, webSocket: socket };
		},
		async sendSubscription(notification) {
			for (const socket of owners) {
				socket.receive(JSON.stringify({ type: 'send', notification }));
			}
		},
	};

	const namespace = {
		newUniqueId() {},
		idFromName() {},
		getByName: () => stub,
	};

	return {
		env,
		delayFetch() {
			const started = Promise.withResolvers();
			const release = Promise.withResolvers();
			fetch_delay = { started, release };
			return fetch_delay;
		},
		reset() {
			owners.clear();
			fetch_delay = undefined;
			env.TMCP_DURABLE_OBJECT = namespace;
		},
		DurableObject: class {
			constructor(ctx, environment) {
				this.ctx = ctx;
				this.env = environment;
			}
		},
	};
});

vi.mock('cloudflare:workers', () => ({
	DurableObject: cloudflare.DurableObject,
	env: cloudflare.env,
	waitUntil: (promise) => promise,
}));

import { DurableObjectSubscriptionManager } from '../src/index.js';

describe('DurableObjectSubscriptionManager', () => {
	beforeEach(() => cloudflare.reset());

	it('waits for the broker connection before acknowledging', async () => {
		const delay = cloudflare.delayFetch();
		const listener = new DurableObjectSubscriptionManager();
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

	it('fans out notifications and filters them on each replica', async () => {
		const listener = new DurableObjectSubscriptionManager();
		const publisher = new DurableObjectSubscriptionManager();
		const received = [];
		await listener.create(
			{
				id: 1,
				origin: 'listener',
				filters: { resourceSubscriptions: ['test://resource'] },
			},
			{
				acknowledge() {},
				send(notification) {
					received.push(notification.params.uri);
				},
				close() {},
			},
		);

		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/resources/updated',
			params: { uri: 'test://ignored' },
		});
		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/resources/updated',
			params: { uri: 'test://resource' },
		});
		await vi.waitFor(() => expect(received).toEqual(['test://resource']));
	});

	it('closes subscriptions only on the owning replica', async () => {
		const listener = new DurableObjectSubscriptionManager();
		const remote = new DurableObjectSubscriptionManager();
		const closed = [];
		await listener.create(
			{ id: 1, origin: 'listener', filters: {} },
			{
				acknowledge() {},
				send() {},
				close(reason) {
					closed.push(reason);
				},
			},
		);

		await expect(remote.close(1, 'listener', 'closed')).resolves.toBe(
			false,
		);
		await expect(listener.close(1, 'listener', 'closed')).resolves.toBe(
			true,
		);
		expect(closed).toEqual(['closed']);
	});
});
