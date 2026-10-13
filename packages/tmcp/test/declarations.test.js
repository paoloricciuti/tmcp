// These tests use the generated declarations in `types`: run
// `pnpm generate:types` after changing the types of the sources.
import { fileURLToPath } from 'node:url';
import { check_consumer } from '@tmcp/internal-ts-helpers/check-consumer';
import { describe, expect, it } from 'vitest';

const tmcp = fileURLToPath(new URL('..', import.meta.url));

/**
 * @param {Record<string, string>} files
 * @param {Record<string, unknown>} [compilerOptions]
 */
function check(files, compilerOptions) {
	return check_consumer({ packages: [tmcp], files, compilerOptions });
}

describe('declarations', () => {
	it('lets consumers emit declarations for the values they export', () => {
		const { diagnostics, declarations } = check(
			{
				'src/index.ts': `
import { McpServer } from 'tmcp';
import { defineTool } from 'tmcp/tool';
import { definePrompt } from 'tmcp/prompt';
import { defineResource } from 'tmcp/resource';
import { defineTemplate } from 'tmcp/template';
import { tool, prompt, resource } from 'tmcp/utils';

export const greet = defineTool({ name: 'greet', description: 'Greet' }, () => tool.text('hi'));
export const ask = definePrompt({ name: 'ask', description: 'Ask' }, () => prompt.message('hi'));
export const readme = defineResource({ name: 'readme', description: 'Readme', uri: 'file:///readme' }, (uri) => resource.text(uri, 'hi'));
export const user = defineTemplate({ name: 'user', description: 'User', uri: 'users://{id}' }, (uri) => resource.text(uri, 'hi'));
export function all_tools() {
	return [greet] as const;
}

const server = new McpServer({ name: 'server', version: '1.0.0' }, { adapter: undefined });
export const on = server.on.bind(server);
export const changed = server.changed.bind(server);
export const mixed = tool.mix([tool.text('a')], { a: 1 });
`,
			},
			{ declaration: true },
		);
		expect(diagnostics).toEqual([]);
		const output = declarations['index.d.ts'];
		expect(output).toContain(
			'import("tmcp/tool").CreatedTool<undefined, undefined>',
		);
		expect(output).toContain(
			'import("tmcp/prompt").CreatedPrompt<undefined>',
		);
		expect(output).toContain('import("tmcp/resource").CreatedResource');
		expect(output).toContain(
			'import("tmcp/template").CreatedTemplate<"users://{id}">',
		);
		expect(output).not.toContain('/types/');
	});

	it.each(['nodenext', 'node16', 'bundler', 'node10'])(
		'resolves every entry point with moduleResolution %s',
		(module_resolution) => {
			const { diagnostics } = check(
				{
					'src/index.ts': `
import { McpServer } from 'tmcp';
import { defineTool } from 'tmcp/tool';
import { definePrompt } from 'tmcp/prompt';
import { defineResource } from 'tmcp/resource';
import { defineTemplate } from 'tmcp/template';
import { JsonSchemaAdapter } from 'tmcp/adapter';
import { isPerRequestMethodAllowed } from 'tmcp/method-policy';
import { tool } from 'tmcp/utils';
import type { StandardSchemaV1 } from '@standard-schema/spec';

declare const schema: StandardSchemaV1<{ name: string }>;

class Adapter extends JsonSchemaAdapter<StandardSchemaV1> {
	async toJsonSchema(schema: StandardSchemaV1) {
		return { type: 'object' as const };
	}
}

const server = new McpServer({ name: 'server', version: '1.0.0' }, { adapter: new Adapter() });
server.tool({ name: 'a', description: 'A', schema }, ({ name }) => tool.text(name));
server.tool(defineTool({ name: 'b', description: 'B', schema }, ({ name }) => tool.text(name)));
server.prompt(definePrompt({ name: 'c', description: 'C' }, () => ({ messages: [] })));
server.resource(defineResource({ name: 'd', description: 'D', uri: 'd://' }, () => ({ contents: [] })));
server.template(defineTemplate({ name: 'e', description: 'E', uri: 'e://{id}' }, () => ({ contents: [] })));
isPerRequestMethodAllowed('tools/list');
`,
				},
				module_resolution === 'nodenext' ||
					module_resolution === 'node16'
					? {
							module: module_resolution,
							moduleResolution: module_resolution,
						}
					: { module: 'esnext', moduleResolution: module_resolution },
			);
			expect(diagnostics).toEqual([]);
		},
	);

	it('accepts the tools of libraries built against previous versions', () => {
		const { diagnostics } = check({
			// what libraries emitted with the previous bundled declarations
			'src/library.d.ts': `
export declare const tool: {
	name: string;
	description: string;
	schema?: undefined;
	outputSchema?: undefined;
} & {
	[created_tool]: created_tool;
};
export declare const prompt: {
	name: string;
	description: string;
	schema?: undefined;
} & {
	[created_prompt]: created_prompt;
};
`,
			'src/index.ts': `
import { McpServer } from 'tmcp';
import { tool, prompt } from './library.js';

const server = new McpServer({ name: 'server', version: '1.0.0' }, { adapter: undefined });
server.tool(tool);
server.tools([tool]);
server.prompt(prompt);
// @ts-expect-error tools must be created with defineTool
server.tools([{ name: 'plain', description: 'Plain' }]);
`,
		});
		expect(diagnostics).toEqual([]);
	});
});
