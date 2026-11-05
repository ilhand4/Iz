<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import GorunumSecici from '#lib/bilesenler/GorunumSecici.svelte';
	import HaritaGorunumu from '#lib/bilesenler/HaritaGorunumu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { bagCizgileri, yerAnahtari, yerlereGrupla } from '#lib/konumlar.ts';
	import { DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const yerler = $derived(yerlereGrupla(data.dugumler));
	const cizgiler = $derived(bagCizgileri(data.baglar, data.dugumler));

	const odakDugumu = $derived(data.dugumler.find((d) => d.id === data.odakId));
	// Adresteki ?odak= ile gelinince o düğümün yeri seçili açılır; sonra kullanıcı değiştirir
	let secili = $derived<string | null>(
		odakDugumu ? yerAnahtari(odakDugumu.enlem, odakDugumu.boylam) : null
	);
	const seciliYer = $derived(yerler.find((y) => y.anahtar === secili) ?? null);

	let harita: HaritaGorunumu | undefined = $state();
	let panel: HTMLElement | undefined = $state();

	function sec(anahtar: string) {
		secili = anahtar;
	}
	function listedenSec(anahtar: string) {
		secili = anahtar;
		// Mobilde harita yukarıda kalır; seçimi görmek için panele kaydır
		queueMicrotask(() => panel?.focus());
	}
</script>

<svelte:head><title>Harita · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Harita"
		aciklama="Konumu olan düğümlerin yerleri. Aynı yerdeki düğümler tek işarette toplanır; kesikli çizgiler aralarındaki bağlardır."
	/>

	<GorunumSecici etkin="harita" />

	{#if !yerler.length}
		<BosDurum
			baslik="Haritanda henüz yer yok"
			aciklama="Bir düğümü düzenlerken “Konum” bölümünden haritaya tıklayarak yerini seçebilirsin. Yer ve kişi düğümlerinde Wikidata da konumu doldurabilir."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni?tur=yer">Bir yer ekle</a>
			{/snippet}
		</BosDurum>
	{:else}
		<div class="duzen">
			<div class="yigin harita-sutunu">
				<HaritaGorunumu bind:this={harita} {yerler} {cizgiler} {secili} onsec={sec} />
				<div class="satir arasi">
					<p class="kucuk soluk">
						{yerler.length} yer, {data.dugumler.length} düğüm{data.konumsuz
							? ` · ${data.konumsuz} düğümün konumu yok`
							: ''}
					</p>
					<button class="dugme dugme-kucuk dugme-hayalet" onclick={() => harita?.tumunuGoster()}>
						<Simge ad="sigdir" boyut={16} /> Tümünü göster
					</button>
				</div>
			</div>

			<aside class="yigin panel" aria-labelledby="yerler-baslik">
				{#if seciliYer}
					<section
						class="kart secili"
						aria-labelledby="secili-baslik"
						tabindex="-1"
						bind:this={panel}
					>
						<div class="satir arasi">
							<h2 id="secili-baslik">{seciliYer.ad}</h2>
							<button
								class="dugme dugme-kucuk dugme-hayalet"
								aria-label="Seçimi kaldır"
								onclick={() => (secili = null)}><Simge ad="kapat" boyut={16} /></button
							>
						</div>
						<ul class="dugum-listesi">
							{#each seciliYer.dugumler as d (d.id)}
								<li>
									<a href="/dugumler/{d.id}">
										<TurSekli tur={d.tur} boyut={13} />
										<span>{d.baslik}</span>
										<small class="soluk">{DUGUM_TURU_ETIKETI[d.tur]}</small>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				<h2 id="yerler-baslik" class="liste-basligi">Yerler</h2>
				<ul class="yer-listesi">
					{#each yerler as y (y.anahtar)}
						<li>
							<button
								type="button"
								aria-pressed={secili === y.anahtar}
								onclick={() => listedenSec(y.anahtar)}
							>
								<TurSekli tur={y.dugumler[0].tur} boyut={12} />
								<span class="ad">{y.ad}</span>
								<span class="sayi">{y.dugumler.length}</span>
							</button>
						</li>
					{/each}
				</ul>
			</aside>
		</div>
	{/if}
</div>

<style>
	.duzen {
		display: grid;
		gap: var(--a-4);
		grid-template-columns: minmax(0, 1fr);
	}
	@media (min-width: 60rem) {
		.duzen {
			grid-template-columns: minmax(0, 2.2fr) minmax(16rem, 1fr);
			align-items: start;
		}
		.panel {
			position: sticky;
			top: calc(var(--ust-yukseklik) + var(--a-4));
			max-height: calc(100dvh - var(--ust-yukseklik) - var(--a-6));
			overflow: auto;
		}
	}
	.harita-sutunu .arasi {
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
	}
	.harita-sutunu p {
		margin: 0;
	}
	.secili {
		border-left: 4px solid var(--vurgu);
	}
	.secili:focus {
		outline: none;
	}
	.secili:focus-visible {
		outline: 3px solid var(--vurgu);
	}
	.secili .arasi {
		justify-content: space-between;
		align-items: center;
	}
	h2 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.liste-basligi {
		font-size: var(--boyut-md);
	}
	.dugum-listesi,
	.yer-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.dugum-listesi {
		margin-top: var(--a-3);
		gap: var(--a-1);
	}
	.dugum-listesi a {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-1) 0;
		color: var(--metin);
		font-weight: 550;
	}
	.dugum-listesi small {
		margin-left: auto;
		font-weight: 400;
	}
	.yer-listesi {
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		overflow: hidden;
	}
	.yer-listesi li + li {
		border-top: 1px solid var(--cizgi);
	}
	.yer-listesi button {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		width: 100%;
		min-height: 2.75rem;
		padding: var(--a-2) var(--a-3);
		border: 0;
		background: none;
		color: var(--metin);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.yer-listesi button:hover {
		background: var(--yuzey-2);
	}
	.yer-listesi button[aria-pressed='true'] {
		background: var(--vurgu-zemin);
	}
	.yer-listesi .ad {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.yer-listesi .sayi {
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
		font-variant-numeric: tabular-nums;
	}
</style>
