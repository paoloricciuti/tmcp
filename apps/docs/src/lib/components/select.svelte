<script lang="ts">
	import { NativeSelect, Label } from '@svecodocs/kit';
	import type { Snippet } from 'svelte';

	const {
		options,
		title,
		children,
	}: { options: string[]; children: Snippet<[string]>; title: string } =
		$props();

	let value = $state(options[0]);
</script>

<Label class="mt-8 inline-block">
	Adapter
	<NativeSelect class="mt-4" bind:value>
		{#each options as option}
			<option value={option}>{option}</option>
		{/each}
	</NativeSelect>
</Label>

{@render children?.(value)}
