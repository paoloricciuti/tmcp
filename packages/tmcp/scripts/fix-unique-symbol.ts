/**
 * This script is needed because `dts-buddy` creates a new symbol for each "module"
 * which means that for what typescript is concerned the two are different symbols.
 *
 * This remove all of them and move them on top so they are shared between modules.
 */

import fs from 'node:fs/promises';
const FILE_PATH = './src/types/index.d.ts';

const generated_dts = await fs.readFile(FILE_PATH, 'utf-8');

const fixed_dts = generated_dts.replace(/const (.+): unique symbol;\n/g, '');
const ret = generated_dts.matchAll(/const (?<name>.+): unique symbol;\n/g);

const declarations = [
	...new Set([...ret].map((r) => r.groups?.name).filter(Boolean)),
]
	.map((symbol) => `const ${symbol}: unique symbol;`)
	.join('\n');

fs.writeFile(FILE_PATH, declarations + '\n' + fixed_dts);
