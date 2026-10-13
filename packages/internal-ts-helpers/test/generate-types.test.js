import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
	GenerateTypesError,
	clean_jsdoc,
	generate_types,
} from '../src/generate-types.js';

const ROOT_BUILD_CONFIG = fileURLToPath(
	new URL('../../../tsconfig.build.json', import.meta.url),
);
const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const PACKAGE_TSCONFIG = {
	compilerOptions: {
		target: 'esnext',
		module: 'nodenext',
		moduleResolution: 'nodenext',
		allowJs: true,
		checkJs: true,
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		types: [],
	},
	include: ['src/**/*'],
};

/** @type {string[]} */
const temp_dirs = [];

afterEach(() => {
	for (const dir of temp_dirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

/**
 * Create a package with the given files inside a directory that contains the
 * repo `tsconfig.build.json`.
 * @param {Record<string, string>} files paths relative to the package
 * @param {(config: any) => any} [edit_build_config] to change the `tsconfig.build.json`
 */
function create_package(files, edit_build_config = (config) => config) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-types-'));
	temp_dirs.push(root);
	fs.writeFileSync(
		path.join(root, 'tsconfig.build.json'),
		JSON.stringify(
			edit_build_config(
				JSON.parse(fs.readFileSync(ROOT_BUILD_CONFIG, 'utf8')),
			),
		),
	);
	const cwd = path.join(root, 'pkg');
	for (const [file, content] of Object.entries({
		'tsconfig.json': JSON.stringify(PACKAGE_TSCONFIG),
		...files,
	})) {
		fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
		fs.writeFileSync(path.join(cwd, file), content);
	}
	return cwd;
}

/**
 * Generate the types of a package made of `files` and return the output.
 * @param {Record<string, string>} files
 */
function generate(files) {
	const cwd = create_package(files);
	const { files: generated } = generate_types(cwd);
	/** @param {string} file */
	const read = (file) =>
		fs.readFileSync(path.join(cwd, 'types', file), 'utf8');
	return { cwd, generated, read };
}

/**
 * Like `generate` but expects it to fail.
 * @param {Record<string, string>} files
 */
function generate_error(files) {
	const cwd = create_package(files);
	try {
		generate_types(cwd);
	} catch (error) {
		if (error instanceof GenerateTypesError) return error;
		throw error;
	}
	throw new Error('Expected generate_types to throw');
}

/**
 * The output without JSDoc comments and the source map comment, to keep the
 * assertions focused on the declarations.
 * @param {string} dts
 */
function declarations(dts) {
	return dts
		.replace(/^[ \t]*\/\*\*[\s\S]*?\*\/[ \t]*\n?/gm, '')
		.replace(/^\/\/# sourceMappingURL=.*$/m, '')
		.replace(/^\s*\n/gm, '')
		.trim();
}

describe('output', () => {
	it('emits declarations and declaration maps to `types`', () => {
		const { generated, read } = generate({
			'src/index.js': `export { add } from './math/add.js';`,
			'src/math/add.js': [
				'/**',
				' * @param {number} a',
				' * @param {number} b',
				' */',
				'export function add(a, b) {',
				'	return a + b;',
				'}',
			].join('\n'),
		});
		expect(generated).toEqual([
			'index.d.ts',
			'index.d.ts.map',
			'math/add.d.ts',
			'math/add.d.ts.map',
		]);
		expect(declarations(read('math/add.d.ts'))).toBe(
			'export function add(a: number, b: number): number;',
		);
		expect(read('math/add.d.ts')).toContain(
			'//# sourceMappingURL=add.d.ts.map',
		);
		expect(JSON.parse(read('math/add.d.ts.map')).sources).toEqual([
			'../../src/math/add.js',
		]);
	});

	it('removes stale files from a previous run', () => {
		const cwd = create_package({
			'src/index.js': 'export const a = 1;',
			'types/removed.d.ts': 'export const removed: 1;',
		});
		const { files } = generate_types(cwd);
		expect(files).toEqual(['index.d.ts', 'index.d.ts.map']);
		expect(fs.existsSync(path.join(cwd, 'types/removed.d.ts'))).toBe(false);
	});

	it('supports .mjs and .cjs sources across runs', () => {
		const cwd = create_package({
			'src/index.js': 'export const a = 1;',
			'src/esm.mjs': 'export const b = 1;',
			'src/cjs.cjs': 'module.exports.c = 1;',
		});
		const expected = [
			'cjs.d.cts',
			'cjs.d.cts.map',
			'esm.d.mts',
			'esm.d.mts.map',
			'index.d.ts',
			'index.d.ts.map',
		];
		expect(generate_types(cwd).files).toEqual(expected);
		// the previous output is recognized as generated
		expect(generate_types(cwd).files).toEqual(expected);
	});

	it("doesn't write a build info file with an incremental configuration", () => {
		const cwd = create_package(
			{ 'src/index.js': 'export const a = 1;' },
			(config) => ({
				...config,
				compilerOptions: {
					...config.compilerOptions,
					incremental: true,
					tsBuildInfoFile: '${configDir}/types/build.tsbuildinfo',
				},
			}),
		);
		expect(generate_types(cwd).files).toEqual([
			'index.d.ts',
			'index.d.ts.map',
		]);
		expect(generate_types(cwd).files).toEqual([
			'index.d.ts',
			'index.d.ts.map',
		]);
	});

	it('copies hand-written declaration files', () => {
		const { generated, read } = generate({
			'src/internal/types.d.ts': 'export type Id = string | number;',
			'src/index.js': [
				'/** @import { Id } from "./internal/types.js" */',
				'/** @param {Id} id */',
				'export function get(id) {',
				'	return id;',
				'}',
			].join('\n'),
		});
		expect(generated).toContain('internal/types.d.ts');
		expect(read('internal/types.d.ts')).toBe(
			'export type Id = string | number;',
		);
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export function get(id: Id): Id;',
				'import type { Id } from "./internal/types.js";',
			].join('\n'),
		);
	});

	it('uses the compiler options of the package tsconfig.json', () => {
		const { read } = generate({
			'tsconfig.json': JSON.stringify({
				...PACKAGE_TSCONFIG,
				compilerOptions: {
					...PACKAGE_TSCONFIG.compilerOptions,
					strict: false,
				},
			}),
			'src/index.js': [
				'/** @param {string} [name] */',
				'export function greet(name) {',
				'	return name;',
				'}',
			].join('\n'),
		});
		// without `strictNullChecks` optional parameters don't include `undefined`
		expect(declarations(read('index.d.ts'))).toBe(
			'export function greet(name?: string): string;',
		);
	});
});

describe('errors', () => {
	it('fails without a tsconfig.build.json in a parent directory', () => {
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-types-'));
		temp_dirs.push(cwd);
		expect(() => generate_types(cwd)).toThrow(
			'Could not find a tsconfig.build.json file',
		);
	});

	it.each([
		['the same as rootDir', '${configDir}/src'],
		['inside rootDir', '${configDir}/src/types'],
		['containing rootDir', '${configDir}'],
		['outside the package', '${configDir}/../types'],
	])('refuses an outDir %s without deleting anything', (_, out_dir) => {
		const cwd = create_package(
			{ 'src/index.js': 'export const a = 1;' },
			(config) => ({
				...config,
				compilerOptions: { ...config.compilerOptions, outDir: out_dir },
			}),
		);
		expect(() => generate_types(cwd)).toThrow(
			/"outDir" .* must be a directory inside the package that doesn't overlap with "rootDir"/,
		);
		expect(fs.readFileSync(path.join(cwd, 'src/index.js'), 'utf8')).toBe(
			'export const a = 1;',
		);
		expect(fs.existsSync(path.join(cwd, 'tsconfig.json'))).toBe(true);
	});

	it('refuses to delete an outDir with files that were not generated', () => {
		const cwd = create_package(
			{
				'src/index.js': 'export const a = 1;',
				'node_modules/dep/index.js': 'export {};',
			},
			(config) => ({
				...config,
				compilerOptions: {
					...config.compilerOptions,
					outDir: '${configDir}/node_modules',
				},
			}),
		);
		expect(() => generate_types(cwd)).toThrow(
			/contains files that were not generated .*index\.js.*: refusing to delete it/,
		);
		expect(fs.existsSync(path.join(cwd, 'node_modules/dep/index.js'))).toBe(
			true,
		);
	});

	it('refuses an outDir reached through a symlink to outside the package', () => {
		const outside = fs.mkdtempSync(
			path.join(os.tmpdir(), 'generate-types-'),
		);
		temp_dirs.push(outside);
		fs.writeFileSync(path.join(outside, 'kept.d.ts'), 'export {};');
		const cwd = create_package(
			{ 'src/index.js': 'export const a = 1;' },
			(config) => ({
				...config,
				compilerOptions: {
					...config.compilerOptions,
					outDir: '${configDir}/link',
				},
			}),
		);
		fs.symlinkSync(outside, path.join(cwd, 'link'));
		expect(() => generate_types(cwd)).toThrow(/must be a directory inside/);
		expect(fs.existsSync(path.join(outside, 'kept.d.ts'))).toBe(true);
	});

	it('refuses an outDir that is rootDir with a different case on case-insensitive file systems', (ctx) => {
		const cwd = create_package(
			{ 'src/index.js': 'export const a = 1;' },
			(config) => ({
				...config,
				compilerOptions: {
					...config.compilerOptions,
					outDir: '${configDir}/SRC',
				},
			}),
		);
		if (!fs.existsSync(path.join(cwd, 'SRC'))) ctx.skip();
		expect(() => generate_types(cwd)).toThrow(/must be a directory inside/);
		expect(fs.existsSync(path.join(cwd, 'src/index.js'))).toBe(true);
	});

	it('fails on type errors in the sources', () => {
		const error = generate_error({
			'src/index.js': '/** @type {string} */\nexport const a = 1;',
		});
		expect(error.message).toBe('The sources contain type errors.');
		expect(error.diagnostics.map((d) => d.code)).toEqual([2322]);
	});

	it('checks the declarations generated from .mjs files', () => {
		const error = generate_error({
			'src/index.mjs': `
/**
 * @internal
 * @typedef {{ secret: true }} Hidden
 */

/** @returns {Hidden} */
export function visible() {
	return { secret: true };
}`,
		});
		expect(error.message).toBe(
			'The generated declarations contain type errors.',
		);
		expect(error.diagnostics[0].file?.fileName).toMatch(/index\.d\.mts$/);
	});

	it('fails when a declaration references a module by its absolute path', () => {
		const error = generate_error({
			'src/base.js': `
/** @typedef {{ kind: 'base' }} Value */

/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @param {Value} value
	 * @returns {void}
	 */
	use(value) {}
}`,
			// a local type with the same name makes the checker print the type
			// of the base with its absolute path
			'src/index.js': `
import { Base } from './base.js';

/** @typedef {{ kind: 'local' }} Value */

export class Impl extends Base {
	/** @type {Base['use']} */
	use(value) {}
}`,
		});
		expect(error.message).toMatch(
			/^types\/index\.d\.ts references a module by its absolute path \(.*\/src\/base\), which doesn't exist for the consumers of the package$/,
		);
	});

	it.each(
		/** @type {Array<[string, (file: string) => string]>} */ ([
			[
				'an export',
				(file) => `export type { A } from ${JSON.stringify(file)};`,
			],
			[
				'an export with a comment before the specifier',
				(file) =>
					`export type { A } from /* comment */ ${JSON.stringify(file)};`,
			],
			[
				'an escaped specifier',
				(file) =>
					`export type { A } from "${file.replace('/', '\\u002f')}";`,
			],
			[
				'an import type',
				(file) => `export type B = import(${JSON.stringify(file)}).A;`,
			],
			[
				'a side effect import',
				(file) => `import ${JSON.stringify(file)};`,
			],
			[
				'a reference directive',
				(file) =>
					`/// <reference path=${JSON.stringify(file)} />\nexport {};`,
			],
		]),
	)('fails on absolute references in %s', (_, declaration) => {
		const outside = fs.mkdtempSync(
			path.join(os.tmpdir(), 'generate-types-'),
		);
		temp_dirs.push(outside);
		const file = path.join(outside, 'types.d.ts');
		fs.writeFileSync(file, 'export type A = 1;');
		const error = generate_error({
			'src/index.js': 'export const a = 1;',
			'src/public.d.ts': declaration(file),
		});
		expect(error.message).toBe(
			`types/public.d.ts references a module by its absolute path (${file}), which doesn't exist for the consumers of the package`,
		);
	});

	it("doesn't mistake comments and strings for absolute references", () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @example
 * import { value } from "/example.js";
 */
export function f() {
	return 1;
}`,
			'src/snippet.d.ts':
				'export type Snippet = `import { x } from "/example.js"`;',
		});
		expect(read('index.d.ts')).toContain(
			' * import { value } from "/example.js";',
		);
	});

	it('fails on type errors in the generated declarations', () => {
		// with `skipLibCheck` the hand-written file is not checked with the sources
		const error = generate_error({
			'src/types.d.ts': 'export type Broken = DoesNotExist;',
			'src/index.js': [
				'/** @import { Broken } from "./types.js" */',
				'/** @type {Broken} */',
				'export const a = 1;',
			].join('\n'),
		});
		expect(error.message).toBe(
			'The generated declarations contain type errors.',
		);
		expect(error.diagnostics.map((d) => d.code)).toEqual([2304]);
		expect(error.diagnostics[0].file?.fileName).toMatch(
			/\/types\/types\.d\.ts$/,
		);
	});
});

describe('@abstract', () => {
	it('adds the abstract modifier to classes and members', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @readonly
	 * @type {string}
	 */
	kind = '';

	/**
	 * @abstract
	 * @param {string} id
	 * @returns {Promise<void>}
	 */
	load(id) {
		throw new Error(\`not implemented \${id}\`);
	}

	/** @returns {number} */
	size() {
		return 1;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export abstract class Base {',
				'    abstract readonly kind: string;',
				'    abstract load(id: string): Promise<void>;',
				'    size(): number;',
				'}',
			].join('\n'),
		);
	});

	it('restores the methods of a subclass that implement an abstract method', () => {
		// tsc doesn't emit `load` since its type is the same as the base one
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @param {string} id
	 * @returns {Promise<string>}
	 */
	load(id) {
		throw new Error(\`not implemented \${id}\`);
	}
}

export class Impl extends Base {
	/** @type {Base['load']} */
	load(id) {
		return Promise.resolve(id);
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export abstract class Base {',
				'    abstract load(id: string): Promise<string>;',
				'}',
				'export class Impl extends Base {',
				'    load(id: string): Promise<string>;',
				'}',
			].join('\n'),
		);
	});

	it('restores the methods before the private members', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	count() {
		throw new Error('not implemented');
	}
}

export class Impl extends Base {
	#count = 0;

	/** @type {Base['count']} */
	count() {
		return this.#count;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			[
				'export class Impl extends Base {',
				'    count(): number;',
				'    #private;',
				'}',
			].join('\n'),
		);
	});

	it('restores fields, accessors and string named members of anonymous classes', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @type {number}
	 */
	count = 0;

	/**
	 * @abstract
	 * @readonly
	 * @type {string}
	 */
	kind = '';

	/**
	 * @abstract
	 * @returns {string}
	 */
	get label() {
		return '';
	}

	/**
	 * @abstract
	 * @param {string} value
	 */
	set label(value) {}

	/**
	 * @abstract
	 * @returns {number}
	 */
	['with-dash']() {
		return 1;
	}
}

export default class extends Base {
	count = 1;

	/** @readonly */
	kind = 'impl';

	get label() {
		return 'impl';
	}

	/** @param {string} value */
	set label(value) {}

	['with-dash']() {
		return 2;
	}
}`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain(
			'export default class _default extends Base {',
		);
		for (const member of [
			'    count: number;',
			'    readonly kind: "impl";',
			'    get label(): string;',
			'    set label(value: string);',
			'    "with-dash"(): number;',
		]) {
			expect(output).toContain(member);
		}
	});

	it('keeps the visibility of the restored members', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @protected
	 * @returns {number}
	 */
	count() {
		return 0;
	}
}

export class Impl extends Base {
	/**
	 * @protected
	 * @type {Base['count']}
	 */
	count() {
		return 1;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class Impl extends Base {\n    protected count(): number;\n}',
		);
	});

	it("doesn't restore an @internal implementation of an abstract member", () => {
		const error = generate_error({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	count() {
		return 0;
	}
}

export class Impl extends Base {
	/**
	 * @internal
	 * @type {Base['count']}
	 */
	count() {
		return 1;
	}
}`,
		});
		expect(error.message).toBe(
			'The generated declarations contain type errors.',
		);
		expect(error.diagnostics.map((d) => d.code)).toEqual([2515]);
	});

	it('applies @abstract to overloaded methods', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @overload
	 * @param {string} value
	 * @returns {string}
	 */
	/**
	 * @overload
	 * @param {number} value
	 * @returns {number}
	 */
	/**
	 * @abstract
	 * @param {string | number} value
	 * @returns {string | number}
	 */
	convert(value) {
		return value;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export abstract class Base {',
				'    abstract convert(value: string): string;',
				'    abstract convert(value: number): number;',
				'}',
			].join('\n'),
		);
	});

	it('keeps @abstract on restored members', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @type {number}
	 */
	count = 0;
}

/** @abstract */
export class Middle extends Base {
	/**
	 * @abstract
	 * @type {number}
	 */
	count = 1;
}

export class Impl extends Middle {
	count = 2;
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export abstract class Middle extends Base {\n    abstract count: number;\n}',
		);
	});

	it("doesn't add readonly to restored getters", () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	get count() {
		return 0;
	}
}

export class Impl extends Base {
	/**
	 * @readonly
	 * @returns {number}
	 */
	get count() {
		return 1;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class Impl extends Base {\n    get count(): number;\n}',
		);
	});

	it('maps restored members and keeps their comment', () => {
		const source = `/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	count() {
		return 0;
	}
}

export class Impl extends Base {
	/**
	 * Count the things.
	 * @type {Base['count']}
	 */
	count() {
		return 1;
	}
}`;
		const { read } = generate({ 'src/index.js': source });
		const dts = read('index.d.ts');
		expect(declarations(dts)).toContain('    count(): number;\n}');
		expect(dts).toContain(
			'    /**\n     * Count the things.\n     */\n    count(): number;\n}',
		);
		const lines = dts.split('\n');
		const restored_line = lines.findLastIndex(
			(line) => line === '    count(): number;',
		);
		const mappings = decode_mappings(
			JSON.parse(read('index.d.ts.map')).mappings,
		);
		expect(
			source.split('\n')[mappings[restored_line]?.[0]?.source_line ?? -1],
		).toBe('\tcount() {');
		// it's the implementation, not the abstract method in the base
		expect(mappings[restored_line]?.[0]?.source_line).toBeGreaterThan(10);
	});

	it('restores an instance member with a static member of the same name', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	m() {
		return 0;
	}
}

export class Impl extends Base {
	/** @returns {number} */
	static m() {
		return 1;
	}

	/** @type {Base['m']} */
	m() {
		return 2;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class Impl extends Base {\n    static m(): number;\n    m(): number;\n}',
		);
	});

	it('gives each restored overload its own comment', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @overload
	 * @param {string} value
	 * @returns {string}
	 */
	/**
	 * @overload
	 * @param {number} value
	 * @returns {number}
	 */
	/**
	 * @abstract
	 * @param {string | number} value
	 * @returns {string | number}
	 */
	convert(value) {
		return value;
	}
}

export class Impl extends Base {
	/**
	 * Convert a string.
	 * @overload
	 * @param {string} value
	 * @returns {string}
	 */
	/**
	 * Convert a number.
	 * @overload
	 * @param {number} value
	 * @returns {number}
	 */
	/**
	 * @param {string | number} value
	 * @returns {string | number}
	 */
	convert(value) {
		return value;
	}
}`,
		});
		const output = read('index.d.ts');
		expect(output.slice(output.indexOf('export class Impl'))).toBe(
			[
				'export class Impl extends Base {',
				'    /**',
				'     * Convert a string.',
				'     */',
				'    convert(value: string): string;',
				'    /**',
				'     * Convert a number.',
				'     */',
				'    convert(value: number): number;',
				'}',
				'//# sourceMappingURL=index.d.ts.map',
			].join('\n'),
		);
	});

	it('cleans the comments of restored members once and keeps /*! comments', () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	m() {
		return 0;
	}
}

export class Impl extends Base {
	/*! keep this notice */
	/** @returns {number} {count} returned */
	m() {
		return 2;
	}
}`,
		});
		const output = read('index.d.ts');
		expect(output.slice(output.indexOf('export class Impl'))).toBe(
			[
				'export class Impl extends Base {',
				'    /*! keep this notice */',
				'    /** @returns {count} returned */',
				'    m(): number;',
				'}',
				'//# sourceMappingURL=index.d.ts.map',
			].join('\n'),
		);
	});

	it("doesn't restore methods that override a concrete method", () => {
		const { read } = generate({
			'src/index.js': `
export class Base {
	/** @returns {number} */
	count() {
		return 0;
	}
}

export class Impl extends Base {
	/** @type {Base['count']} */
	count() {
		return 1;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class Impl extends Base {\n}',
		);
	});

	it("doesn't apply the tags of a declaration referenced with @type", () => {
		const { read } = generate({
			'src/index.js': `
/** @abstract */
export class Base {
	/**
	 * @abstract
	 * @returns {number}
	 */
	count() {
		throw new Error('not implemented');
	}
}

export class Impl extends Base {
	/** @type {Base['count']} */
	count() {
		return 1;
	}

	/** @type {Base['count']} */
	other() {
		return 2;
	}
}`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain('export class Impl extends Base {');
		expect(output).toContain('    other(): number;');
		expect(output).not.toMatch(/abstract (other|class Impl)/);
	});
});

describe('@internal', () => {
	it('removes top level declarations', () => {
		const { read } = generate({
			'src/index.js': `
/** @internal */
export const secret = 1;

export const visible = 1;

/** @internal */
export function helper() {}

/** @internal */
export class Hidden {}

/**
 * @internal
 * @typedef {{ hidden: true }} HiddenType
 */

/** @typedef {{ visible: true }} VisibleType */`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export const visible: 1;',
				'export type VisibleType = {',
				'    visible: true;',
				'};',
			].join('\n'),
		);
	});

	it('ignores tags inside code blocks', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * Visible.
 * @example
 * \`\`\`js
 * @internal
 * \`\`\`
 */
export function visible() {
	return 1;
}

/**
 * @example
 * \`\`\`js
 * @abstract
 * \`\`\`
 */
export class Concrete {}

/**
 * @example
 * \`\`\`js
 * @interface
 * \`\`\`
 * @typedef {{ a: string }} NotAnInterface
 */`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain('export function visible(): number;');
		expect(output).toContain('export class Concrete {');
		expect(output).toContain('export type NotAnInterface = {');
	});

	it('ignores tags inside tilde and longer fences', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @example
 * ~~~js
 * @internal
 * ~~~
 */
export function tilde() {
	return 1;
}

/**
 * @example
 * \`\`\`\`js
 * \`\`\`
 * @internal
 * \`\`\`\`
 */
export function long_fence() {
	return 1;
}

/**
 * @example
 * \`\`\`js
 * code();
 * \`\`\`
 * @internal
 */
export function after_block() {
	return 1;
}`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain('export function tilde(): number;');
		expect(output).toContain('export function long_fence(): number;');
		expect(output).not.toContain('after_block');
	});

	it('ignores tags inside code blocks with CRLF line endings', () => {
		const { read } = generate({
			'src/index.js': [
				'/**',
				' * @example',
				' * ```js',
				' * @internal',
				' * ```',
				' */',
				'export function visible() {',
				'	return 1;',
				'}',
			].join('\r\n'),
		});
		expect(declarations(read('index.d.ts'))).toBe(
			'export function visible(): number;',
		);
	});

	it('ignores tags inside a code block opened on the line of a tag or of the comment start', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @example \`\`\`js
 * @internal
 * \`\`\`
 */
export function after_example() {
	return 1;
}

/** \`\`\`js @internal */
export function info_string() {
	return 1;
}`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain('export function after_example(): number;');
		expect(output).toContain('export function info_string(): number;');
	});

	it("doesn't treat typedefs inside code blocks as typedefs", () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @internal
 * @example
 * \`\`\`js
 * @typedef {{ x: number }} Example
 * \`\`\`
 * @typedef {{ y: number }} Secret
 */

/** @typedef {{ z: number }} Visible */
export {};`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			'export type Visible = {\n    z: number;\n};',
		);
	});

	it('removes members typed from another declaration', () => {
		const { read } = generate({
			'src/index.js': `
export class Base {
	/** @returns {number} */
	count() {
		return 0;
	}
}

export class Impl extends Base {
	/**
	 * @internal
	 * @type {Base['count']}
	 */
	secret() {
		return 1;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class Impl extends Base {\n}',
		);
	});

	it('reads the tags of the member itself when typed from another member of the same class', () => {
		const { read } = generate({
			'src/index.js': `
export class C {
	/**
	 * @internal
	 * @returns {number}
	 */
	hidden() {
		return 1;
	}

	/** @type {C['hidden']} */
	visible() {
		return 2;
	}
}`,
		});
		const output = read('index.d.ts');
		expect(declarations(output)).toBe(
			'export class C {\n    visible(): number;\n}',
		);
		expect(output).not.toContain('@internal');
	});

	it("doesn't mix up static and instance members with the same name", () => {
		const { read } = generate({
			'src/index.js': `
class Signatures {
	/** @returns {number} */
	m() {
		return 1;
	}
}

export class C {
	/**
	 * @internal
	 * @type {Signatures['m']}
	 */
	static m() {
		return 1;
	}

	/** @type {Signatures['m']} */
	m() {
		return 2;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class C {\n    m(): number;\n}',
		);
	});

	it('reads the tags of members with computed names', () => {
		const { read } = generate({
			'src/index.js': `
const key = 'hidden';
const left = Symbol('left');
const right = Symbol('right');

export class C {
	/** @internal */
	[key]() {
		return 1;
	}

	/** @internal */
	[-1]() {
		return 1;
	}

	/** @internal */
	[left]() {
		return 1;
	}

	/** @type {C[typeof left]} */
	[right]() {
		return 2;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			'export class C {\n    [right](): number;\n}',
		);
	});

	it('removes class members', () => {
		const { read } = generate({
			'src/index.js': `
export class Server {
	/** @internal */
	state = 1;

	/** @internal */
	reset() {}

	/** @returns {number} */
	start() {
		return this.state;
	}
}`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			['export class Server {', '    start(): number;', '}'].join('\n'),
		);
	});
});

describe('@interface', () => {
	it('emits an interface for an object typedef', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * A point.
 * @interface
 * @typedef {{ x: number, y: number }} Point
 */
export {};`,
		});
		const output = read('index.d.ts');
		expect(declarations(output)).toBe(
			[
				'export interface Point {',
				'    x: number;',
				'    y: number;',
				'}',
			].join('\n'),
		);
		expect(output).toContain(
			'/**\n * A point.\n */\nexport interface Point',
		);
	});

	it('supports @typedef {Object} with @property tags', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @interface
 * @typedef {Object} Options
 * @property {string} name the name
 * @property {number} [size]
 */
export {};`,
		});
		expect(declarations(read('index.d.ts'))).toBe(
			[
				'export interface Options {',
				'    name: string;',
				'    size?: number | undefined;',
				'}',
			].join('\n'),
		);
	});

	it('converts intersections to interfaces extending the referenced types', () => {
		const { read } = generate({
			'src/index.js': `
/** @typedef {{ x: number }} Point */
/** @typedef {{ name: string }} Named */

/**
 * @template T
 * @interface
 * @typedef {Point & Named & { value: T } & { label: string }} Labeled
 */
export {};`,
		});
		expect(declarations(read('index.d.ts'))).toContain(
			[
				'export interface Labeled<T> extends Point, Named {',
				'    value: T;',
				'    label: string;',
				'}',
			].join('\n'),
		);
	});

	it('applies to the typedef the tag belongs to in a comment with several typedefs', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * @typedef {{ a: string }} First
 * @interface
 * @typedef {{ b: string }} Second
 * @typedef {{ c: string }} Third
 * @interface
 */
export {};`,
		});
		const output = declarations(read('index.d.ts'));
		expect(output).toContain('export type First = {');
		expect(output).toContain('export interface Second {');
		expect(output).toContain('export interface Third {');
	});

	it("doesn't change typedefs without the tag", () => {
		const { read } = generate({
			'src/index.js': '/** @typedef {{ a: string }} A */\nexport {};',
		});
		expect(declarations(read('index.d.ts'))).toBe(
			'export type A = {\n    a: string;\n};',
		);
	});

	it('fails for types that cannot be an interface', () => {
		const error = generate_error({
			'src/index.js': `
/**
 * @interface
 * @typedef {{ a: 1 } | { b: 2 }} Union
 */
export {};`,
		});
		expect(error.message).toBe(
			'src/index.js: "@interface" on the typedef "Union" requires an object type or an intersection of object types and type references',
		);
	});
});

/**
 * Decode the `mappings` of a source map.
 * @param {string} mappings
 * @returns {Array<Array<{ column: number, source_line: number }>>} the segments of each generated line
 */
function decode_mappings(mappings) {
	const BASE64 =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let source_line = 0;
	return mappings.split(';').map((line) => {
		let column = 0;
		return line
			.split(',')
			.filter(Boolean)
			.map((segment) => {
				/** @type {number[]} */
				const values = [];
				let value = 0;
				let shift = 0;
				for (const char of segment) {
					const digit = BASE64.indexOf(char);
					value += (digit & 31) << shift;
					if (digit & 32) {
						shift += 5;
					} else {
						values.push(value & 1 ? -(value >>> 1) : value >>> 1);
						value = 0;
						shift = 0;
					}
				}
				column += values[0];
				if (values.length > 1) source_line += values[2];
				return { column, source_line };
			});
	});
}

describe('clean_jsdoc', () => {
	it('removes the types from @param and @returns', () => {
		expect(
			clean_jsdoc(`/**
	 * Add two numbers.
	 * @param {number} a the first
	 * @param {{ nested: { value: number } }} b - the second
	 * @returns {number} the sum
	 */`),
		).toBe(`*
 * Add two numbers.
 * @param a the first
 * @param b - the second
 * @returns the sum
 `);
	});

	it('removes @param and @returns without a description', () => {
		expect(
			clean_jsdoc(`/**
 * Add two numbers.
 * @param {number} a
 * @param {number} [b]
 * @returns {number}
 */`),
		).toBe('*\n * Add two numbers.\n ');
	});

	it('keeps optional parameters and multi-line descriptions', () => {
		expect(
			clean_jsdoc(`/**
 * @param {string} [name='x'] the name,
 * on more lines
 */`),
		).toBe("*\n * @param [name='x'] the name,\n * on more lines\n ");
	});

	it('removes the tags that only carry type information', () => {
		expect(
			clean_jsdoc(`/**
 * A class.
 * @template {string} T
 * @abstract
 * @augments {Base<T>}
 * @implements {Thing}
 * @type {string}
 * @satisfies {Thing}
 * @overload
 */`),
		).toBe('*\n * A class.\n ');
	});

	it('keeps the other tags', () => {
		const comment = `/**
 * Old.
 * @deprecated use \`other\`
 * @see https://example.com
 * @throws {TypeError} when it fails
 * @example
 * \`\`\`js
 * // @param inside a code block is not a tag
 * old();
 * \`\`\`
 */`;
		expect(clean_jsdoc(comment)).toBe(
			`*\n${comment.split('\n').slice(1, -1).join('\n')}\n `,
		);
	});

	it('keeps the descriptions of @template and @type', () => {
		expect(
			clean_jsdoc(`/**
 * @template {string} T - the serialized representation
 * @template U, V
 * @template [W=string]
 */`),
		).toBe('*\n * @template T - the serialized representation\n ');
		expect(clean_jsdoc('/** @type {string} the token */')).toBe(
			'* the token ',
		);
		expect(
			clean_jsdoc(
				'/**\n * A token.\n * @type {string} used to sign\n */',
			),
		).toBe('*\n * A token.\n * used to sign\n ');
	});

	it('keeps defaults containing brackets', () => {
		expect(clean_jsdoc('/** @template [T=string[]] the type */')).toBe(
			'* @template [T=string[]] the type ',
		);
		expect(
			clean_jsdoc('/** @template T, [U=Array<[1, 2]>] the types */'),
		).toBe('* @template T, [U=Array<[1, 2]>] the types ');
		expect(clean_jsdoc('/** @param {string} [a="]"] the a */')).toBe(
			'* @param [a="]"] the a ',
		);
	});

	it("doesn't parse tags inside tilde code blocks", () => {
		const comment = '/**\n * ~~~js\n * @param {string} a\n * ~~~\n */';
		expect(clean_jsdoc(comment)).toBe(
			'*\n * ~~~js\n * @param {string} a\n * ~~~\n ',
		);
	});

	it('removes types containing braces in strings', () => {
		expect(clean_jsdoc('/** @returns {"}"} the delimiter */')).toBe(
			'* @returns the delimiter ',
		);
		expect(clean_jsdoc("/** @param {'{' | `}`} a the brace */")).toBe(
			'* @param a the brace ',
		);
	});

	it('removes the directives of the generator', () => {
		expect(
			clean_jsdoc('/**\n * Desc.\n * @internal\n * @interface\n */'),
		).toBe('*\n * Desc.\n ');
	});

	it('keeps the text after the modifier tags as description', () => {
		expect(
			clean_jsdoc(
				'/**\n * @abstract\n * Register a subscription.\n * @param {string} id the id\n */',
			),
		).toBe('*\n * Register a subscription.\n * @param id the id\n ');
		expect(clean_jsdoc('/** @readonly The current value. */')).toBe(
			'* The current value. ',
		);
	});

	it("doesn't keep the text after @internal", () => {
		expect(clean_jsdoc('/** @internal Only for the server. */')).toBe(
			undefined,
		);
	});

	it('recognizes tags indented with whitespace', () => {
		expect(
			clean_jsdoc(
				'/**\n * Emit.\n * \t@template {string} Key\n *  @param {Key} key the key\n */',
			),
		).toBe('*\n * Emit.\n * @param key the key\n ');
	});

	it('removes the modifier tags', () => {
		expect(
			clean_jsdoc(
				'/**\n * Desc.\n * @readonly\n * @protected\n * @private\n * @public\n */',
			),
		).toBe('*\n * Desc.\n ');
	});

	it('drops comments with nothing left', () => {
		expect(clean_jsdoc('/** @type {string} */')).toBeUndefined();
		expect(
			clean_jsdoc('/**\n * @param {string} a\n * @returns {void}\n */'),
		).toBeUndefined();
	});

	it('drops typedef and file comments', () => {
		expect(
			clean_jsdoc(
				'/**\n * A point.\n * @typedef {{ x: number }} Point\n */',
			),
		).toBeUndefined();
		expect(clean_jsdoc('/** @callback Fn */')).toBeUndefined();
		expect(clean_jsdoc('/** @file The entry point */')).toBeUndefined();
	});

	it('keeps single line comments on a single line', () => {
		expect(clean_jsdoc('/** Hello */')).toBe('* Hello ');
		expect(clean_jsdoc('/** Hello @type {string} */')).toBe(
			'* Hello @type {string} ',
		);
	});
});

describe('comments', () => {
	it('cleans the comments of declarations and drops the typedef and import ones', () => {
		const { read } = generate({
			'src/point.js': '/** @typedef {{ x: number }} Point */\nexport {};',
			'src/index.js': `/**
 * @import { Point } from './point.js'
 */

/**
 * A pair.
 * @typedef {[Point, Point]} Pair
 */

/**
 * Create a point.
 * @param {number} x the coordinate
 * @returns {Point}
 */
export function point(x) {
	return { x };
}

export class Shape {
	/**
	 * The points.
	 * @type {Point[]}
	 */
	points = [];

	/** @returns {number} */
	size() {
		return this.points.length;
	}
}`,
		});
		expect(read('index.d.ts')).toBe(`/**
 * Create a point.
 * @param x the coordinate
 */
export function point(x: number): Point;
export class Shape {
    /**
     * The points.
     */
    points: Point[];
    size(): number;
}
/**
 * A pair.
 */
export type Pair = [Point, Point];
import type { Point } from './point.js';
//# sourceMappingURL=index.d.ts.map`);
	});

	it('cleans the comments of @overload signatures', () => {
		const { read } = generate({
			'src/index.js': `
/**
 * Parse a number.
 * @overload
 * @param {string} value the text
 * @returns {number}
 */
/**
 * Parse many numbers.
 * @overload
 * @param {string[]} value
 * @returns {number[]}
 */
/**
 * @param {string | string[]} value
 * @returns {number | number[]}
 */
export function parse(value) {
	return Array.isArray(value) ? value.map(Number) : Number(value);
}`,
		});
		expect(read('index.d.ts')).toBe(`/**
 * Parse a number.
 * @param value the text
 */
export function parse(value: string): number;
/**
 * Parse many numbers.
 */
export function parse(value: string[]): number[];
//# sourceMappingURL=index.d.ts.map`);
	});

	it('keeps /*! comments', () => {
		const { read } = generate({
			'src/index.js': '/*! license */\nexport const a = 1;',
		});
		expect(read('index.d.ts')).toContain('/*! license */');
	});

	it('keeps the declaration map in sync with the shorter comments', () => {
		const source = `/**
 * Add.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function add(a, b) {
	return a + b;
}

/**
 * Subtract.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function subtract(a, b) {
	return a - b;
}`;
		const { read } = generate({ 'src/index.js': source });
		const dts = read('index.d.ts').split('\n');
		const mappings = decode_mappings(
			JSON.parse(read('index.d.ts.map')).mappings,
		);
		const source_lines = source.split('\n');
		for (const name of ['add', 'subtract']) {
			const generated_line = dts.findIndex((line) =>
				line.startsWith(`export function ${name}(`),
			);
			const segment = mappings[generated_line]?.[0];
			expect(source_lines[segment?.source_line ?? -1]).toBe(
				`export function ${name}(a, b) {`,
			);
		}
	});
});

describe('cli', () => {
	it('generates the types of the package in the current directory', () => {
		const cwd = create_package({ 'src/index.js': 'export const a = 1;' });
		execFileSync(process.execPath, [CLI], { cwd, stdio: 'pipe' });
		expect(
			fs.readFileSync(path.join(cwd, 'types/index.d.ts'), 'utf8'),
		).toBe('export const a: 1;\n//# sourceMappingURL=index.d.ts.map');
	});

	it('prints the errors and exits with 1', () => {
		const cwd = create_package({
			'src/index.js': '/** @type {string} */\nexport const a = 1;',
		});
		let result;
		try {
			execFileSync(process.execPath, [CLI], { cwd, stdio: 'pipe' });
		} catch (error) {
			result = /** @type {{ status: number, stderr: Buffer }} */ (error);
		}
		expect(result?.status).toBe(1);
		const stderr = result?.stderr.toString() ?? '';
		expect(stderr).toContain('TS2322');
		expect(stderr).toContain('The sources contain type errors.');
	});
});
