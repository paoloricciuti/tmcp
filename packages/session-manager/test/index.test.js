import { describe, expect, it } from 'vitest';
import {
	InMemoryInfoSessionManager,
	InMemoryStreamSessionManager,
	InMemorySubscriptionManager,
} from '../src/index.js';

describe('InMemoryInfoSessionManager', () => {
	it('removes a deleted session from every resource subscription', async () => {
		const manager = new InMemoryInfoSessionManager();
		manager.addSubscription('first', 'test://one');
		manager.addSubscription('first', 'test://two');
		manager.addSubscription('second', 'test://one');

		manager.delete('first');

		await expect(manager.getSubscriptions('test://one')).resolves.toEqual([
			'second',
		]);
		await expect(manager.getSubscriptions('test://two')).resolves.toEqual(
			[],
		);
	});
});

describe('InMemoryStreamSessionManager', () => {
	it('continues fan-out after a disconnected controller throws', () => {
		const manager = new InMemoryStreamSessionManager();
		const received = [];
		manager.create('closed', {
			enqueue() {
				throw new Error('closed');
			},
		});
		manager.create('open', {
			enqueue(value) {
				received.push(new TextDecoder().decode(value));
			},
		});

		manager.send(undefined, 'message');

		expect(received).toEqual(['message']);
	});
});

describe('InMemorySubscriptionManager', () => {
	it('waits for acknowledgement before closing a subscription', async () => {
		const manager = new InMemorySubscriptionManager();
		const order = [];
		let acknowledge;
		const acknowledgement = new Promise((resolve) => {
			acknowledge = resolve;
		});
		const creating = manager.create(
			{ id: 1, origin: 'test', filters: {} },
			{
				async acknowledge() {
					await acknowledgement;
					order.push('acknowledge');
				},
				send() {},
				close() {
					order.push('close');
				},
			},
		);
		const closing = manager.close(1, 'test', 'cancelled');

		expect(order).toEqual([]);
		acknowledge();
		await Promise.all([creating, closing]);
		expect(order).toEqual(['acknowledge', 'close']);
	});

	it('registers before invoking the acknowledgement callback', async () => {
		const manager = new InMemorySubscriptionManager();
		let closing;
		const close = () => {};
		const creating = manager.create(
			{ id: 1, origin: 'test', filters: {} },
			{
				acknowledge() {
					closing = manager.close(1, 'test', 'cancelled');
				},
				send() {},
				close,
			},
		);

		await expect(closing).resolves.toBe(true);
		await expect(creating).resolves.toBe(true);
	});

	it('continues the delivery queue after one send fails', async () => {
		const manager = new InMemorySubscriptionManager();
		let attempts = 0;
		await manager.create(
			{ id: 1, origin: 'test', filters: { toolsListChanged: true } },
			{
				acknowledge() {},
				send() {
					if (++attempts === 1) throw new Error('disconnected');
				},
				close() {},
			},
		);
		const notification = {
			jsonrpc: /** @type {const} */ ('2.0'),
			method: 'notifications/tools/list_changed',
		};

		await expect(manager.send(notification)).rejects.toThrow(
			'disconnected',
		);
		await expect(manager.send(notification)).resolves.toBeUndefined();
		expect(attempts).toBe(2);
	});
});
