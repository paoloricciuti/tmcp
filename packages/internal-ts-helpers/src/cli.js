#!/usr/bin/env node
import ts from 'typescript';
import { GenerateTypesError, generate_types } from './generate-types.js';

try {
	generate_types();
} catch (error) {
	if (!(error instanceof GenerateTypesError)) throw error;
	if (error.diagnostics.length > 0) {
		console.error(
			ts.formatDiagnosticsWithColorAndContext(error.diagnostics, {
				getCanonicalFileName: (file) => file,
				getCurrentDirectory: () => process.cwd(),
				getNewLine: () => ts.sys.newLine,
			}),
		);
	}
	console.error(error.message);
	process.exit(1);
}
