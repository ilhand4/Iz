<script lang="ts">
	import {
		durumEtiketi,
		type DugumTuru,
		type EserDurumu,
		type EserTuru,
		type Gizlilik,
		type TarihHassasiyeti
	} from '#lib/sabitler.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import GizlilikRozeti from './GizlilikRozeti.svelte';
	import TurRozeti from './TurRozeti.svelte';

	type Props = {
		dugum: {
			id: string;
			tur: DugumTuru;
			eserTuru: EserTuru | null;
			baslik: string;
			altBaslik: string | null;
			gorselUrl: string | null;
			gizlilik: Gizlilik;
			tarih: string | null;
			tarihHassasiyeti: TarihHassasiyeti | null;
			durum?: EserDurumu | null;
		};
	};
	let { dugum }: Props = $props();
</script>

<a
	class="dugum-karti"
	href="/dugumler/{dugum.id}"
	data-tur={dugum.tur}
	data-durum={dugum.durum ?? undefined}
>
	{#if dugum.gorselUrl}
		<img src={dugum.gorselUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
	{:else}
		<span class="yer-tutucu" aria-hidden="true">{dugum.baslik.slice(0, 1)}</span>
	{/if}
	<span class="govde">
		<span class="baslik">{dugum.baslik}</span>
		{#if dugum.altBaslik}<span class="alt">{dugum.altBaslik}</span>{/if}
		<span class="satir">
			<TurRozeti tur={dugum.tur} eserTuru={dugum.eserTuru} />
			{#if dugum.durum && dugum.durum !== 'bitti'}
				<span class="rozet durum">{durumEtiketi(dugum.durum, dugum.eserTuru)}</span>
			{/if}
			{#if dugum.gizlilik !== 'ozel'}<GizlilikRozeti gizlilik={dugum.gizlilik} />{/if}
			{#if dugum.tarih}
				<span class="kucuk soluk">{tarihYaz(dugum.tarih, dugum.tarihHassasiyeti)}</span>
			{/if}
		</span>
	</span>
</a>

<style>
	/* Merak edilen eser henüz yaşanmadı: kesik çizgili, soluk kart */
	.dugum-karti[data-durum='merak'] {
		border-style: dashed;
		border-left-style: dashed;
		background: transparent;
	}
	.durum {
		background: var(--yuzey-2);
		color: var(--metin-soluk);
		box-shadow: inset 0 0 0 1px var(--cizgi-guclu);
	}
	.dugum-karti {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-left: 3px solid var(--renk);
		border-radius: var(--yaricap);
		color: var(--metin);
		text-decoration: none;
		transition:
			border-color var(--gecis),
			box-shadow var(--gecis);
		--renk: var(--cizgi-guclu);
	}
	.dugum-karti:hover {
		color: var(--metin);
		box-shadow: var(--golge-2);
	}
	.dugum-karti[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.dugum-karti[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.dugum-karti[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.dugum-karti[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.dugum-karti[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	img,
	.yer-tutucu {
		flex: none;
		width: 3rem;
		height: 4.25rem;
		border-radius: var(--yaricap-sm);
		object-fit: cover;
		background: var(--yuzey-2);
	}
	.yer-tutucu {
		display: grid;
		place-items: center;
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-xl);
		color: var(--renk);
	}
	.govde {
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
		min-width: 0;
	}
	.baslik {
		font-weight: 600;
		line-height: 1.3;
	}
	.alt {
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
</style>
