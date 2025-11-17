<script lang="ts" module>
	import type { Component as ComponentType } from 'svelte';

	import { createContext } from 'svelte';

	const [get_component, set_component] = createContext<() => ComponentType>();
	export { set_component };
</script>

<script lang="ts">
	import { page } from '$app/state';
	import { navigation } from '$lib/navigation';
	import {
		Card,
		type AnchorNavItem,
		type SidebarNavItem,
	} from '@svecodocs/kit';

	let Component = $derived.by(get_component());
	let prev_next = $derived.by(() => {
		const items: Array<SidebarNavItem | AnchorNavItem> = (
			navigation.anchors?.filter(({ href }) => href.startsWith('/')) ??
			([] as Array<SidebarNavItem | AnchorNavItem>)
		).concat(
			navigation.sections?.flatMap((section) => section.items ?? []) ??
				[],
		);
		const current_section = `/docs${page.params.slug ? `/${page.params.slug}` : ''}`;
		const current_idx = items.findIndex(
			(item) => item.href === current_section,
		);
		return {
			prev: items[current_idx - 1],
			next: items[current_idx + 1],
		};
	});
</script>

<Component />

<div
	class="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 [&_a:nth-child(2)]:text-right [&_a:nth-child(2)_>_div]:ml-auto **:[[role='heading']]:text-brand"
>
	{#if prev_next.prev}
		<Card href={prev_next.prev.href} title="Previous" horizontal>
			{prev_next.prev.title}
		</Card>
	{:else}
		<!-- just here to make the next align right -->
		<a href="#empty" class="pointer-events-none" aria-hidden="true"></a>
	{/if}
	{#if prev_next.next}
		<Card href={prev_next.next.href} title="Next" horizontal>
			{prev_next.next.title}
		</Card>
	{/if}
</div>
