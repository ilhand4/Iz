<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		id: string;
		etiket: string;
		hata?: string | null;
		ipucu?: string | null;
		children: Snippet;
	};
	let { id, etiket, hata = null, ipucu = null, children }: Props = $props();
</script>

<div class="alan">
	<label for={id}>{etiket}</label>
	{@render children()}
	{#if ipucu && !hata}<span class="ipucu" id="{id}-ipucu">{ipucu}</span>{/if}
	{#if hata}<span class="hata-metni" id="{id}-hata" role="alert">{hata}</span>{/if}
</div>
