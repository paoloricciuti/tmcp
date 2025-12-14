import { defineConfig, s } from 'velite';

const base_schema = s.object({
	title: s.string(),
	description: s.string(),
	path: s.path(),
	content: s.markdown(),
	navLabel: s.string().optional(),
	raw: s.raw(),
	toc: s.toc(),
	section: s.enum([
		'Overview',
		'Core',
		'Transports',
		'Auth',
		'Utils',
		'Session Managers',
	]),
});

const doc_schema = base_schema.transform((data) => {
	return {
		...data,
		slug: data.path,
		slugFull: `/${data.path}`,
	};
});

export default defineConfig({
	root: './src/content',
	collections: {
		docs: {
			name: 'Doc',
			pattern: './**/*.md',
			schema: doc_schema,
		},
	},
});
