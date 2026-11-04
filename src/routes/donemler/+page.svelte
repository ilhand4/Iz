<script lang="ts">
	import { enhance } from '$app/forms';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import DonemFormu from '#lib/bilesenler/DonemFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import { DONEM_RENGI_DEGISKENI, type DonemRengi } from '#lib/sabitler.ts';
	import { tarihGirdisi } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	type Hata = { id?: string; hatalar: Record<string, string>; degerler: Record<string, string> };
	const ekleHata = $derived((form as { ekle?: Hata } | null)?.ekle ?? null);
	const guncelleHata = $derived((form as { guncelle?: Hata } | null)?.guncelle ?? null);

	const aralik = (d: { baslangic: string; bitis: string | null }) =>
		`${d.baslangic.slice(0, 4)} – ${d.bitis ? d.bitis.slice(0, 4) : 'sürüyor'}`;
	const renkDegiskeni = (r: string) => DONEM_RENGI_DEGISKENI[r as DonemRengi] ?? '--vurgu';
</script>

<svelte:head><title>Dönemler · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Dönemler"
		aciklama="Hayatının bölümleri: “Kadıköy yılları”, “Berlin’de ilk kış”… Zaman çizgisinde renkli bantlar, ağda düğümlerin çevresinde hale olarak görünürler."
		geri={{ href: '/dugumler/zaman', etiket: 'Zaman çizgisi' }}
	/>

	<div class="duzen">
		<section class="yigin" aria-labelledby="liste-baslik">
			<h2 id="liste-baslik">Dönemlerin</h2>
			{#if data.donemler.length}
				<ul class="liste">
					{#each data.donemler as d (d.id)}
						{@const hata = guncelleHata?.id === d.id ? guncelleHata : null}
						<li class="kart" style:--renk="var({renkDegiskeni(d.renk)})">
							<div class="ust">
								<span class="bant" aria-hidden="true"></span>
								<span class="metin">
									<strong>{d.ad}</strong>
									<small class="soluk">{aralik(d)}</small>
								</span>
								<form method="POST" action="?/sil" use:enhance>
									<input type="hidden" name="id" value={d.id} />
									<button class="dugme dugme-kucuk dugme-hayalet" aria-label="{d.ad} dönemini sil"
										>Sil</button
									>
								</form>
							</div>
							<details open={!!hata}>
								<summary>Düzenle</summary>
								<DonemFormu
									eylem="?/guncelle"
									onek="d-{d.id}"
									id={d.id}
									degerler={hata?.degerler ?? {
										ad: d.ad,
										baslangic: tarihGirdisi(d.baslangic, 'gun'),
										bitis: d.bitis ? tarihGirdisi(d.bitis, 'gun') : '',
										renk: d.renk
									}}
									hatalar={hata?.hatalar}
									gonderMetni="Kaydet"
								/>
							</details>
						</li>
					{/each}
				</ul>
			{:else}
				<BosDurum
					baslik="Henüz dönem yok"
					aciklama="Bir dönem eklediğinde zaman çizgin ve ağın o yılları renkle ayırır."
				/>
			{/if}
		</section>
		<section class="kart yigin" aria-labelledby="yeni-baslik">
			<h2 id="yeni-baslik">Yeni dönem</h2>
			<DonemFormu
				eylem="?/ekle"
				onek="yeni"
				degerler={ekleHata?.degerler}
				hatalar={ekleHata?.hatalar}
				gonderMetni="Dönemi ekle"
			/>
		</section>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	.duzen {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.ust {
		display: flex;
		align-items: center;
		gap: var(--a-3);
	}
	.bant {
		flex: none;
		width: 0.4rem;
		align-self: stretch;
		border-radius: var(--yaricap-tam);
		background: var(--renk);
	}
	.metin {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.ust form {
		margin: 0;
	}
	details summary {
		cursor: pointer;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
		margin-top: var(--a-2);
	}
	details[open] summary {
		margin-bottom: var(--a-3);
	}
	@media (min-width: 56rem) {
		.duzen {
			grid-template-columns: 1.4fr 1fr;
		}
	}
</style>
