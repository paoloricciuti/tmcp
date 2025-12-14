<script lang="ts">
	import { TabItem, Tabs } from '@svecodocs/kit';
	import type { Snippet } from 'svelte';

	let managers: Record<string, Snippet> = $props();
	let items = $derived(Object.keys(managers));
</script>

<Tabs {items}>
	{#each items as name}
		<TabItem value={name} children={managers[name]} />
	{/each}
</Tabs>
