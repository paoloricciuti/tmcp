/**
 * Generate the declaration files of the package in the current directory.
 *
 * The compiler options are the ones of the package `tsconfig.json` extended
 * with the closest `tsconfig.build.json` (the one at the root of the repo).
 *
 * On top of plain `tsc` the emitted declarations support these JSDoc tags:
 * - `@abstract` on classes and class members adds the `abstract` modifier
 * - `@interface` on a `@typedef` emits an interface instead of a type alias
 * - `@internal` removes the declaration from the output
 *
 * The tags on class members are only supported in class declarations, not in
 * class expressions.
 *
 * JSDoc comments are slimmed down too, since the declarations already carry
 * the types: see `clean_jsdoc`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const BUILD_CONFIG = 'tsconfig.build.json';
const DECLARATION_FILE = /\.d\.[cm]?ts$/;
const GENERATED_FILE = /\.d\.[cm]?ts(\.map)?$/;

export class GenerateTypesError extends Error {
	/**
	 * @param {string} message
	 * @param {readonly ts.Diagnostic[]} [diagnostics]
	 */
	constructor(message, diagnostics = []) {
		super(message);
		this.name = 'GenerateTypesError';
		this.diagnostics = diagnostics;
	}
}

/**
 * Generate the declaration files of the package in `cwd`.
 * @param {string} [cwd] the directory of the package
 * @returns {{ out_dir: string, files: string[] }} the output directory and the generated files, relative to it
 * @throws {GenerateTypesError} if the configuration is invalid or there are type errors
 */
export function generate_types(cwd = process.cwd()) {
	const root_config = find_up(BUILD_CONFIG, path.dirname(cwd));
	if (!root_config) {
		throw new GenerateTypesError(`Could not find a ${BUILD_CONFIG} file`);
	}

	const config = ts.parseJsonConfigFileContent(
		{
			extends: [
				'./tsconfig.json',
				path.relative(cwd, root_config).split(path.sep).join('/'),
			],
		},
		ts.sys,
		cwd,
		undefined,
		// pretend the config lives in the package so that `${configDir}` points to it
		path.join(cwd, BUILD_CONFIG),
	);
	throw_on_errors(config.errors, 'The configuration is invalid.');

	const { outDir: out_dir, rootDir: root_dir } = config.options;
	if (!out_dir || !root_dir) {
		throw new GenerateTypesError(
			`${BUILD_CONFIG} must specify both "rootDir" and "outDir"`,
		);
	}
	// `outDir` is deleted: make sure it only contains generated files
	const real_out_dir = real_path(out_dir);
	const real_root_dir = real_path(root_dir);
	if (
		!is_inside(real_out_dir, real_path(cwd)) ||
		is_inside(real_out_dir, real_root_dir) ||
		is_inside(real_root_dir, real_out_dir) ||
		real_out_dir === real_root_dir
	) {
		throw new GenerateTypesError(
			`"outDir" (${out_dir}) must be a directory inside the package that doesn't overlap with "rootDir" (${root_dir})`,
		);
	}
	const not_generated = find_not_generated(out_dir);
	if (not_generated) {
		throw new GenerateTypesError(
			`"outDir" (${out_dir}) contains files that were not generated (${not_generated}): refusing to delete it`,
		);
	}

	fs.rmSync(out_dir, { recursive: true, force: true });

	const program = ts.createProgram({
		rootNames: config.fileNames,
		// a build info file would end up in the output directory
		options: {
			...config.options,
			incremental: false,
			composite: false,
			tsBuildInfoFile: undefined,
		},
		projectReferences: config.projectReferences,
	});
	throw_on_errors(
		ts.getPreEmitDiagnostics(program),
		'The sources contain type errors.',
	);

	/** @type {string[]} */
	const jsdoc_errors = [];
	const emit_result = program.emit(undefined, undefined, undefined, true, {
		afterDeclarations: [
			create_jsdoc_tags_transformer(
				program.getTypeChecker(),
				(file, message) =>
					jsdoc_errors.push(
						`${path.relative(cwd, file)}: ${message}`,
					),
			),
		],
	});
	throw_on_errors(emit_result.diagnostics, 'The emit failed.');
	if (jsdoc_errors.length > 0) {
		throw new GenerateTypesError(jsdoc_errors.join('\n'));
	}

	// tsc doesn't copy hand-written declaration files to the output directory,
	// but the emitted declarations still reference them.
	for (const file of fs.readdirSync(root_dir, { recursive: true })) {
		const relative = file.toString();
		if (!DECLARATION_FILE.test(relative)) continue;
		const destination = path.join(out_dir, relative);
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.copyFileSync(path.join(root_dir, relative), destination);
	}

	const files = fs
		.readdirSync(out_dir, { recursive: true })
		.map((file) => file.toString().split(path.sep).join('/'))
		.filter((file) => fs.statSync(path.join(out_dir, file)).isFile())
		.sort();

	const dts_files = files
		.filter((file) => DECLARATION_FILE.test(file))
		.map((file) => path.join(out_dir, file));

	// types printed by the checker can reference a file by its absolute path
	for (const file of dts_files) {
		const absolute = find_absolute_reference(file);
		if (absolute) {
			throw new GenerateTypesError(
				`${path.relative(cwd, file)} references a module by its absolute path (${absolute}), which doesn't exist for the consumers of the package`,
			);
		}
	}

	// Type check the generated declarations: consumers usually have `skipLibCheck`
	// enabled, which would silently turn any error in them into `any`. They
	// don't have the JavaScript sources either.
	const check_program = ts.createProgram(dts_files, {
		...config.options,
		noEmit: true,
		skipLibCheck: false,
		allowJs: false,
		checkJs: false,
		incremental: false,
		composite: false,
	});
	throw_on_errors(
		dts_files.flatMap((file) => {
			const source_file = check_program.getSourceFile(file);
			if (!source_file) return [];
			return [
				...check_program.getSyntacticDiagnostics(source_file),
				...check_program.getSemanticDiagnostics(source_file),
			];
		}),
		'The generated declarations contain type errors.',
	);

	return { out_dir, files };
}

/**
 * @param {string} name
 * @param {string} dir
 * @returns {string | undefined}
 */
function find_up(name, dir) {
	const candidate = path.join(dir, name);
	if (fs.existsSync(candidate)) return candidate;
	const parent = path.dirname(dir);
	return parent === dir ? undefined : find_up(name, parent);
}

/**
 * Whether `child` is strictly inside `parent`.
 * @param {string} child
 * @param {string} parent
 */
function is_inside(child, parent) {
	const relative = path.relative(path.resolve(parent), path.resolve(child));
	return (
		relative !== '' &&
		relative !== '..' &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	);
}

/**
 * The first module specifier or referenced path of a declaration file that is
 * absolute, if any.
 * @param {string} file
 * @returns {string | undefined}
 */
function find_absolute_reference(file) {
	const source_file = ts.createSourceFile(
		file,
		fs.readFileSync(file, 'utf8'),
		ts.ScriptTarget.Latest,
		true,
	);
	/** @type {string[]} */
	const references = source_file.referencedFiles.map(
		(reference) => reference.fileName,
	);
	/** @param {ts.Node} node */
	const visit = (node) => {
		/** @type {ts.Node | undefined} */
		let specifier;
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			specifier = node.moduleSpecifier;
		} else if (
			ts.isImportEqualsDeclaration(node) &&
			ts.isExternalModuleReference(node.moduleReference)
		) {
			specifier = node.moduleReference.expression;
		} else if (ts.isImportTypeNode(node)) {
			specifier = ts.isLiteralTypeNode(node.argument)
				? node.argument.literal
				: undefined;
		} else if (ts.isModuleDeclaration(node)) {
			specifier = node.name;
		}
		if (specifier && ts.isStringLiteralLike(specifier)) {
			references.push(specifier.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source_file);
	return references.find(
		(reference) =>
			path.isAbsolute(reference) ||
			/^[A-Za-z]:[\\/]/.test(reference) ||
			reference.startsWith('file:'),
	);
}

/**
 * The canonical path of a file, which may not exist yet: symlinks and the
 * case of the existing part (on case-insensitive file systems) are resolved.
 * @param {string} file
 */
function real_path(file) {
	let existing = path.resolve(file);
	/** @type {string[]} */
	const rest = [];
	while (!fs.existsSync(existing)) {
		const parent = path.dirname(existing);
		if (parent === existing) break;
		rest.unshift(path.basename(existing));
		existing = parent;
	}
	return path.join(fs.realpathSync.native(existing), ...rest);
}

/**
 * The first entry of a directory that doesn't look like a generated
 * declaration file, if any.
 * @param {string} dir
 * @returns {string | undefined}
 */
function find_not_generated(dir) {
	if (!fs.existsSync(dir)) return undefined;
	if (!fs.lstatSync(dir).isDirectory()) return dir;
	for (const entry of fs.readdirSync(dir, {
		recursive: true,
		withFileTypes: true,
	})) {
		if (entry.isDirectory()) continue;
		if (!entry.isFile() || !GENERATED_FILE.test(entry.name)) {
			return path.join(entry.parentPath, entry.name);
		}
	}
	return undefined;
}

/**
 * Tags that only carry type information, already part of the declarations,
 * or are directives for this generator.
 */
const TYPE_ONLY_TAGS = new Set([
	'abstract',
	'augments',
	'extends',
	'implements',
	'import',
	'interface',
	'internal',
	'overload',
	'private',
	'prop',
	'property',
	'protected',
	'public',
	'readonly',
	'satisfies',
	'this',
]);

/**
 * Type-only tags without arguments: any text after them is part of the
 * description (e.g. `@abstract Do the thing.`).
 */
const MODIFIER_TAGS = new Set([
	'abstract',
	'interface',
	'overload',
	'private',
	'protected',
	'public',
	'readonly',
]);

/**
 * Tags whose `{type}` is removed: they're kept only if they have a description.
 */
const TYPED_TAGS = new Set([
	'arg',
	'argument',
	'param',
	'return',
	'returns',
	'template',
	'type',
]);

/**
 * Split the text of a tag (without its type) in the names it starts with and
 * the description: `name desc`, `[name=default] desc` and, if `list`,
 * `T, [U=string[]] desc`.
 * @param {string} text
 * @param {boolean} list
 * @returns {[names: string, description: string]}
 */
function split_names(text, list) {
	let index = 0;
	while (true) {
		while (/\s/.test(text[index] ?? '')) index++;
		if (text[index] === '[') {
			index = skip_balanced(text, index, '[', ']');
		} else {
			while (index < text.length && !/[\s,]/.test(text[index])) index++;
			if (!list) {
				while (index < text.length && !/\s/.test(text[index])) index++;
			}
		}
		const after_name = index;
		while (/\s/.test(text[index] ?? '')) index++;
		if (!list || text[index] !== ',') {
			return [
				text.slice(0, after_name).trim(),
				text.slice(after_name).trim(),
			];
		}
		index++;
	}
}

/**
 * The index after the bracket that closes the one at `start`, skipping quoted
 * strings.
 * @param {string} text
 * @param {number} start
 * @param {string} open
 * @param {string} close
 */
function skip_balanced(text, start, open, close) {
	let depth = 0;
	/** @type {string | undefined} */
	let quote;
	for (let index = start; index < text.length; index++) {
		const char = text[index];
		if (quote) {
			if (char === '\\') index++;
			else if (char === quote) quote = undefined;
		} else if (char === "'" || char === '"' || char === '`') {
			quote = char;
		} else if (char === open) {
			depth++;
		} else if (char === close && --depth === 0) {
			return index + 1;
		}
	}
	return text.length;
}

/**
 * Tracks the Markdown code blocks (fenced with backticks or tildes) in the
 * lines of a comment.
 */
function create_fence_tracker() {
	/** @type {{ char: string, length: number } | undefined} */
	let open;
	return {
		/**
		 * @param {string} line the line without the leading `*`
		 * @returns {boolean} whether the line is part of a code block
		 */
		line(line) {
			const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
			if (open) {
				if (
					fence &&
					fence[1][0] === open.char &&
					fence[1].length >= open.length &&
					!fence[2].trim()
				) {
					open = undefined;
				}
				return true;
			}
			// the info string of a backtick fence can't contain backticks
			if (fence && !(fence[1][0] === '`' && fence[2].includes('`'))) {
				open = { char: fence[1][0], length: fence[1].length };
				return true;
			}
			return false;
		},
		/**
		 * Like `line`, but the text after a tag at the start of the line (e.g.
		 * `@example ```js`) is what can open a block.
		 * @param {string} line the line without the leading `*`
		 */
		tag_line(line) {
			const tag = !open && /^\s*@\w+/.exec(line);
			return this.line(tag ? line.slice(tag[0].length) : line);
		},
		get open() {
			return open !== undefined;
		},
	};
}

/**
 * Comments with these tags are dropped entirely: typedefs are emitted with
 * their own comment, and the others describe the file, not a declaration.
 */
const DROPPED_COMMENT_TAGS = new Set([
	'callback',
	'file',
	'fileoverview',
	'module',
	'overview',
	'typedef',
]);

/**
 * Remove from a JSDoc comment what the declarations already express: the
 * types in `@param` and `@returns` (which are kept only if they have a
 * description) and the tags that only carry type information.
 * @param {string} comment the comment, including the `/**` and `*\/` delimiters
 * @returns {string | undefined} the text of the cleaned comment without the
 * `/*` and `*\/` delimiters, or undefined if nothing is left
 */
export function clean_jsdoc(comment) {
	const lines = comment
		.slice(3, -2)
		.split('\n')
		.map((line, i) =>
			(i === 0
				? line.trimStart()
				: line.replace(/^\s*\*? ?/, '')
			).trimEnd(),
		);

	/** @type {string[]} */
	const description = [];
	/** @type {Array<{ name: string, lines: string[] }>} */
	const tags = [];
	const fences = create_fence_tracker();
	for (const line of lines) {
		// TypeScript allows whitespace before a tag
		const tag = !fences.open && /^\s*@(\w+)/.exec(line);
		fences.tag_line(line);
		if (tag) tags.push({ name: tag[1], lines: [line.trimStart()] });
		else (tags.at(-1)?.lines ?? description).push(line);
	}
	if (tags.some((tag) => DROPPED_COMMENT_TAGS.has(tag.name)))
		return undefined;

	/** @type {string[]} */
	const tag_lines = [];
	for (const tag of tags) {
		if (TYPE_ONLY_TAGS.has(tag.name)) {
			if (MODIFIER_TAGS.has(tag.name)) {
				const text = tag.lines
					.join('\n')
					.slice(tag.name.length + 1)
					.trim();
				if (text) description.push(...text.split('\n'));
			}
			continue;
		}
		if (!TYPED_TAGS.has(tag.name)) {
			tag_lines.push(...tag.lines);
			continue;
		}
		let text = remove_type(tag.lines.join('\n')).trim();
		if (tag.name === 'type') {
			// the description of the declaration
			if (text) description.push(...text.split('\n'));
			continue;
		}
		let name = '';
		if (!tag.name.startsWith('return')) {
			const [names, rest] = split_names(text, tag.name === 'template');
			name = `${names} `;
			text = rest;
		}
		if (!text) continue;
		tag_lines.push(...`@${tag.name} ${name}${text}`.split('\n'));
	}
	const content = [...description, ...tag_lines];

	while (content.length && !content[0].trim()) content.shift();
	while (content.length && !content.at(-1)?.trim()) content.pop();
	if (content.length === 0) return undefined;
	if (!comment.includes('\n') && content.length === 1) {
		return `* ${content[0]} `;
	}
	return `*\n${content.map((line) => (line ? ` * ${line}` : ' *')).join('\n')}\n `;
}

/**
 * Remove the tag name and the `{type}` that follows it from the text of a tag.
 * @param {string} text
 */
function remove_type(text) {
	let index = text.search(/\s|$/);
	while (/\s/.test(text[index] ?? '')) index++;
	if (text[index] !== '{') return text.slice(index);
	return text.slice(skip_balanced(text, index, '{', '}'));
}

/**
 * Replace the JSDoc comments copied from the sources with their cleaned
 * version. Comments are replaced with synthetic ones, so the positions of the
 * declarations (and the declaration map) are unaffected.
 * @param {ts.SourceFile} output the declaration file being emitted
 * @param {ts.SourceFile} source the file it's emitted from
 */
function clean_comments(output, source) {
	// the comments before the first statement are printed as part of the file:
	// they're added back to the first statement
	ts.setEmitFlags(output, ts.EmitFlags.NoLeadingComments);

	/**
	 * @param {ts.Node} node
	 * @param {number} container_pos
	 */
	function visit(node, container_pos) {
		// tsc adds some comments as synthetic ones, e.g. for `@overload`
		const synthetic = ts.getSyntheticLeadingComments(node);
		if (synthetic) {
			ts.setSyntheticLeadingComments(
				node,
				synthetic.flatMap((comment) => {
					if (
						comment.kind !== ts.SyntaxKind.MultiLineCommentTrivia ||
						!comment.text.startsWith('*')
					) {
						return [comment];
					}
					const text = clean_jsdoc(`/*${comment.text}*/`);
					return text === undefined ? [] : [{ ...comment, text }];
				}),
			);
		}
		const { pos } = ts.getCommentRange(node);
		// a node at the same position of its container shares its comments, and
		// nodes copied from other files have positions in those files
		if (
			pos >= 0 &&
			pos !== container_pos &&
			ts.getOriginalNode(node).getSourceFile?.() === source
		) {
			const ranges = ts.getLeadingCommentRanges(source.text, pos) ?? [];
			if (ranges.length > 0) {
				// `addEmitFlags` is not in the public typings, `setEmitFlags` would
				// overwrite the flags set by the declaration emitter
				/** @type {{ addEmitFlags(node: ts.Node, flags: ts.EmitFlags): void }} */ (
					/** @type {unknown} */ (ts)
				).addEmitFlags(node, ts.EmitFlags.NoLeadingComments);
				for (const range of ranges) {
					const text = source.text.slice(range.pos, range.end);
					// declaration files only keep JSDoc and `/*!` comments
					const cleaned = text.startsWith('/**')
						? clean_jsdoc(text)
						: text.startsWith('/*!')
							? text.slice(2, -2)
							: undefined;
					if (cleaned === undefined) continue;
					ts.addSyntheticLeadingComment(
						node,
						ts.SyntaxKind.MultiLineCommentTrivia,
						cleaned,
						true,
					);
				}
			}
		}
		ts.forEachChild(node, (child) =>
			visit(child, pos >= 0 ? pos : container_pos),
		);
	}

	ts.forEachChild(output, (child) => visit(child, -1));
}

/**
 * @param {readonly ts.Diagnostic[]} diagnostics
 * @param {string} message
 */
function throw_on_errors(diagnostics, message) {
	const errors = diagnostics.filter(
		(diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
	);
	if (errors.length > 0) throw new GenerateTypesError(message, errors);
}

/**
 * The JSDoc tags of the source node a declaration was emitted from.
 * @param {ts.Node} node
 * @param {ts.SourceFile} source_file the file the declarations are emitted from
 */
function get_tags(node, source_file) {
	const original = ts.getOriginalNode(node);
	// declarations typed with something like `@type {Base['method']}` are
	// copied from the referenced declaration: its tags don't apply here
	if (original.getSourceFile?.() !== source_file) return new Set();
	const nodes = ts.isVariableStatement(original)
		? [original, ...original.declarationList.declarations]
		: [original];
	return new Set(
		nodes.flatMap((node) =>
			ts
				.getJSDocTags(node)
				.filter((tag) => !is_in_code_block(tag))
				.map((tag) => tag.tagName.text),
		),
	);
}

/**
 * TypeScript parses tags inside the code blocks of a comment (e.g. in an
 * `@example`), but they're not tags.
 * @param {ts.JSDocTag} tag
 */
function is_in_code_block(tag) {
	/** @type {ts.Node | undefined} */
	let jsdoc = tag.parent;
	while (jsdoc && !ts.isJSDoc(jsdoc)) jsdoc = jsdoc.parent;
	if (!jsdoc) return false;
	const lines = tag
		.getSourceFile()
		.text.slice(jsdoc.pos, tag.pos)
		.split('\n')
		.map((line, i) =>
			(i === 0 ? line.replace(/^\s*\/\*\*/, '') : line)
				.replace(/^\s*\*? ?/, '')
				.replace(/\r$/, ''),
		);
	// the last line is the text before the tag on its line
	const before_tag = /** @type {string} */ (lines.pop());
	const fences = create_fence_tracker();
	for (const line of lines) fences.tag_line(line);
	// a closing fence can't be followed by anything: a tag on a line of an open
	// block is in the block, and so is a tag after an opening fence
	return fences.open || /^\s*(`{3,}|~{3,})/.test(before_tag);
}

/**
 * Add the `abstract` modifier respecting the order TypeScript requires.
 * @template {ts.ClassDeclaration | ts.ClassElement} T
 * @param {T} node
 * @returns {T}
 */
function add_abstract(node) {
	const modifiers = [...(ts.getModifiers(/** @type {any} */ (node)) ?? [])];
	if (modifiers.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword)) {
		return node;
	}
	const MUST_FOLLOW = new Set([
		ts.SyntaxKind.ReadonlyKeyword,
		ts.SyntaxKind.OverrideKeyword,
		ts.SyntaxKind.AccessorKeyword,
	]);
	const index = modifiers.findIndex((m) => MUST_FOLLOW.has(m.kind));
	modifiers.splice(
		index === -1 ? modifiers.length : index,
		0,
		ts.factory.createModifier(ts.SyntaxKind.AbstractKeyword),
	);
	return /** @type {T} */ (
		ts.factory.replaceModifiers(/** @type {any} */ (node), modifiers)
	);
}

/**
 * @template {ts.Node} T
 * @param {T} node
 * @param {ts.Node} original
 * @returns {T}
 */
function replace(node, original) {
	return ts.setTextRange(ts.setOriginalNode(node, original), original);
}

/**
 * The JSDoc tags that apply to a `@typedef`. A comment can declare several
 * typedefs, so a tag applies to the first `@typedef` that follows it in the
 * same comment, or to the last one before it when no typedef follows.
 * Typedefs in a code block (e.g. in an `@example`) are not real typedefs.
 * @param {string} name
 * @param {ts.SourceFile} source_file
 * @param {ts.TypeChecker} checker
 * @returns {Set<string> | undefined} undefined if the typedef is in a code block
 */
function get_typedef_tags(name, source_file, checker) {
	const module_symbol = checker.getSymbolAtLocation(source_file);
	const symbol =
		(module_symbol &&
			checker
				.getExportsOfModule(module_symbol)
				.find((symbol) => symbol.name === name)) ??
		checker
			.getSymbolsInScope(source_file, ts.SymbolFlags.TypeAlias)
			.find((symbol) => symbol.name === name);
	const typedef = symbol?.declarations
		?.filter(ts.isJSDocTypedefTag)
		.find((declaration) => declaration.getSourceFile() === source_file);
	if (!typedef || !ts.isJSDoc(typedef.parent)) return new Set();
	if (is_in_code_block(typedef)) return undefined;
	const tags = typedef.parent.tags ?? [];
	const typedefs = tags
		.filter(ts.isJSDocTypedefTag)
		.filter((tag) => !is_in_code_block(tag));
	return new Set(
		tags
			.filter((tag) => {
				if (ts.isJSDocTypedefTag(tag) || is_in_code_block(tag))
					return false;
				const target =
					typedefs.find((other) => other.pos > tag.pos) ??
					typedefs.findLast((other) => other.pos < tag.pos);
				return target === typedef;
			})
			.map((tag) => tag.tagName.text),
	);
}

/**
 * @param {ts.EntityName} name
 * @returns {ts.Expression}
 */
function entity_name_to_expression(name) {
	if (ts.isIdentifier(name)) return ts.factory.createIdentifier(name.text);
	return ts.factory.createPropertyAccessExpression(
		entity_name_to_expression(name.left),
		name.right.text,
	);
}

/**
 * Convert a type alias of an object type to an interface. Object types in an
 * intersection are merged and type references become `extends` clauses.
 * @param {ts.TypeAliasDeclaration} node
 * @returns {ts.InterfaceDeclaration | undefined} undefined if the type can't be expressed as an interface
 */
function type_alias_to_interface(node) {
	/** @type {ts.TypeElement[]} */
	const members = [];
	/** @type {ts.ExpressionWithTypeArguments[]} */
	const heritage = [];
	/** @param {ts.TypeNode} type */
	const collect = (type) => {
		if (ts.isParenthesizedTypeNode(type)) return collect(type.type);
		if (ts.isIntersectionTypeNode(type)) return type.types.every(collect);
		if (ts.isTypeLiteralNode(type)) {
			members.push(...type.members);
			return true;
		}
		if (ts.isTypeReferenceNode(type)) {
			heritage.push(
				ts.factory.createExpressionWithTypeArguments(
					entity_name_to_expression(type.typeName),
					type.typeArguments,
				),
			);
			return true;
		}
		return false;
	};
	if (!collect(node.type)) return undefined;
	return replace(
		ts.factory.createInterfaceDeclaration(
			node.modifiers,
			node.name,
			node.typeParameters,
			heritage.length
				? [
						ts.factory.createHeritageClause(
							ts.SyntaxKind.ExtendsKeyword,
							heritage,
						),
					]
				: undefined,
			members,
		),
		node,
	);
}

const printer = ts.createPrinter();

/**
 * A key that identifies the name of a class member: the name itself when it's
 * known (computed names in the sources are resolved with the checker, so
 * `[key]` with `const key = 'a'` is `a`), the printed expression otherwise
 * (e.g. `[symbol]`), undefined for private names.
 * @param {ts.PropertyName} name
 * @param {ts.TypeChecker} checker
 * @param {ts.SourceFile} source_file
 * @returns {string | undefined}
 */
function get_member_key(name, checker, source_file) {
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	) {
		return name.text;
	}
	if (!ts.isComputedPropertyName(name)) return undefined;
	const { expression } = name;
	if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
		return expression.text;
	}
	if (
		!(expression.flags & ts.NodeFlags.Synthesized) &&
		expression.getSourceFile?.() === source_file
	) {
		const type = checker.getTypeAtLocation(expression);
		if (type.isStringLiteral()) return type.value;
		if (type.isNumberLiteral()) return String(type.value);
	}
	return `[${printer.printNode(ts.EmitHint.Expression, expression, source_file)}]`;
}

/**
 * The member of the source class an emitted member comes from. The original
 * node of an emitted member is not always in the class: it's in the JSDoc of
 * the method for `@overload` signatures, and it's the referenced declaration
 * for a member typed with something like `@type {Base['method']}`.
 * @param {ts.ClassElement} member
 * @param {ts.Node} original_class
 * @param {ts.TypeChecker} checker
 * @param {ts.SourceFile} source_file
 * @returns {ts.ClassElement | undefined}
 */
function find_source_member(member, original_class, checker, source_file) {
	if (!ts.isClassLike(original_class)) return undefined;
	const name =
		member.name && get_member_key(member.name, checker, source_file);
	const is_static = has_static(member);
	/** @param {ts.ClassElement} candidate */
	const same_member = (candidate) =>
		name !== undefined &&
		has_static(candidate) === is_static &&
		(candidate.name &&
			get_member_key(candidate.name, checker, source_file)) === name &&
		// getters and setters share the name
		!(
			ts.isAccessor(candidate) &&
			ts.isAccessor(member) &&
			candidate.kind !== member.kind
		);
	/** @type {ts.Node | undefined} */
	let node = ts.getOriginalNode(member);
	while (node) {
		if (node.parent === original_class) {
			const candidate = /** @type {ts.ClassElement} */ (node);
			// it can be another member, e.g. for `@type {ThisClass['other']}`
			if (same_member(candidate)) return candidate;
			break;
		}
		node = node.parent;
	}
	if (name === undefined) return undefined;
	const candidates = original_class.members.filter(same_member);
	return (
		candidates.find((candidate) => candidate.kind === member.kind) ??
		candidates[0]
	);
}

/**
 * @param {ts.Node} node
 */
function has_static(node) {
	return (
		ts.canHaveModifiers(node) &&
		!!ts
			.getModifiers(node)
			?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
	);
}

/**
 * tsc doesn't emit the members of a JavaScript subclass whose type is
 * identical to the one in the base class (e.g. a method typed with
 * `@type {Base['method']}`, or a field of the same type). That breaks
 * subclasses of `@abstract` classes, so add back the ones that implement an
 * abstract member. The types are printed as seen from the class: if they
 * reference a name the declaration file doesn't import the final type check
 * reports it, as it does for an implementation tagged `@internal`.
 * @param {ts.ClassDeclaration} node
 * @param {ts.ClassElement[]} members the emitted members, updated in place
 * @param {ts.TypeChecker} checker
 * @param {ts.SourceFile} source_file
 */
function restore_elided_members(node, members, checker, source_file) {
	const original = ts.getOriginalNode(node);
	if (
		!ts.isClassDeclaration(original) ||
		!original.heritageClauses?.some(
			(clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
		)
	) {
		return;
	}
	const base_types =
		checker.getBaseTypes(
			/** @type {ts.InterfaceType} */ (
				checker.getTypeAtLocation(original)
			),
		) ?? [];
	/** @param {string} name */
	const is_abstract_in_base = (name) =>
		base_types.some((base) =>
			checker
				.getPropertyOfType(base, name)
				?.declarations?.some(
					(declaration) =>
						ts.getCombinedModifierFlags(declaration) &
							ts.ModifierFlags.Abstract ||
						ts
							.getJSDocTags(declaration)
							.some((tag) => tag.tagName.text === 'abstract'),
				),
		);
	// only instance members are restored
	const emitted = new Set(
		members.flatMap((member) => {
			const name =
				member.name &&
				get_member_key(member.name, checker, source_file);
			return name === undefined || has_static(member) ? [] : [name];
		}),
	);
	/** @param {ts.Type} type */
	const to_type_node = (type) =>
		checker.typeToTypeNode(
			type,
			original,
			ts.NodeBuilderFlags.NoTruncation,
		);

	/** @type {ts.ClassElement[]} */
	const restored = [];
	for (const member of original.members) {
		if (
			!ts.isMethodDeclaration(member) &&
			!ts.isPropertyDeclaration(member) &&
			!ts.isGetAccessorDeclaration(member) &&
			!ts.isSetAccessorDeclaration(member)
		) {
			continue;
		}
		const name = get_member_key(member.name, checker, source_file);
		const flags = ts.getCombinedModifierFlags(member);
		if (
			name === undefined ||
			emitted.has(name) ||
			flags & (ts.ModifierFlags.Static | ts.ModifierFlags.Private) ||
			!is_abstract_in_base(name)
		) {
			continue;
		}
		const member_tags = get_tags(member, source_file);
		if (member_tags.has('internal')) continue;
		/** @type {ts.Modifier[]} */
		const modifiers = [];
		if (flags & ts.ModifierFlags.Protected) {
			modifiers.push(
				ts.factory.createModifier(ts.SyntaxKind.ProtectedKeyword),
			);
		}
		if (
			flags & ts.ModifierFlags.Readonly &&
			ts.isPropertyDeclaration(member)
		) {
			modifiers.push(
				ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword),
			);
		}
		const name_node = /^[A-Za-z_$][\w$]*$/.test(name)
			? ts.factory.createIdentifier(name)
			: ts.factory.createStringLiteral(name);

		/** @type {ts.ClassElement[]} */
		const created = [];
		/** @type {Map<number, string>} the comments of the overload signatures */
		const comments = new Map();
		const leading_comments = (
			ts.getLeadingCommentRanges(source_file.text, member.pos) ?? []
		).map((range) => source_file.text.slice(range.pos, range.end));
		const pinned_comments = leading_comments.filter((comment) =>
			comment.startsWith('/*!'),
		);
		const implementation_comment = leading_comments.findLast((comment) =>
			comment.startsWith('/**'),
		);
		if (ts.isMethodDeclaration(member)) {
			for (const signature of checker
				.getTypeAtLocation(member)
				.getCallSignatures()) {
				const declaration =
					/** @type {ts.MethodDeclaration | undefined} */ (
						checker.signatureToSignatureDeclaration(
							signature,
							ts.SyntaxKind.MethodDeclaration,
							original,
							ts.NodeBuilderFlags.NoTruncation,
						)
					);
				if (!declaration) continue;
				// an `@overload` signature has its own comment
				const jsdoc = ts.findAncestor(
					signature.getDeclaration(),
					ts.isJSDoc,
				);
				if (jsdoc?.parent === member) {
					comments.set(
						created.length,
						source_file.text.slice(jsdoc.pos, jsdoc.end),
					);
				}
				created.push(
					ts.factory.createMethodDeclaration(
						modifiers,
						undefined,
						name_node,
						undefined,
						declaration.typeParameters,
						declaration.parameters,
						declaration.type,
						undefined,
					),
				);
			}
		} else if (ts.isPropertyDeclaration(member)) {
			created.push(
				ts.factory.createPropertyDeclaration(
					modifiers,
					name_node,
					undefined,
					to_type_node(checker.getTypeAtLocation(member)),
					undefined,
				),
			);
		} else if (ts.isGetAccessorDeclaration(member)) {
			const signature = checker.getSignatureFromDeclaration(member);
			created.push(
				ts.factory.createGetAccessorDeclaration(
					modifiers,
					name_node,
					[],
					signature &&
						to_type_node(
							checker.getReturnTypeOfSignature(signature),
						),
					undefined,
				),
			);
		} else {
			const parameter = member.parameters[0];
			created.push(
				ts.factory.createSetAccessorDeclaration(
					modifiers,
					name_node,
					[
						ts.factory.createParameterDeclaration(
							undefined,
							undefined,
							parameter && ts.isIdentifier(parameter.name)
								? parameter.name.text
								: 'value',
							undefined,
							parameter &&
								to_type_node(
									checker.getTypeAtLocation(parameter),
								),
						),
					],
					undefined,
				),
			);
		}
		for (const [i, declaration] of created.entries()) {
			// map the declaration to the implementation
			const restored_member = ts.setSourceMapRange(declaration, member);
			const jsdoc = comments.get(i) ?? implementation_comment;
			// added as they are: `clean_comments` cleans the JSDoc ones
			for (const comment of jsdoc
				? [...pinned_comments, jsdoc]
				: pinned_comments) {
				ts.addSyntheticLeadingComment(
					restored_member,
					ts.SyntaxKind.MultiLineCommentTrivia,
					comment.slice(2, -2),
					true,
				);
			}
			restored.push(
				member_tags.has('abstract')
					? add_abstract(restored_member)
					: restored_member,
			);
		}
	}
	const insert_at = members.findIndex(
		(member) => member.name && ts.isPrivateIdentifier(member.name),
	);
	members.splice(
		insert_at === -1 ? members.length : insert_at,
		0,
		...restored,
	);
}

/**
 * @param {ts.TypeChecker} checker
 * @param {(file: string, message: string) => void} report
 * @returns {ts.TransformerFactory<ts.SourceFile | ts.Bundle>}
 */
function create_jsdoc_tags_transformer(checker, report) {
	return (context) => {
		/** @type {ts.SourceFile} */
		let source;

		/**
		 * @param {ts.Node} node
		 * @returns {ts.VisitResult<ts.Node | undefined>}
		 */
		function visit_statement(node) {
			if (get_tags(node, source).has('internal')) return undefined;
			if (ts.isClassDeclaration(node)) return visit_class(node);
			if (ts.isTypeAliasDeclaration(node)) return visit_type_alias(node);
			if (ts.isModuleDeclaration(node) || ts.isModuleBlock(node)) {
				return ts.visitEachChild(node, visit_statement, context);
			}
			return node;
		}

		/** @param {ts.ClassDeclaration} node */
		function visit_class(node) {
			const tags = get_tags(node, source);
			const original_class = ts.getOriginalNode(node);
			/** @type {ts.ClassElement[]} */
			const members = [];
			for (const member of node.members) {
				const source_member = find_source_member(
					member,
					original_class,
					checker,
					source,
				);
				const member_tags = source_member
					? get_tags(source_member, source)
					: new Set();
				if (member_tags.has('internal')) continue;
				members.push(
					member_tags.has('abstract') ? add_abstract(member) : member,
				);
			}
			restore_elided_members(node, members, checker, source);
			const updated = ts.factory.updateClassDeclaration(
				node,
				node.modifiers,
				node.name,
				node.typeParameters,
				node.heritageClauses,
				members,
			);
			return tags.has('abstract') ? add_abstract(updated) : updated;
		}

		/** @param {ts.TypeAliasDeclaration} node */
		function visit_type_alias(node) {
			const tags = get_typedef_tags(node.name.text, source, checker);
			if (!tags || tags.has('internal')) return undefined;
			if (!tags.has('interface')) return node;
			const interface_declaration = type_alias_to_interface(node);
			if (!interface_declaration) {
				report(
					source.fileName,
					`"@interface" on the typedef "${node.name.text}" requires an object type or an intersection of object types and type references`,
				);
				return node;
			}
			return interface_declaration;
		}

		return (source_file) => {
			if (!ts.isSourceFile(source_file)) return source_file;
			source = /** @type {ts.SourceFile} */ (
				ts.getOriginalNode(source_file)
			);
			const output = ts.factory.updateSourceFile(
				source_file,
				ts.visitNodes(
					source_file.statements,
					visit_statement,
					ts.isStatement,
				),
			);
			clean_comments(output, source);
			return output;
		};
	};
}
