import { get_doc } from '$lib/utils';

export async function load({ params }) {
	return get_doc(params.slug || undefined);
}
