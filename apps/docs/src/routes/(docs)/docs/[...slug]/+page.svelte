<script lang="ts">
	import Wrapper, {
		set_component,
	} from '$lib/components/prev-next-wrapper.svelte';
	import { DocPage } from '@svecodocs/kit';
	let { data } = $props();

	set_component(() => data.component);
</script>

<DocPage component={Wrapper} {...data.metadata} />
