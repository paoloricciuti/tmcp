/**
 * @import { Mock } from 'vitest';
 */
import { beforeEach, test, describe, afterEach, vi, expect } from 'vitest';
import {
	validate_tool_name,
	validate_and_warn_tool_name,
	issue_tool_name_warning,
} from './tool-name.js';

// Spy on console.warn to capture output
/**
 * @type {Mock}
 */
let warn_spy;

beforeEach(() => {
	warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('validate_tool_name', () => {
	describe('valid tool names', () => {
		test.each`
			description                    | tool_name
			${'simple alphanumeric names'} | ${'getUser'}
			${'names with underscores'}    | ${'get_user_profile'}
			${'names with dashes'}         | ${'user-profile-update'}
			${'names with dots'}           | ${'admin.tools.list'}
			${'mixed character names'}     | ${'DATA_EXPORT_v2.1'}
			${'single character names'}    | ${'a'}
			${'128 character names'}       | ${'a'.repeat(128)}
		`('should accept $description', ({ tool_name }) => {
			const result = validate_tool_name(tool_name);
			expect(result.is_valid).toBe(true);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('invalid tool names', () => {
		test.each`
			description                            | tool_name                 | expected_warning
			${'empty names'}                       | ${''}                     | ${'Tool name cannot be empty'}
			${'names longer than 128 characters'}  | ${'a'.repeat(129)}        | ${'Tool name exceeds maximum length of 128 characters (current: 129)'}
			${'names with spaces'}                 | ${'get user profile'}     | ${'Tool name contains invalid characters: " "'}
			${'names with commas'}                 | ${'get,user,profile'}     | ${'Tool name contains invalid characters: ","'}
			${'names with forward slashes'}        | ${'user/profile/update'}  | ${'Tool name contains invalid characters: "/"'}
			${'names with other special chars'}    | ${'user@domain.com'}      | ${'Tool name contains invalid characters: "@"'}
			${'names with multiple invalid chars'} | ${'user name@domain,com'} | ${'Tool name contains invalid characters: " ", "@", ","'}
			${'names with unicode characters'}     | ${'user-ñame'}            | ${'Tool name contains invalid characters: "ñ"'}
		`('should reject $description', ({ tool_name, expected_warning }) => {
			const result = validate_tool_name(tool_name);
			expect(result.is_valid).toBe(false);
			expect(result.warnings).toContain(expected_warning);
		});
	});

	describe('warnings for potentially problematic patterns', () => {
		test.each`
			description                               | tool_name             | expected_warning                                                                           | shouldBeValid
			${'names with spaces'}                    | ${'get user profile'} | ${'Tool name contains spaces, which may cause parsing issues'}                             | ${false}
			${'names with commas'}                    | ${'get,user,profile'} | ${'Tool name contains commas, which may cause parsing issues'}                             | ${false}
			${'names starting with dash'}             | ${'-get-user'}        | ${'Tool name starts or ends with a dash, which may cause parsing issues in some contexts'} | ${true}
			${'names ending with dash'}               | ${'get-user-'}        | ${'Tool name starts or ends with a dash, which may cause parsing issues in some contexts'} | ${true}
			${'names starting with dot'}              | ${'.get.user'}        | ${'Tool name starts or ends with a dot, which may cause parsing issues in some contexts'}  | ${true}
			${'names ending with dot'}                | ${'get.user.'}        | ${'Tool name starts or ends with a dot, which may cause parsing issues in some contexts'}  | ${true}
			${'names with leading and trailing dots'} | ${'.get.user.'}       | ${'Tool name starts or ends with a dot, which may cause parsing issues in some contexts'}  | ${true}
		`(
			'should warn about $description',
			({ tool_name, expected_warning, shouldBeValid }) => {
				const result = validate_tool_name(tool_name);
				expect(result.is_valid).toBe(shouldBeValid);
				expect(result.warnings).toContain(expected_warning);
			},
		);
	});
});

describe('issue_tool_name_warning', () => {
	test('should output warnings to console.warn', () => {
		const warnings = ['Warning 1', 'Warning 2'];
		issue_tool_name_warning('test-tool', warnings);

		expect(warn_spy).toHaveBeenCalledTimes(6); // Header + 2 warnings + 3 guidance lines
		const calls = warn_spy.mock.calls.map((call) => call.join(' '));
		expect(calls[0]).toContain(
			'Tool name validation warning for "test-tool"',
		);
		expect(calls[1]).toContain('- Warning 1');
		expect(calls[2]).toContain('- Warning 2');
		expect(calls[3]).toContain(
			'Tool registration will proceed, but this may cause compatibility issues.',
		);
		expect(calls[4]).toContain('Consider updating the tool name');
		expect(calls[5]).toContain('See SEP: Specify Format for Tool Names');
	});

	test('should handle empty warnings array', () => {
		issue_tool_name_warning('test-tool', []);
		expect(warn_spy).toHaveBeenCalledTimes(0);
	});
});

describe('validate_and_warn_tool_name', () => {
	test.each`
		description                       | tool_name             | expected_result | should_warn
		${'valid names with warnings'}    | ${'-get-user-'}       | ${true}         | ${true}
		${'completely valid names'}       | ${'get-user-profile'} | ${true}         | ${false}
		${'invalid names with spaces'}    | ${'get user profile'} | ${false}        | ${true}
		${'empty names'}                  | ${''}                 | ${false}        | ${true}
		${'names exceeding length limit'} | ${'a'.repeat(129)}    | ${false}        | ${true}
	`(
		'should handle $description',
		({ tool_name, expected_result, should_warn }) => {
			const result = validate_and_warn_tool_name(tool_name);
			expect(result).toBe(expected_result);

			if (should_warn) {
				expect(warn_spy).toHaveBeenCalled();
			} else {
				expect(warn_spy).not.toHaveBeenCalled();
			}
		},
	);

	test('should include space warning for invalid names with spaces', () => {
		validate_and_warn_tool_name('get user profile');
		const warningCalls = warn_spy.mock.calls.map((call) => call.join(' '));
		expect(
			warningCalls.some((call) =>
				call.includes('Tool name contains spaces'),
			),
		).toBe(true);
	});
});

describe('edge cases and robustness', () => {
	test.each`
		description                               | tool_name         | should_be_valid | expected_warning
		${'names with only dots'}                 | ${'...'}          | ${true}         | ${'Tool name starts or ends with a dot, which may cause parsing issues in some contexts'}
		${'names with only dashes'}               | ${'---'}          | ${true}         | ${'Tool name starts or ends with a dash, which may cause parsing issues in some contexts'}
		${'names with only forward slashes'}      | ${'///'}          | ${false}        | ${'Tool name contains invalid characters: "/"'}
		${'names with mixed valid/invalid chars'} | ${'user@name123'} | ${false}        | ${'Tool name contains invalid characters: "@"'}
	`(
		'should handle $description',
		({ tool_name, should_be_valid, expected_warning }) => {
			const result = validate_tool_name(tool_name);
			expect(result.is_valid).toBe(should_be_valid);
			expect(result.warnings).toContain(expected_warning);
		},
	);
});
