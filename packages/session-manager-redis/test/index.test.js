import { beforeEach, describe, expect, it, vi } from 'vitest';

const redis = vi.hoisted(() => {
	const subscribers = new Map();
	return {
		reset() {
			subscribers.clear();
		},
		createClient() {
			return {
				on() {},
				connect: () => Promise.resolve(),
				async subscribe(channel, callback) {
					let callbacks = subscribers.get(channel);
					if (!callbacks) {
						callbacks = new Set();
						subscribers.set(channel, callbacks);
					}
					callbacks.add(callback);
				},
				async publish(channel, message) {
					const callbacks = [...(subscribers.get(channel) ?? [])];
					for (const callback of callbacks) callback(message);
					return callbacks.length;
				},
			};
		},
	};
});

vi.mock('redis', () => ({ createClient: redis.createClient }));

import { RedisSubscriptionManager } from '../src/index.js';

describe('RedisSubscriptionManager', () => {
	beforeEach(() => redis.reset());

	it('fans out notifications and buffers them behind acknowledgement', async () => {
		const listener = new RedisSubscriptionManager('redis://test');
		const publisher = new RedisSubscriptionManager('redis://test');
		const acknowledgement = Promise.withResolvers();
		const order = [];
		const creating = listener.create(
			{
				id: 1,
				origin: 'listener',
				filters: { toolsListChanged: true },
			},
			{
				async acknowledge() {
					await acknowledgement.promise;
					order.push('acknowledge');
				},
				send() {
					order.push('send');
				},
				close() {},
			},
		);

		await publisher.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
		});
		await Promise.resolve();
		expect(order).toEqual([]);
		acknowledgement.resolve();
		await creating;
		await vi.waitFor(() => expect(order).toEqual(['acknowledge', 'send']));
	});

	it('filters and closes subscriptions on the owning replica', async () => {
		const listener = new RedisSubscriptionManager('redis://test');
		const remote = new RedisSubscriptionManager('redis://test');
		const received = [];
		const closed = [];
		await listener.create(
			{ id: 'request', origin: 'listener', filters: {} },
			{
				acknowledge() {},
				send(notification) {
					received.push(notification);
				},
				close(reason) {
					closed.push(reason);
				},
			},
		);

		await remote.send({
			jsonrpc: '2.0',
			method: 'notifications/tools/list_changed',
		});
		await Promise.resolve();
		expect(received).toEqual([]);
		await expect(
			remote.close('request', 'listener', 'closed'),
		).resolves.toBe(false);
		await expect(
			listener.close('request', 'listener', 'closed'),
		).resolves.toBe(true);
		expect(closed).toEqual(['closed']);
	});
});
