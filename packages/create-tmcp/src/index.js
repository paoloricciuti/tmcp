#!/usr/bin/env node

import * as p from '@clack/prompts';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

const execAsync = promisify(exec);

/**
 * Read a template file and replace placeholders
 * @param {string} template_name - The name of the template file
 * @param {Record<string, string>} replacements - Object mapping placeholders to values
 */
async function read_template(template_name, replacements = {}) {
	const template_path = join(TEMPLATES_DIR, template_name);
	const template_content = await readFile(template_path, 'utf8');

	let result = template_content;
	for (const [placeholder, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
	}

	return result;
}

/**
 * Fetch the latest version of a package from npm
 * @param {string} package_name - The name of the package
 */
async function get_latest_version(package_name) {
	try {
		const { stdout } = await execAsync(`npm view ${package_name} version`, {
			encoding: 'utf8',
			timeout: 5000,
		});
		return `^${stdout.trim()}`;
	} catch {
		// Fallback versions if npm view fails
		const fallback_versions = {
			tmcp: '^1.9.0',
			'@tmcp/adapter-valibot': '^0.2.0',
			'@tmcp/adapter-zod': '^0.2.0',
			'@tmcp/adapter-zod-v3': '^0.2.0',
			'@tmcp/adapter-arktype': '^0.2.0',
			'@tmcp/adapter-effect': '^0.2.0',
			'@tmcp/transport-stdio': '^0.1.0',
			'@tmcp/transport-http': '^0.1.0',
			'@tmcp/transport-sse': '^0.1.0',
			'@tmcp/auth': '^0.3.0',
			valibot: '^1.1.0',
			zod: '^4.0.0',
			arktype: '^2.0.0',
			effect: '^3.0.0',
			srvx: '^0.8.0',
		};
		return (
			fallback_versions[/** @type {never} */ (package_name)] || '^1.0.0'
		);
	}
}

/**
 * Batch fetch versions for multiple packages
 * @param {string[]} package_names - Array of package names
 * @returns {Promise<Record<string, string>>} - Object mapping package names to versions
 */
async function get_versions_batch(package_names) {
	const results = await Promise.allSettled(
		package_names.map(async (pkg) => [pkg, await get_latest_version(pkg)]),
	);
	/**
	 * @type {Record<string, string>} - Object mapping package names to versions
	 */
	const versions = {};
	for (const result of results) {
		if (result.status === 'fulfilled') {
			const [pkg, version] = result.value;
			versions[pkg] = version;
		}
	}
	return versions;
}

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
		const files = await readdir(project_path);
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
		await mkdir(project_path, { recursive: true });
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

	// Ask about dependency installation
	const install_dependencies = await p.confirm({
		message: 'Would you like to automatically install dependencies?',
		initialValue: true,
	});

	if (p.isCancel(install_dependencies)) {
		p.cancel('Operation cancelled');
		return process.exit(0);
	}

	let package_manager = 'pnpm';
	if (install_dependencies) {
		const package_manager_res = await p.select({
			message: 'Which package manager would you like to use?',
			options: [
				{
					value: 'pnpm',
					label: 'pnpm (Recommended)',
					hint: 'Fast, disk space efficient',
				},
				{
					value: 'npm',
					label: 'npm',
					hint: 'Node.js default package manager',
				},
			],
		});

		if (p.isCancel(package_manager_res)) {
			p.cancel('Operation cancelled');
			return process.exit(0);
		}
		package_manager = package_manager_res;
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
			install_dependencies,
			package_manager,
		});

		spinner.stop('Project created successfully!');

		const next_steps = [`cd ${target_dir}`];
		if (!install_dependencies) {
			next_steps.push(`${package_manager} install`);
		}
		next_steps.push(`${package_manager} run dev`);

		p.note(next_steps.join('\n'), 'Next steps:');

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
 * @param {boolean} options.install_dependencies
 * @param {string} options.package_manager
 */
async function generate_project({
	project_path,
	project_name,
	adapter,
	transports,
	include_auth,
	include_example,
	example_path,
	install_dependencies,
	package_manager,
}) {
	// Create src directory
	const src_dir = join(project_path, 'src');
	if (!existsSync(src_dir)) {
		await mkdir(src_dir, { recursive: true });
	}

	// Generate or update package.json
	const package_json_path = join(project_path, 'package.json');
	const package_json = await generate_package_json({
		project_name,
		adapter,
		transports,
		include_auth,
		include_example,
		existing_package_path: package_json_path,
	});
	await writeFile(
		package_json_path,
		JSON.stringify(package_json, null, '\t'),
	);

	// Generate example if requested
	if (include_example) {
		const example_content = await generate_example_js({
			adapter,
			transports,
			include_auth,
		});
		const example_file_path = join(project_path, example_path);
		const example_dir = join(example_file_path, '..');
		if (!existsSync(example_dir)) {
			await mkdir(example_dir, { recursive: true });
		}
		await writeFile(example_file_path, example_content);

		// Generate auth provider if requested
		if (include_auth) {
			const auth_provider_content = await generate_auth_provider(transports);
			const auth_provider_path = join(
				project_path,
				'src/auth-provider.js',
			);
			await writeFile(auth_provider_path, auth_provider_content);
		}
	}

	// Generate README.md only if project is not already initialized
	const readme_path = join(project_path, 'README.md');
	if (!existsSync(readme_path)) {
		const readme_content = await generate_readme({
			project_name,
			adapter,
			transports,
			include_auth,
			include_example,
			example_path,
		});
		await writeFile(readme_path, readme_content);
	}

	// Install dependencies if requested
	if (install_dependencies) {
		try {
			const install_command =
				package_manager === 'pnpm' ? 'pnpm install' : 'npm install';
			await execAsync(install_command, { cwd: project_path });
		} catch {
			throw new Error(
				`Failed to install dependencies. Please run "${package_manager} install" manually.`,
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
 * @param {boolean} options.include_example
 * @param {string} options.existing_package_path
 */
async function generate_package_json({
	project_name,
	adapter,
	transports,
	include_auth,
	include_example,
	existing_package_path,
}) {
	// Check if package.json exists and merge dependencies
	/**
	 * @type {Record<string, any>}
	 */
	let existing_package = {};
	if (existsSync(existing_package_path)) {
		try {
			const content = await readFile(existing_package_path, 'utf8');
			existing_package = JSON.parse(content);
		} catch {
			// If we can't parse the existing package.json, we'll create a new one
			console.warn(
				'Warning: Could not parse existing package.json, creating new one',
			);
		}
	}
	// Collect all packages we need to fetch versions for
	const packages_to_fetch = ['tmcp'];

	// Add adapter dependencies
	if (adapter !== 'none') {
		packages_to_fetch.push(`@tmcp/adapter-${adapter}`);

		switch (adapter) {
			case 'valibot':
				packages_to_fetch.push('valibot');
				break;
			case 'zod':
				packages_to_fetch.push('zod');
				break;
			case 'zod-v3':
				// Don't fetch zod version for v3, we'll force it
				break;
			case 'arktype':
				packages_to_fetch.push('arktype');
				break;
			case 'effect':
				packages_to_fetch.push('effect');
				break;
		}
	}

	// Add transport dependencies
	for (const transport of transports) {
		packages_to_fetch.push(`@tmcp/transport-${transport}`);
	}

	// Add auth dependency
	if (include_auth) {
		packages_to_fetch.push('@tmcp/auth');
	}

	// Add srvx dependency if HTTP/SSE transports are selected and example is included
	if (
		include_example &&
		(transports.includes('http') || transports.includes('sse'))
	) {
		packages_to_fetch.push('srvx');
	}

	// Batch fetch all versions
	const versions = await get_versions_batch(packages_to_fetch);

	/**
	 * @type {Record<string, string>}
	 */
	const new_dependencies = {
		tmcp: versions.tmcp,
	};

	// Add adapter dependencies
	if (adapter !== 'none') {
		new_dependencies[`@tmcp/adapter-${adapter}`] =
			versions[`@tmcp/adapter-${adapter}`];

		switch (adapter) {
			case 'valibot':
				new_dependencies.valibot = versions.valibot;
				break;
			case 'zod':
				new_dependencies.zod = versions.zod;
				break;
			case 'zod-v3':
				new_dependencies.zod = '^3.23.8'; // Force v3 for zod-v3 adapter
				break;
			case 'arktype':
				new_dependencies.arktype = versions.arktype;
				break;
			case 'effect':
				new_dependencies.effect = versions.effect;
				break;
		}
	}

	// Add transport dependencies
	for (const transport of transports) {
		new_dependencies[`@tmcp/transport-${transport}`] =
			versions[`@tmcp/transport-${transport}`];
	}

	// Add auth dependency
	if (include_auth) {
		new_dependencies['@tmcp/auth'] = versions['@tmcp/auth'];
	}

	// Add srvx dependency if HTTP/SSE transports are selected and example is included
	if (
		include_example &&
		(transports.includes('http') || transports.includes('sse'))
	) {
		new_dependencies.srvx = versions.srvx;
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
 * Generate auth provider content using template
 * @param {string[]} transports
 */
async function generate_auth_provider(transports) {
	const bearer_paths = [];
	
	if (transports.includes('http')) {
		bearer_paths.push('\n\t\t\tPOST: [\'/mcp\'],');
	}
	if (transports.includes('sse')) {
		bearer_paths.push('\n\t\t\tGET: [\'/sse\'],');
	}
	
	const bearer_paths_string = `{${bearer_paths.join('')}\n\t\t}`;
	
	return await read_template('auth-provider.js', {
		BEARER_PATHS: bearer_paths_string,
	});
}

/**
 * Generate example server content using templates
 * @param {Object} options
 * @param {string} options.adapter - The selected schema adapter
 * @param {string[]} options.transports - The selected transports
 * @param {boolean} options.include_auth - Whether to include auth
 */
async function generate_example_js({ adapter, transports, include_auth }) {
	const imports = ["import { McpServer } from 'tmcp';"];

	// Add adapter imports and setup
	let adapter_setup = '';
	let example_tool_content = '';

	if (adapter !== 'none') {
		const adapter_class_map = {
			valibot: 'ValibotJsonSchemaAdapter',
			zod: 'ZodJsonSchemaAdapter',
			'zod-v3': 'ZodV3JsonSchemaAdapter',
			arktype: 'ArktypeJsonSchemaAdapter',
			effect: 'EffectJsonSchemaAdapter',
		};

		const schema_imports = {
			valibot: "import * as v from 'valibot';",
			zod: "import { z } from 'zod';",
			'zod-v3': "import { z } from 'zod';",
			arktype: "import { type } from 'arktype';",
			effect: "import * as S from 'effect/Schema';",
		};

		const adapter_class = adapter_class_map[/** @type {never} */ (adapter)];
		imports.push(
			`import { ${adapter_class} } from '@tmcp/adapter-${adapter}';`,
		);
		imports.push(schema_imports[/** @type {never} */ (adapter)]);

		adapter_setup = `,
	{
		adapter: new ${adapter_class}(),
		capabilities: {
			tools: { listChanged: true },
		},
	}`;

		// Read schema template and tool template
		const schema_content = await read_template(`schema-${adapter}.js`);
		const tool_content = await read_template('tool.js');
		example_tool_content = `${schema_content}\n\n${tool_content}`;
	} else {
		// No schema case
		example_tool_content = await read_template('tool-no-schema.js');
	}

	// Add transport imports
	const transport_imports = [];
	if (transports.includes('stdio')) {
		transport_imports.push(
			"import { StdioTransport } from '@tmcp/transport-stdio';",
		);
	}
	if (transports.includes('http')) {
		transport_imports.push(
			"import { HttpTransport } from '@tmcp/transport-http';",
		);
	}
	if (transports.includes('sse')) {
		transport_imports.push(
			"import { SseTransport } from '@tmcp/transport-sse';",
		);
	}

	// Setup HTTP/SSE transports
	let http_transports_setup = '';
	let server_setup = '';

	if (transports.includes('http') || transports.includes('sse')) {
		imports.push(`import { serve } from 'srvx';`);

		if (include_auth) {
			imports.push(`import { oauth } from './auth-provider.js';`);
		}

		const http_exports = [];
		const http_responses = [];

		if (transports.includes('http')) {
			http_exports.push(
				`export const http_transport = new HttpTransport(server${
					include_auth ? `, {\n\toauth\n}` : ''
				});`,
			);
			http_responses.push(
				`\t\tconst http_response = await http_transport.respond(request);\n\t\tif (http_response) {\n\t\t\treturn http_response;\n\t\t}`,
			);
		}

		if (transports.includes('sse')) {
			http_exports.push(
				`export const sse_transport = new SseTransport(server${
					include_auth ? `, {\n\toauth\n}` : ''
				});`,
			);
			http_responses.push(
				`\t\tconst sse_response = await sse_transport.respond(request);\n\t\tif (sse_response) {\n\t\t\treturn sse_response;\n\t\t}`,
			);
		}

		http_transports_setup = '\n' + http_exports.join('\n');
		server_setup = `\nserve({\n\tasync fetch(request) {\n${http_responses.join('\n\n')}\n\t\treturn new Response(null, { status: 404 });\n\t}\n});\n`;
	}

	// STDIO setup
	let stdio_setup = '';
	if (transports.includes('stdio')) {
		stdio_setup =
			'\n\nconst stdio_transport = new StdioTransport(server);\nstdio_transport.listen();';
	}

	// Use main server template
	return await read_template('server.js', {
		IMPORTS: [...imports, ...transport_imports].join('\n'),
		ADAPTER_SETUP: adapter_setup,
		EXAMPLE_TOOL: example_tool_content,
		HTTP_TRANSPORTS_SETUP: http_transports_setup,
		SERVER_SETUP: server_setup,
		STDIO_SETUP: stdio_setup,
	});
}

/**
 * Generate README.md content using template
 * @param {Object} options
 * @param {string} options.project_name
 * @param {string} options.adapter
 * @param {string[]} options.transports
 * @param {boolean} options.include_auth
 * @param {boolean} options.include_example
 * @param {string} options.example_path
 */
async function generate_readme({
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

	const auth_line = include_auth ? '\n- **Authentication**: OAuth 2.1 support' : '';
	const example_line = include_example ? `\n- **Example**: Included at \`${example_path}\`` : '';
	
	const adapter_description = adapter !== 'none' 
		? `Validates input using ${adapter_name}` 
		: 'No schema validation (manual handling)';
	
	const auth_architecture = include_auth ? '\n- **OAuth 2.1**: Authentication and authorization' : '';
	
	let example_section = '';
	if (include_example) {
		example_section = `### Example Server

Run the example server:

\`\`\`bash
node ${example_path}
\`\`\`

The example demonstrates:
- ${adapter !== 'none' ? 'Schema validation with ' + adapter_name : 'Basic tool implementation'}
- STDIO transport for MCP communication

`;
	}

	return await read_template('README.md', {
		PROJECT_NAME: project_name,
		ADAPTER_NAME: adapter_name,
		TRANSPORT_NAMES: transport_names,
		AUTH_LINE: auth_line,
		EXAMPLE_LINE: example_line,
		EXAMPLE_SECTION: example_section,
		ADAPTER_DESCRIPTION: adapter_description,
		AUTH_ARCHITECTURE: auth_architecture,
	});
}

main().catch(console.error);
