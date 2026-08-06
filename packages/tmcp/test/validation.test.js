import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	InputRequiredResultSchema,
	PromptListChangedNotificationSchema,
	ResourceListChangedNotificationSchema,
	ResourceUpdatedNotificationSchema,
	ServerResultSchema,
	SubscriptionsAcknowledgedNotificationSchema,
	SubscriptionsListenRequestParamsSchema,
	SubscriptionsListenResultSchema,
	ToolListChangedNotificationSchema,
} from '../src/validation/index.js';

describe('input-required result validation', () => {
	it('requires inputRequests or requestState', () => {
		const result = v.safeParse(InputRequiredResultSchema, {
			resultType: 'input_required',
		});

		expect(result.success).toBe(false);
	});

	it('requires the input_required result type', () => {
		const result = v.safeParse(InputRequiredResultSchema, {
			resultType: 'complete',
			requestState: 'state',
		});

		expect(result.success).toBe(false);
	});

	it('does not let malformed input-required results pass through a looser result schema', () => {
		const result = v.safeParse(ServerResultSchema, {
			resultType: 'input_required',
		});

		expect(result.success).toBe(false);
	});
});

describe('subscription validation', () => {
	it('requires per-request metadata on listen requests', () => {
		expect(
			v.safeParse(SubscriptionsListenRequestParamsSchema, {
				notifications: {},
			}).success,
		).toBe(false);
		expect(
			v.safeParse(SubscriptionsListenRequestParamsSchema, {
				notifications: {},
				_meta: {
					'io.modelcontextprotocol/protocolVersion': '2026-07-28',
					'io.modelcontextprotocol/clientCapabilities': {},
				},
			}).success,
		).toBe(true);
	});

	it('requires a result type and subscription ID on listen results', () => {
		expect(
			v.safeParse(SubscriptionsListenResultSchema, {
				_meta: { 'io.modelcontextprotocol/subscriptionId': 1 },
			}).success,
		).toBe(false);
		expect(
			v.safeParse(SubscriptionsListenResultSchema, {
				resultType: 'complete',
				_meta: { 'io.modelcontextprotocol/subscriptionId': 1 },
			}).success,
		).toBe(true);
		expect(
			v.safeParse(SubscriptionsListenResultSchema, {
				resultType: 'input_required',
				_meta: { 'io.modelcontextprotocol/subscriptionId': 1 },
			}).success,
		).toBe(false);
	});

	it('validates subscription IDs on notification metadata', () => {
		const notification = {
			method: 'notifications/subscriptions/acknowledged',
			params: {
				notifications: {},
				_meta: { 'io.modelcontextprotocol/subscriptionId': true },
			},
		};
		expect(
			v.safeParse(SubscriptionsAcknowledgedNotificationSchema, {
				method: notification.method,
				params: { notifications: {} },
			}).success,
		).toBe(false);
		expect(
			v.safeParse(
				SubscriptionsAcknowledgedNotificationSchema,
				notification,
			).success,
		).toBe(false);
		expect(
			v.safeParse(SubscriptionsAcknowledgedNotificationSchema, {
				...notification,
				params: {
					...notification.params,
					_meta: {
						'io.modelcontextprotocol/subscriptionId':
							'subscription',
					},
				},
			}).success,
		).toBe(true);
	});

	it.each([
		[
			ToolListChangedNotificationSchema,
			'notifications/tools/list_changed',
			{},
		],
		[
			PromptListChangedNotificationSchema,
			'notifications/prompts/list_changed',
			{},
		],
		[
			ResourceListChangedNotificationSchema,
			'notifications/resources/list_changed',
			{},
		],
		[
			ResourceUpdatedNotificationSchema,
			'notifications/resources/updated',
			{ uri: 'test://resource' },
		],
	])('rejects invalid subscription IDs on %s', (schema, method, params) => {
		expect(
			v.safeParse(schema, {
				method,
				params: {
					...params,
					_meta: {
						'io.modelcontextprotocol/subscriptionId': false,
					},
				},
			}).success,
		).toBe(false);
	});
});
