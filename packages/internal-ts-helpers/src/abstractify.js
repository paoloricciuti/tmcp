import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/**
 * @param {string} dir
 * Recursively finds all .d.ts files in a directory
 */
function find_dts_files(dir) {
	/**
	 * @type {string[]}
	 */
	const files = [];

	if (!fs.existsSync(dir)) {
		return files;
	}

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const full_path = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...find_dts_files(full_path));
		} else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
			files.push(full_path);
		}
	}

	return files;
}

/**
 * Checks if a JSDoc comment contains the @abstract tag
 * @param {ts.Node} node
 */
function has_abstract_jsdoc(node) {
	const jsdoc_tags = ts.getJSDocTags(node);
	return jsdoc_tags.some((tag) => tag.tagName.text === 'abstract');
}

/**
 * Creates a transformer that adds abstract keywords to classes and methods with @abstract JSDoc
 * @returns {ts.TransformerFactory<ts.SourceFile>}
 */
function create_abstract_transformer() {
	return (context) => {
		return (source_file) => {
			/**
			 *
			 * @param {ts.Node} node
			 * @returns {ts.Node}
			 */
			function visit(node) {
				// Handle class declarations
				if (ts.isClassDeclaration(node) && has_abstract_jsdoc(node)) {
					const modifiers = node.modifiers ? [...node.modifiers] : [];

					// Check if abstract modifier already exists
					const has_abstract = modifiers.some(
						(mod) => mod.kind === ts.SyntaxKind.AbstractKeyword,
					);

					if (!has_abstract) {
						// Find the position to insert abstract - after export but before other modifiers
						const export_index = modifiers.findIndex(
							(mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
						);
						const insert_index =
							export_index >= 0 ? export_index + 1 : 0;
						modifiers.splice(
							insert_index,
							0,
							ts.factory.createModifier(
								ts.SyntaxKind.AbstractKeyword,
							),
						);
					}

					return ts.factory.updateClassDeclaration(
						node,
						modifiers,
						node.name,
						node.typeParameters,
						node.heritageClauses,
						node.members.map(
							(member) =>
								/** @type {ts.ClassElement} */ (
									ts.visitNode(member, visit)
								),
						),
					);
				}

				// Handle method declarations
				if (ts.isMethodDeclaration(node) && has_abstract_jsdoc(node)) {
					const modifiers = node.modifiers ? [...node.modifiers] : [];

					// Check if abstract modifier already exists
					const has_abstract = modifiers.some(
						(mod) => mod.kind === ts.SyntaxKind.AbstractKeyword,
					);

					if (!has_abstract) {
						modifiers.unshift(
							ts.factory.createModifier(
								ts.SyntaxKind.AbstractKeyword,
							),
						);
					}

					return ts.factory.updateMethodDeclaration(
						node,
						modifiers,
						node.asteriskToken,
						node.name,
						node.questionToken,
						node.typeParameters,
						node.parameters,
						node.type,
						undefined, // Remove body for abstract methods
					);
				}

				return ts.visitEachChild(node, visit, context);
			}

			return /** @type {ts.SourceFile} */ (
				ts.visitNode(source_file, visit)
			);
		};
	};
}

/**
 * Processes a single .d.ts file and adds abstract keywords where needed
 * @param {string} file_path
 */
function process_dts_file(file_path) {
	const source_text = fs.readFileSync(file_path, 'utf8');

	// Parse the TypeScript file
	const source_file = ts.createSourceFile(
		file_path,
		source_text,
		ts.ScriptTarget.Latest,
		true,
	);

	// Transform the AST
	const transformer = create_abstract_transformer();
	const result = ts.transform(source_file, [transformer]);
	const transformed_source = result.transformed[0];

	// Print the transformed code
	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
		removeComments: false,
	});

	const output = printer.printFile(transformed_source);

	// Write back to file only if there were changes
	if (output !== source_text) {
		fs.writeFileSync(file_path, output, 'utf8');
		console.log(` Updated ${file_path}`);
	}

	result.dispose();
}

/**
 * Gets the types directory from package.json
 */
function get_types_directory() {
	try {
		const package_json_path = path.resolve(process.cwd(), 'package.json');
		const package_json = JSON.parse(
			fs.readFileSync(package_json_path, 'utf8'),
		);

		if (package_json.types) {
			return path.dirname(
				path.resolve(process.cwd(), package_json.types),
			);
		}
	} catch {
		console.warn(
			'Could not read package.json or types field not found, falling back to dist',
		);
	}

	// Fallback to dist directory
	return path.resolve(process.cwd(), 'dist');
}

/**
 * Main function that processes all .d.ts files in the types folder
 */
function abstractify() {
	const types_path = get_types_directory();

	console.log(`Looking for .d.ts files in: ${types_path}`);

	const dts_files = find_dts_files(types_path);

	if (dts_files.length === 0) {
		console.log('No .d.ts files found in types folder');
		return;
	}

	console.log(`Found ${dts_files.length} .d.ts files:`);
	dts_files.forEach((file) => console.log(`  - ${file}`));

	console.log('\nProcessing files...');

	for (const file of dts_files) {
		try {
			process_dts_file(file);
		} catch (error) {
			console.error(`Error processing ${file}:`, error);
		}
	}

	console.log('\nDone!');
}

export { abstractify };
