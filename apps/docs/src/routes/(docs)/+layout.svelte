<script lang="ts">
	import TmcpLogo from '$lib/components/logos/tmcp.svelte';
	import { navigation } from '$lib/navigation';
	import { DocsLayout } from '@svecodocs/kit';

	let { children } = $props();
</script>

<DocsLayout {navigation}>
	{#snippet logo()}
		<TmcpLogo class="max-h-6" />
	{/snippet}

	{@render children?.()}
</DocsLayout>
