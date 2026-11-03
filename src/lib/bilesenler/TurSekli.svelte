<script lang="ts" module>
	import type { DugumTuru } from '#lib/sabitler.ts';

	/**
	 * Her türün şekli: renge ek olarak şekil, türleri renk körü kullanıcılar için de ayırt edilebilir kılar.
	 * Ağ görünümündeki Cytoscape şekilleriyle aynıdır (AgGorunumu.svelte → CYTOSCAPE_SEKLI).
	 */
	export const SEKIL_YOLU: Record<DugumTuru, string> = {
		eser: 'M4.5 3h7A2.5 2.5 0 0 1 14 5.5v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 10.5v-5A2.5 2.5 0 0 1 4.5 3z',
		kisi: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z',
		yer: 'M8 2.5 14 13H2z',
		karar: 'M8 1.8 14.2 8 8 14.2 1.8 8z',
		ani: 'M8 2l6.2 4.5-2.4 7.3H4.2L1.8 6.5z'
	};
</script>

<script lang="ts">
	let { tur, boyut = 12 }: { tur: DugumTuru; boyut?: number } = $props();
</script>

<svg
	class="tur-sekli"
	data-tur={tur}
	width={boyut}
	height={boyut}
	viewBox="0 0 16 16"
	aria-hidden="true"
	focusable="false"
>
	<path d={SEKIL_YOLU[tur]} />
</svg>

<style>
	.tur-sekli {
		flex: none;
		display: inline-block;
		vertical-align: -0.1em;
	}
	path {
		fill: var(--renk, currentColor);
		stroke: var(--renk, currentColor);
		stroke-width: 1.6;
		stroke-linejoin: round;
	}
	[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
</style>
