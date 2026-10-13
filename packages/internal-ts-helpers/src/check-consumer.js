/**
 * Compiles code that uses the generated declarations of one or more packages
 * the way a consumer does: the packages are installed in a temporary
 * `node_modules` (only their `package.json` and `types`), so the paths look
 * like the ones of a real installation.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

/**
 * @typedef {Object} ConsumerOptions
 * @property {string[]} packages the directories of the packages to install
 * @property {Record<string, string>} files the consumer files, relative to its root
 * @property {Record<string, unknown>} [compilerOptions] as in a tsconfig.json, merged with the defaults
 */

/**
 * @typedef {Object} ConsumerResult
 * @property {string[]} diagnostics formatted as `file(line,column): TS1234: message`
 * @property {Record<string, string>} declarations the emitted declaration files, when `declaration` is enabled
 */

const DEFAULT_OPTIONS = {
	target: 'es2022',
	lib: ['es2022', 'dom'],
	module: 'nodenext',
	moduleResolution: 'nodenext',
	strict: true,
	skipLibCheck: true,
	types: [],
	noEmit: true,
};

/**
 * @param {ConsumerOptions} options
 * @returns {ConsumerResult}
 */
export function check_consumer({ packages, files, compilerOptions = {} }) {
	const root = fs.realpathSync(
		fs.mkdtempSync(path.join(os.tmpdir(), 'tmcp-consumer-')),
	);
	try {
		const node_modules = path.join(root, 'node_modules');
		/** @type {Map<string, string>} */
		const installed = new Map();
		for (const directory of packages) {
			const pkg = JSON.parse(
				fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
			);
			const target = path.join(node_modules, pkg.name);
			fs.mkdirSync(target, { recursive: true });
			fs.copyFileSync(
				path.join(directory, 'package.json'),
				path.join(target, 'package.json'),
			);
			fs.cpSync(
				path.join(directory, 'types'),
				path.join(target, 'types'),
				{
					recursive: true,
				},
			);
			installed.set(pkg.name, directory);
		}
		// the dependencies of the packages, from their own node_modules
		for (const directory of installed.values()) {
			const pkg = JSON.parse(
				fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
			);
			for (const name of Object.keys({
				...pkg.dependencies,
				...pkg.peerDependencies,
			})) {
				const target = path.join(node_modules, name);
				const source = path.join(directory, 'node_modules', name);
				if (fs.existsSync(target) || !fs.existsSync(source)) continue;
				fs.mkdirSync(path.dirname(target), { recursive: true });
				fs.symlinkSync(fs.realpathSync(source), target, 'dir');
			}
		}

		// TypeScript looks at the dependencies of the consumer to decide how
		// to reference the packages in the emitted declarations
		fs.writeFileSync(
			path.join(root, 'package.json'),
			JSON.stringify({
				name: 'consumer',
				private: true,
				type: 'module',
				dependencies: Object.fromEntries(
					[...installed.keys()].map((name) => [name, '*']),
				),
			}),
		);

		const root_names = Object.entries(files).map(([name, content]) => {
			const file = path.join(root, name);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, content);
			return file;
		});
		const { options, errors } = ts.convertCompilerOptionsFromJson(
			{ ...DEFAULT_OPTIONS, ...compilerOptions },
			root,
		);
		if (errors.length > 0) {
			throw new Error(
				errors
					.map((error) =>
						ts.flattenDiagnosticMessageText(
							error.messageText,
							'\n',
						),
					)
					.join('\n'),
			);
		}
		if (options.declaration) {
			options.noEmit = false;
			options.emitDeclarationOnly = true;
			options.outDir = path.join(root, 'out');
		}
		const program = ts.createProgram(root_names, options);
		/** @type {Record<string, string>} */
		const declarations = {};
		const emit = options.declaration
			? program.emit(undefined, (file, text) => {
					declarations[path.relative(options.outDir ?? root, file)] =
						text;
				})
			: undefined;
		const diagnostics = [
			...ts.getPreEmitDiagnostics(program),
			...(emit?.diagnostics ?? []),
		].map((diagnostic) => {
			const message = ts.flattenDiagnosticMessageText(
				diagnostic.messageText,
				'\n',
			);
			if (!diagnostic.file || diagnostic.start === undefined) {
				return `TS${diagnostic.code}: ${message}`;
			}
			const { line, character } =
				diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			return `${path.relative(root, diagnostic.file.fileName)}(${line + 1},${character + 1}): TS${diagnostic.code}: ${message}`;
		});
		return { diagnostics: [...new Set(diagnostics)], declarations };
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}
