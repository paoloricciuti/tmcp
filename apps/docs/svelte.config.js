import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsx } from 'mdsx';
import mdsxConfig from './mdsx.config.js';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [mdsx(mdsxConfig), vitePreprocess()],
	kit: {
		alias: { '$content/*': '.velite/*' },
		adapter: adapter(),
		prerender: {
			handleMissingId({ id }) {
				if (id !== 'empty')
					throw new Error(`Missing prerender id: ${id}`);
			},
		},
	},
	extensions: ['.svelte', '.md'],
};

export default config;
