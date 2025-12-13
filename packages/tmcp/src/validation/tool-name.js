/**
 * Tool name validation utilities according to SEP: Specify Format for Tool Names
 *
 * Tool names SHOULD be between 1 and 128 characters in length (inclusive).
 * Tool names are case-sensitive.
 * Allowed characters: uppercase and lowercase ASCII letters (A-Z, a-z), digits
 * (0-9), underscore (_), dash (-), and dot (.).
 * Tool names SHOULD NOT contain spaces, commas, or other special characters.
 *
 * Implementation copied almost verbatim from SEP-986 official sdk implementation.:
 */

/**
 * Regular expression for valid tool names according to SEP-986 specification
 */
const TOOL_NAME_REGEX = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Validates a tool name according to the SEP specification
 * @param {string} name - The tool name to validate
 * @returns An object containing validation result and any warnings
 */
export function validate_tool_name(name) {
	/**
	 * @type {string[]}
	 */
	const warnings = [];

	// Check length
	if (name.length === 0) {
		return {
			is_valid: false,
			warnings: ['Tool name cannot be empty'],
		};
	}

	if (name.length > 128) {
		return {
			is_valid: false,
			warnings: [
				`Tool name exceeds maximum length of 128 characters (current: ${name.length})`,
			],
		};
	}

	// Check for specific problematic patterns (these are warnings, not validation failures)
	if (name.includes(' ')) {
		warnings.push(
			'Tool name contains spaces, which may cause parsing issues',
		);
	}

	if (name.includes(',')) {
		warnings.push(
			'Tool name contains commas, which may cause parsing issues',
		);
	}

	// Check for potentially confusing patterns (leading/trailing dashes, dots, slashes)
	if (name.startsWith('-') || name.endsWith('-')) {
		warnings.push(
			'Tool name starts or ends with a dash, which may cause parsing issues in some contexts',
		);
	}

	if (name.startsWith('.') || name.endsWith('.')) {
		warnings.push(
			'Tool name starts or ends with a dot, which may cause parsing issues in some contexts',
		);
	}

	// Check for invalid characters
	if (!TOOL_NAME_REGEX.test(name)) {
		const invalid_chars = name
			.split('')
			.filter((char) => !/[A-Za-z0-9._-]/.test(char))
			.filter((char, index, arr) => arr.indexOf(char) === index); // Remove duplicates

		warnings.push(
			`Tool name contains invalid characters: ${invalid_chars.map((c) => `"${c}"`).join(', ')}`,
			'Allowed characters are: A-Z, a-z, 0-9, underscore (_), dash (-), and dot (.)',
		);

		return {
			is_valid: false,
			warnings,
		};
	}

	return {
		is_valid: true,
		warnings,
	};
}

/**
 * Issues warnings for non-conforming tool names
 * @param {string} name - The tool name that triggered the warnings
 * @param {string[]} warnings - Array of warning messages
 */
export function issue_tool_name_warning(name, warnings) {
	if (warnings.length > 0) {
		console.warn(`Tool name validation warning for "${name}":`);
		for (const warning of warnings) {
			console.warn(`  - ${warning}`);
		}
		console.warn(
			'Tool registration will proceed, but this may cause compatibility issues.',
		);
		console.warn(
			'Consider updating the tool name to conform to the MCP tool naming standard.',
		);
		console.warn(
			'See SEP: Specify Format for Tool Names (https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986) for more details.',
		);
	}
}

/**
 * Validates a tool name and issues warnings for non-conforming names
 * @param {string} name - The tool name to validate
 * @returns true if the name is valid, false otherwise
 */
export function validate_and_warn_tool_name(name) {
	const result = validate_tool_name(name);

	// Always issue warnings for any validation issues (both invalid names and warnings)
	issue_tool_name_warning(name, result.warnings);

	return result.is_valid;
}
