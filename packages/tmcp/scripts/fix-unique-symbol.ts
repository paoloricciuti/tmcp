/**
 * This script fixes issues with dts-buddy's output:
 *
 * 1. Unique symbols: dts-buddy creates a new symbol for each "module"
 *    which means that for TypeScript the two are different symbols.
 *    This removes all of them and moves them to the top so they are shared.
 *
 * 2. Duplicate classes: dts-buddy duplicates class definitions across modules.
 *    This identifies classes defined in the main module and removes duplicates
 *    from sub-modules, replacing them with imports.
 */

import { tsPlugin } from '@sveltejs/acorn-typescript';
import { Parser } from 'acorn';
import type { ClassDeclaration } from 'estree';
import fs from 'node:fs/promises';
import { walk } from 'zimmerframe';
const FILE_PATH = './src/types/index.d.ts';

let content = await fs.readFile(FILE_PATH, 'utf-8');

// =============================================================================
// Fix 1: Move unique symbols to the top so they are shared between modules
// =============================================================================
const symbol_matches = [...content.matchAll(/const (.+): unique symbol;\n/g)];
const unique_symbols = [
	...new Set(symbol_matches.map((r) => r[1]).filter(Boolean)),
];
content = content.replace(/const (.+): unique symbol;\n/g, '');
const symbol_declarations = unique_symbols
	.map((symbol) => `declare const ${symbol}: unique symbol;`)
	.join('\n');
content = symbol_declarations + '\n' + content;

// =============================================================================
// Fix 2: Remove duplicate class definitions from sub-modules
// =============================================================================

const parser = Parser.extend(tsPlugin());
const ast = parser.parse(content, {
	ecmaVersion: 'latest',
	sourceType: 'module',
});
type TSModuleDeclaration = {
	type: 'TSModuleDeclaration';
	id: { type: 'Literal'; value: string };
};

walk(
	ast as unknown as
		| TSModuleDeclaration
		| (ClassDeclaration & { start: number; end: number }),
	{ module_id: null as string | null },
	{
		TSModuleDeclaration(node, { next }) {
			if (node.id.type === 'Literal') {
				next({ module_id: String(node.id.value) });
			}
		},
		ClassDeclaration(node, { state, next, stop }) {
			if (
				state.module_id === 'tmcp/utils' &&
				node.id.name === 'McpServer'
			) {
				content =
					content.slice(0, node.start) +
					`import { ${node.id.name} } from "tmcp";` +
					content.slice(node.end);
				stop();
				return;
			}
			next();
		},
	},
);

fs.writeFile(FILE_PATH, content, 'utf-8');
