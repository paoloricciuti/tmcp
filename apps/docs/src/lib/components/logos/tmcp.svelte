<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	let rest: SVGAttributes<SVGElement> & { logotype?: boolean } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 220 220"
	fill-rule="evenodd"
	fill="none"
	width="220px"
	height="220px"
	{...rest}
	><defs /><g transform="matrix(1, 0, 0, 1, -36.235378, -106.895195)"
		><path
			d="M 101.981 201.272 L 169.863 133.39 C 179.236 124.017 194.432 124.017 203.804 133.39 C 213.177 142.762 213.177 157.958 203.804 167.331 L 152.539 218.596"
			stroke="currentColor"
			stroke-width="12"
			stroke-linecap="round"
			style="stroke-width: 12;"
		/><path
			d="M 153.246 217.889 L 203.804 167.331 C 213.177 157.958 228.373 157.958 237.746 167.331 L 238.099 167.684 C 247.472 177.057 247.472 192.253 238.099 201.625 L 176.706 263.019 C 173.582 266.143 173.582 271.208 176.706 274.332 L 189.312 286.939 A 1 1 90 1 1 172.342 303.909 L 77.342 208.909 Q 67.342 198.909 77.342 188.909 L 127.342 138.909"
			stroke="currentColor"
			stroke-width="12"
			stroke-linecap="round"
			style="stroke-width: 12;"
		/><path
			d="M 186.834 150.36 L 136.629 200.565 C 127.257 209.937 127.257 225.133 136.629 234.506 C 146.002 243.878 161.198 243.878 170.57 234.506 L 220.775 184.301"
			stroke="currentColor"
			stroke-width="12"
			stroke-linecap="round"
			style="stroke-width: 12;"
		/><path
			stroke="currentColor"
			style="stroke-width: 12px; stroke-linecap: round;"
			d="M 127.342 138.909 L 47.342 218.909"
		/></g
	></svg
>
{#if rest.logotype !== false}
	<span>tmcp</span>
{/if}
