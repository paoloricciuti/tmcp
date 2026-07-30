import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
	InputRequiredResultSchema,
	ServerResultSchema,
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
