<script lang="ts">
	import type { Snippet } from 'svelte';
	import Simge from './Simge.svelte';

	type Props = {
		baslik: string;
		/** Başlığın üstündeki küçük etiket */
		ust?: string;
		aciklama?: string | null;
		geri?: { href: string; etiket: string };
		/** Sağdaki (mobilde alttaki) düğmeler */
		eylemler?: Snippet;
		/** Açıklamanın altına eklenecek içerik (rozetler vb.) */
		children?: Snippet;
	};
	let { baslik, ust, aciklama, geri, eylemler, children }: Props = $props();
</script>

<header class="sayfa-basligi">
	{#if geri}
		<a class="geri" href={geri.href}><Simge ad="geri" boyut={16} /> {geri.etiket}</a>
	{/if}
	<div class="ana">
		<div class="metin">
			{#if ust}<p class="ust">{ust}</p>{/if}
			<h1>{baslik}</h1>
			{#if aciklama}<p class="aciklama">{aciklama}</p>{/if}
			{@render children?.()}
		</div>
		{#if eylemler}<div class="eylemler">{@render eylemler()}</div>{/if}
	</div>
</header>

<style>
	.sayfa-basligi {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.geri {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		align-self: flex-start;
		font-size: var(--boyut-sm);
		font-weight: 550;
		color: var(--metin-soluk);
		text-decoration: none;
	}
	.geri:hover {
		color: var(--vurgu);
	}
	.ana {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--a-4);
	}
	.metin {
		min-width: 0;
		flex: 1 1 22rem;
	}
	.ust {
		margin: 0 0 var(--a-1);
		font-size: var(--boyut-xs);
		font-weight: 650;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	h1 {
		margin: 0;
		font-size: clamp(1.65rem, 4.5vw, 2.35rem);
		letter-spacing: -0.02em;
	}
	.aciklama {
		margin: var(--a-2) 0 0;
		max-width: 42rem;
		color: var(--metin-soluk);
	}
	.eylemler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
</style>
