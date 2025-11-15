import { defineSiteConfig } from '@svecodocs/kit';

export const siteConfig = defineSiteConfig({
	name: 'tmcp',
	url: 'https://tmcp.io',
	ogImage: {
		url: 'https://tmcp.io/og.png',
		height: '630',
		width: '1200',
	},
	description: 'A modern SDK to build MCP servers in TypeScript.',
	author: 'Paolo Ricciuti',
	keywords: ['mcp', 'model context protocol', 'typescript', 'sdk'],
	license: {
		name: 'MIT',
		url: 'https://github.com/svecosystem/svecodocs/blob/main/LICENSE',
	},
	links: {
		github: 'https://github.com/paoloricciuti/tmcp',
	},
});
