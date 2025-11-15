import { docs, type Doc } from '$content/index.js';
import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';

export function get_doc_metadata(slug: string = 'index') {
	return docs.find((doc) => clean_slug(doc.slug) === slug);
}

export function get_all_docs() {
	return docs.toSorted((a, b) => {
		const order_a = a.path.match(/(\d{3,})-/);
		const order_b = b.path.match(/(\d{3,})-/);
		const num_a = order_a ? parseInt(order_a[1], 10) : Infinity;
		const num_b = order_b ? parseInt(order_b[1], 10) : Infinity;
		return num_a - num_b;
	});
}

function slug_from_path(path: string) {
	return clean_slug(path.replace('/src/content/', '').replace('.md', ''));
}

export function clean_slug(slug: string) {
	return slug.replace(/\d{3,}-/, '');
}

export type DocResolver = () => Promise<{ default: Component; metadata: Doc }>;

export async function get_doc(slug: string = 'index') {
	const modules = import.meta.glob('/src/content/**/*.md');

	let match: { path?: string; resolver?: DocResolver } = {};

	for (const [path, resolver] of Object.entries(modules)) {
		console.log(slug_from_path(path), slug);
		if (slug_from_path(path) === slug) {
			match = { path, resolver: resolver as unknown as DocResolver };
			break;
		}
	}
	const doc = await match?.resolver?.();
	const metadata = get_doc_metadata(slug);
	if (!doc || !metadata) {
		error(404, 'Could not find the document.');
	}

	return {
		component: doc.default,
		metadata,
	};
}
