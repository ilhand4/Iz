<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import MasaFormu from '#lib/bilesenler/MasaFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import { GIZLILIK_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const degerler = $derived(form?.degerler ?? (data.eser ? { eserId: data.eser } : {}));
</script>

<svelte:head><title>Çeviri masası · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Okuma"
		baslik="Çeviri masası"
		aciklama="Aynı paragrafın farklı Türkçe çevirilerini yan yana koy, farklarını gör, en sevdiğine oy ver, tartış. Çeviriler inceleme amaçlı kısa alıntılardır: her biri en çok birkaç cümle ve kaynağıyla birlikte."
	/>

	<div class="duzen">
		<section class="yigin" aria-labelledby="masalar-baslik">
			<h2 id="masalar-baslik">Masalar</h2>
			{#if data.masalar.length}
				<ul class="liste">
					{#each data.masalar as m (m.id)}
						<li>
							<a class="kart masa" href="/ceviri/{m.id}">
								<strong>{m.baslik}</strong>
								<small class="soluk">
									{m.ozgunDil ? `${m.ozgunDil} · ` : ''}{m.paragraf} paragraf · {GIZLILIK_ETIKETI[
										m.gizlilik
									]}{m.sahibiMi ? '' : ` · ${m.sahip}`}
								</small>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<BosDurum
					baslik="Henüz masan yok"
					aciklama="Sevdiğin bir kitabın farklı çevirilerini karşılaştırmak için bir masa aç; bir paragraf seç ve elindeki baskılardan çevirileri ekle."
				/>
			{/if}
		</section>

		<section class="kart yigin" aria-labelledby="yeni-baslik">
			<h2 id="yeni-baslik">Yeni masa</h2>
			<MasaFormu
				eylem="?"
				{degerler}
				hatalar={form?.hatalar ?? {}}
				eserler={data.eserler}
				gonderMetni="Masayı aç"
			/>
		</section>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.duzen {
		display: grid;
		gap: var(--a-5);
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
	}
	@media (min-width: 60rem) {
		.duzen {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		}
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.masa {
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: var(--metin);
		text-decoration: none;
	}
	.masa:hover {
		border-color: var(--vurgu);
	}
	.masa strong {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-weight: 550;
	}
</style>
