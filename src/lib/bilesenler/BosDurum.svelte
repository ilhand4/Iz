<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { baslik: string; aciklama?: string; eylemler?: Snippet };
	let { baslik, aciklama, eylemler }: Props = $props();
</script>

<div class="bos-durum">
	<svg class="cizim" viewBox="0 0 180 64" aria-hidden="true">
		<path class="yol" d="M18 46 C 50 46, 52 18, 90 18 S 132 44, 162 22" />
		<circle cx="18" cy="46" r="7" class="d1" />
		<circle cx="90" cy="18" r="7" class="d2" />
		<circle cx="162" cy="22" r="7" class="d3" />
	</svg>
	<h2>{baslik}</h2>
	{#if aciklama}<p>{aciklama}</p>{/if}
	{#if eylemler}<div class="satir eylemler">{@render eylemler()}</div>{/if}
</div>

<style>
	.bos-durum {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--a-6) var(--a-4);
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
	}
	.cizim {
		width: 11rem;
		margin-bottom: var(--a-4);
	}
	.yol {
		fill: none;
		stroke: var(--vurgu);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-dasharray: 0.1 7;
	}
	circle {
		stroke: var(--yuzey);
		stroke-width: 3;
	}
	.d1 {
		fill: var(--tur-ani);
	}
	.d2 {
		fill: var(--tur-eser);
	}
	.d3 {
		fill: var(--cizgi-guclu);
	}
	h2 {
		font-size: var(--boyut-xl);
		margin-bottom: var(--a-2);
	}
	p {
		max-width: 30rem;
		color: var(--metin-soluk);
		margin: 0;
	}
	.eylemler {
		justify-content: center;
		margin-top: var(--a-4);
	}
</style>
