<script lang="ts">
	import type { DugumTuru, Gizlilik } from '#lib/sabitler.ts';
	import { gunYaz } from '#lib/tarih.ts';
	import GizlilikRozeti from './GizlilikRozeti.svelte';
	import TurSekli from './TurSekli.svelte';

	type Props = {
		iz: {
			id: string;
			baslik: string;
			aciklama: string | null;
			gizlilik: Gizlilik;
			guncelleme: Date;
			durakSayisi: number;
			duraklar: { id: string; baslik: string; tur: DugumTuru }[];
			ilkDurak: { baslik: string } | null;
			sonDurak: { baslik: string } | null;
		};
	};
	let { iz }: Props = $props();
	const fazlasi = $derived(iz.durakSayisi - iz.duraklar.length);
</script>

<a class="iz-karti" href="/izler/{iz.id}">
	<span class="ust">
		<span class="baslik">{iz.baslik}</span>
		{#if iz.gizlilik !== 'ozel'}<GizlilikRozeti gizlilik={iz.gizlilik} />{/if}
	</span>
	{#if iz.aciklama}<span class="aciklama">{iz.aciklama}</span>{/if}

	{#if iz.duraklar.length}
		<span class="yol" aria-label="Duraklar: {iz.duraklar.map((d) => d.baslik).join(', ')}">
			{#each iz.duraklar as d (d.id)}
				<span class="durak" title={d.baslik}><TurSekli tur={d.tur} boyut={14} /></span>
			{/each}
			{#if fazlasi > 0}<span class="fazla">+{fazlasi}</span>{/if}
		</span>
		<span class="ilk-son">
			{iz.ilkDurak?.baslik}
			{#if iz.sonDurak}<span class="ok" aria-hidden="true">→</span> {iz.sonDurak.baslik}{/if}
		</span>
	{:else}
		<span class="bos">Henüz durak yok</span>
	{/if}

	<span class="meta">{iz.durakSayisi} durak · {gunYaz(iz.guncelleme)}</span>
</a>

<style>
	.iz-karti {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		padding: var(--a-4);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		box-shadow: var(--golge-1);
		color: var(--metin);
		text-decoration: none;
		transition:
			box-shadow var(--gecis),
			border-color var(--gecis),
			transform var(--gecis);
	}
	.iz-karti:hover {
		color: var(--metin);
		border-color: var(--cizgi-guclu);
		box-shadow: var(--golge-2);
		transform: translateY(-1px);
	}
	.ust {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--a-2);
	}
	.baslik {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-weight: 600;
		line-height: 1.25;
	}
	.aciklama {
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.yol {
		position: relative;
		display: flex;
		width: fit-content;
		max-width: 100%;
		align-items: center;
		gap: var(--a-3);
		margin-top: var(--a-1);
		padding: var(--a-1) 0;
	}
	/* Duraklar arasındaki noktalı iz */
	.yol::before {
		content: '';
		position: absolute;
		left: 7px;
		right: 7px;
		top: 50%;
		border-top: 2px dotted color-mix(in srgb, var(--vurgu) 70%, transparent);
	}
	.durak {
		position: relative;
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
	}
	.fazla {
		position: relative;
		padding: 0 var(--a-1);
		background: var(--yuzey);
		font-size: var(--boyut-xs);
		font-weight: 600;
		color: var(--metin-soluk);
	}
	.ilk-son {
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ok {
		color: var(--vurgu);
	}
	.bos {
		font-size: var(--boyut-sm);
		color: var(--metin-silik);
		font-style: italic;
	}
	.meta {
		margin-top: auto;
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}
</style>
