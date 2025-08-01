#!/usr/bin/env node

import * as p from '@clack/prompts';
import { execSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

async function main() {
	console.log();
	p.intro('🚀 Welcome to create-tmcp!');

	// Get project location
	const target_dir = await p.text({
		message: 'Where should we create your TMCP project?',
		placeholder: './my-mcp',
		validate: (value) => {
			if (!value || value.trim() === '') return 'Please enter a path';
		},
	});

	if (p.isCancel(target_dir)) {
		p.cancel('Operation cancelled');
		return process.exit(0);
	}

	const project_path = resolve(target_dir);
	const project_name = basename(project_path);

	// Check if directory exists and is not empty
	if (existsSync(project_path)) {
		const files = readdirSync(project_path);
		if (files.length > 0) {
			const should_continue = await p.confirm({
				message: `Directory "${target_dir}" is not empty. Continue anyway?`,
			});

			if (p.isCancel(should_continue) || !should_continue) {
				p.cancel('Operation cancelled');
				return process.exit(0);
			}
		}
	} else {
		mkdirSync(project_path, { recursive: true });
	}

	// Select adapter
	const adapter = await p.select({
		message: 'Which schema adapter would you like to use?',
		options: [
			{
				value: 'valibot',
				label: 'Valibot (Recommended)',
				hint: 'Lightweight, modern validation',
			},
			{ value: 'zod', label: 'Zod v4', hint: 'Latest Zod version' },
			{ value: 'zod-v3', label: 'Zod v3', hint: 'Legacy Zod version' },
			{
				value: 'arktype',
				label: 'ArkType',
				hint: 'TypeScript-first validation',
			},
			{
				value: 'effect',
				label: 'Effect Schema',
				hint: 'Functional programming approach',
			},
			{
				value: 'none',
				label: 'No adapter',
				hint: 'Manual schema handling (discouraged, you will need to create one yourself and handle validation manually)',
			},
		],
	});

	if (p.isCancel(adapter)) {
		p.cancel('Operation cancelled');
		return process.exit(0);
	}

	// Select transports (multiple)
	const transports = await p.multiselect({
		message: 'Which transports would you like to include?',
		options: [
			{
				value: 'stdio',
				label: 'STDIO',
				hint: 'Standard input/output (most common)',
			},
			{ value: 'http', label: 'HTTP', hint: 'HTTP server transport' },
			{
				value: 'sse',
				label: 'Server-Sent Events',
				hint: 'SSE transport for web apps',
			},
		],
		required: true,
	});

	if (p.isCancel(transports)) {
		p.cancel('Operation cancelled');
		return process.exit(0);
	}

	let include_auth = false;
	if (transports.includes('sse') || transports.includes('http')) {
		// Ask about auth
		const include_auth_res = await p.confirm({
			message: 'Would you like to include OAuth 2.1 authentication?',
			initialValue: false,
		});

		if (p.isCancel(include_auth_res)) {
			p.cancel('Operation cancelled');
			return process.exit(0);
		}
		include_auth = include_auth_res;
	}

	// Ask about example
	const include_example = await p.confirm({
		message: 'Would you like to include an example MCP server?',
		initialValue: true,
	});

	if (p.isCancel(include_example)) {
		p.cancel('Operation cancelled');
		return process.exit(0);
	}

	let example_path = 'src/example.js';
	if (include_example) {
		const custom_example_path = await p.text({
			message: 'Where should we place the example server?',
			placeholder: 'src/example.js',
		});

		if (p.isCancel(custom_example_path)) {
			p.cancel('Operation cancelled');
			return process.exit(0);
		}

		if (custom_example_path && custom_example_path.trim()) {
			example_path = custom_example_path.trim();
		}
	}

	const spinner = p.spinner();
	spinner.start('Creating project...');

	try {
		// Generate project files
		await generate_project({
			project_path,
			project_name,
			adapter,
			transports,
			include_auth,
			include_example,
			example_path,
		});

		spinner.stop('Project created successfully!');

		p.note(
			[`cd ${target_dir}`, 'pnpm install', 'pnpm run dev'].join('\n'),
			'Next steps:',
		);

		p.outro('Happy coding! 🎉');
	} catch (error) {
		spinner.stop('Failed to create project');
		p.cancel(error instanceof Error ? error.message : error + '');
		process.exit(1);
	}
}

/**
 * Generate project files based on user selections
 * @param {Object} options
 * @param {string} options.project_path
 * @param {string} options.project_name
 * @param {string} options.adapter
 * @param {string[]} options.transports
 * @param {boolean} options.include_auth
 * @param {boolean} options.include_example
 * @param {string} options.example_path
 */
async function generate_project({
	project_path,
	project_name,
	adapter,
	transports,
	include_auth,
	include_example,
	example_path,
}) {
	// Create src directory
	const src_dir = join(project_path, 'src');
	if (!existsSync(src_dir)) {
		mkdirSync(src_dir, { recursive: true });
	}

	// Generate or update package.json
	const package_json_path = join(project_path, 'package.json');
	const package_json = generate_package_json({
		project_name,
		adapter,
		transports,
		include_auth,
		existing_package_path: package_json_path,
	});
	writeFileSync(package_json_path, JSON.stringify(package_json, null, '\t'));

	// Generate example if requested
	if (include_example) {
		const example_content = generate_example_js({ adapter });
		const example_file_path = join(project_path, example_path);
		const example_dir = join(example_file_path, '..');
		if (!existsSync(example_dir)) {
			mkdirSync(example_dir, { recursive: true });
		}
		writeFileSync(example_file_path, example_content);
	}

	// Generate README.md only if project is not already initialized
	const readme_path = join(project_path, 'README.md');
	if (!existsSync(readme_path)) {
		const readme_content = generate_readme({
			project_name,
			adapter,
			transports,
			include_auth,
			include_example,
			example_path,
		});
		writeFileSync(readme_path, readme_content);
	}

	// Install dependencies
	try {
		execSync('pnpm install', { cwd: project_path, stdio: 'ignore' });
	} catch {
		// If pnpm fails, try npm
		try {
			execSync('npm install', { cwd: project_path, stdio: 'ignore' });
		} catch {
			throw new Error(
				'Failed to install dependencies. Please run "pnpm install" or "npm install" manually.',
			);
		}
	}
}

/**
 * Generate package.json content
 * @param {Object} options
 * @param {string} options.project_name
 * @param {string} options.adapter
 * @param {string[]} options.transports
 * @param {boolean} options.include_auth
 * @param {string} options.existing_package_path
 */
function generate_package_json({
	project_name,
	adapter,
	transports,
	include_auth,
	existing_package_path,
}) {
	// Check if package.json exists and merge dependencies
	/**
	 * @type {Record<string, any>}
	 */
	let existing_package = {};
	if (existsSync(existing_package_path)) {
		try {
			existing_package = JSON.parse(
				readFileSync(existing_package_path, 'utf8'),
			);
		} catch {
			// If we can't parse the existing package.json, we'll create a new one
			console.warn(
				'Warning: Could not parse existing package.json, creating new one',
			);
		}
	}
	/**
	 * @type {Record<string, string>}
	 */
	const new_dependencies = {
		tmcp: '^1.9.0',
	};

	// Add adapter dependencies
	if (adapter !== 'none') {
		new_dependencies[`@tmcp/adapter-${adapter}`] = '^0.2.0';

		switch (adapter) {
			case 'valibot':
				new_dependencies.valibot = '^1.1.0';
				break;
			case 'zod':
				new_dependencies.zod = '^4.0.0';
				break;
			case 'zod-v3':
				new_dependencies.zod = '^3.0.0';
				break;
			case 'arktype':
				new_dependencies.arktype = '^2.0.0';
				break;
			case 'effect':
				new_dependencies.effect = '^3.0.0';
				break;
		}
	}

	// Add transport dependencies
	transports.forEach((transport) => {
		new_dependencies[`@tmcp/transport-${transport}`] = '^0.1.0';
	});

	// Add auth dependency
	if (include_auth) {
		new_dependencies['@tmcp/auth'] = '^0.3.0';
	}

	// Merge dependencies with existing ones
	const merged_dependencies = {
		...existing_package.dependencies,
		...new_dependencies,
	};

	const merged_dev_dependencies = {
		'@types/node': '^24.0.15',
		...existing_package.devDependencies,
	};

	const default_package = {
		name: project_name,
		version: '1.0.0',
		description: 'A TMCP (lightweight MCP) server',
		type: 'module',
		main: 'src/index.js',
		scripts: {
			start: 'node src/index.js',
			dev: 'node --watch src/index.js',
		},
		keywords: ['tmcp', 'mcp', 'server'],
	};

	return {
		...default_package,
		...existing_package,
		dependencies: merged_dependencies,
		devDependencies: merged_dev_dependencies,
	};
}

/**
 * Generate example server content
 * @param {Object} options
 * @param {string} options.adapter - The selected schema adapter
 */
function generate_example_js({ adapter }) {
	const imports = ["import { McpServer } from 'tmcp';"];

	let adapter_setup = '';
	let example_tool = `server.tool(
	{
		name: 'example_tool',
		description: 'An example tool without schema validation',
	},
	async () => {
		return {
			content: [
				{
					type: 'text',
					text: 'This is an example tool!',
				},
			],
		};
	}
);`;

	if (adapter !== 'none') {
		// Add adapter-specific imports and setup
		const adapter_class_map = {
			valibot: 'ValibotJsonSchemaAdapter',
			zod: 'ZodJsonSchemaAdapter',
			'zod-v3': 'ZodV3JsonSchemaAdapter',
			arktype: 'ArktypeJsonSchemaAdapter',
			effect: 'EffectJsonSchemaAdapter',
		};
		const adapter_class =
			adapter_class_map[/** @type {keyof schema_examples} */ (adapter)];
		imports.push(
			`import { ${adapter_class} } from '@tmcp/adapter-${adapter}';`,
		);

		// Add schema library import and example
		const schema_examples = {
			valibot: {
				import: "import * as v from 'valibot';",
				schema: `const ExampleSchema = v.object({
	name: v.pipe(v.string(), v.description('Name of the person')),
	age: v.pipe(v.number(), v.description('Age of the person')),
});`,
				tool: `server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: \`Hello \${input.name}! You are \${input.age} years old.\`,
				},
			],
		};
	}
);`,
			},
			zod: {
				import: "import { z } from 'zod';",
				schema: `const ExampleSchema = z.object({
	name: z.string().describe('Name of the person'),
	age: z.number().describe('Age of the person'),
});`,
				tool: `server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: \`Hello \${input.name}! You are \${input.age} years old.\`,
				},
			],
		};
	}
);`,
			},
			'zod-v3': {
				import: "import { z } from 'zod';",
				schema: `const ExampleSchema = z.object({
	name: z.string().describe('Name of the person'),
	age: z.number().describe('Age of the person'),
});`,
				tool: `server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: \`Hello \${input.name}! You are \${input.age} years old.\`,
				},
			],
		};
	}
);`,
			},
			arktype: {
				import: "import { type } from 'arktype';",
				schema: `const ExampleSchema = type({
	name: 'string',
	age: 'number',
});`,
				tool: `server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: \`Hello \${input.name}! You are \${input.age} years old.\`,
				},
			],
		};
	}
);`,
			},
			effect: {
				import: "import * as S from 'effect/Schema';",
				schema: `const ExampleSchema = S.Struct({
	name: S.String.annotations({ description: 'Name of the person' }),
	age: S.Number.annotations({ description: 'Age of the person' }),
});`,
				tool: `server.tool(
	{
		name: 'greet_person',
		description: 'Greet a person by name and age',
		schema: ExampleSchema,
	},
	async (input) => {
		return {
			content: [
				{
					type: 'text',
					text: \`Hello \${input.name}! You are \${input.age} years old.\`,
				},
			],
		};
	}
);`,
			},
		};

		const schema_example =
			schema_examples[/** @type {keyof schema_examples} */ (adapter)];
		if (schema_example) {
			imports.push(schema_example.import);
			adapter_setup = `,
	{
		adapter: new ${adapter_class}(),
		capabilities: {
			tools: { listChanged: true },
		},
	}`;
			example_tool = `${schema_example.schema}

${schema_example.tool}`;
		}
	}

	return `#!/usr/bin/env node

${imports.join('\n')}
import { StdioTransport } from '@tmcp/transport-stdio';

const server = new McpServer(
	{
		name: 'example-server',
		version: '1.0.0',
		description: 'An example TMCP server',
	}${adapter_setup}
);

${example_tool}

const transport = new StdioTransport(server);
transport.listen();
`;
}

/**
 * Generate README.md content
 * @param {Object} options
 * @param {Object} options.project_name
 * @param {string} options.adapter
 * @param {string[]} options.transports
 * @param {boolean} options.include_auth
 * @param {boolean} options.include_example
 * @param {string} options.example_path
 */
function generate_readme({
	project_name,
	adapter,
	transports,
	include_auth,
	include_example,
	example_path,
}) {
	const adapter_name =
		adapter === 'none' ? 'No adapter' : `@tmcp/adapter-${adapter}`;
	const transport_names = transports
		.map((t) => `@tmcp/transport-${t}`)
		.join(', ');

	return `# ${project_name}

A TMCP (lightweight MCP) server built with:

- **Schema Adapter**: ${adapter_name}
- **Transports**: ${transport_names}${include_auth ? '\n- **Authentication**: OAuth 2.1 support' : ''}${include_example ? `\n- **Example**: Included at \`${example_path}\`` : ''}

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Start the server
pnpm run start

# Start with file watching
pnpm run dev
\`\`\`

## Usage

This server provides the following capabilities:

### Tools

- \`hello\` - A simple greeting tool

${
	include_example
		? `### Example Server

Run the example server:

\`\`\`bash
node ${example_path}
\`\`\`

The example demonstrates:
- ${adapter !== 'none' ? 'Schema validation with ' + adapter_name : 'Basic tool implementation'}
- STDIO transport for MCP communication
`
		: ''
}

## Architecture

This server uses the TMCP (lightweight MCP) architecture:

- **McpServer**: Core server implementation
- **Schema Adapter**: ${adapter !== 'none' ? `Validates input using ${adapter_name}` : 'No schema validation (manual handling)'}
- **Transports**: Communication layers (${transport_names})${include_auth ? '\n- **OAuth 2.1**: Authentication and authorization' : ''}

## Learn More

- [TMCP Documentation](https://github.com/paoloricciuti/tmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
`;
}

main().catch(console.error);
