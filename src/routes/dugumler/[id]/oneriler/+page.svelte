<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const bosBulgu = $derived(
		!data.eslesenler.length && !data.yeniler.length && !(data.yillar.length && !data.tarihVar)
	);
</script>

<svelte:head><title>Anlatılandan öneriler · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust={data.baslik}
		baslik="Anlatılandan öneriler"
		aciklama="Açıklamada ve seslerin metninde geçen kişi, yer ve yıllar. Bu bilgisayarda, basit Türkçe kurallarla bulundu; hiçbir yere gönderilmedi. Kesin değildir: seçtiklerini ekle, adları ve türleri düzeltebilirsin."
		geri={{ href: `/dugumler/${data.id}`, etiket: data.baslik }}
	/>

	{#if data.bosMu}
		<BosDurum
			baslik="Taranacak metin yok"
			aciklama="Anıya bir açıklama yaz ya da sesli anı ekle; yazıya döküldükten sonra buraya dön."
		/>
	{:else if bosBulgu}
		<BosDurum
			baslik="Öneri bulunamadı"
			aciklama="Metinde büyük harfle yazılmış bir ad, haritandaki bir düğüm ya da bir yıl bulunamadı."
		/>
	{:else}
		<form method="POST" class="yigin">
			{#if data.eslesenler.length}
				<section class="kart yigin" aria-labelledby="eslesen-baslik">
					<h2 id="eslesen-baslik">Haritanda olanlar</h2>
					<p class="kucuk soluk">Seçtiklerinden bu anıya “Anlatırken geçti” notlu bağ kurulur.</p>
					<ul>
						{#each data.eslesenler as e (e.id)}
							<li>
								<label>
									<input
										type="checkbox"
										name="bagla"
										value={e.id}
										checked={!e.bagli}
										disabled={e.bagli}
									/>
									<TurSekli tur={e.tur} boyut={12} />
									<span>{e.baslik}</span>
									<small class="soluk">{e.bagli ? 'zaten bağlı' : DUGUM_TURU_ETIKETI[e.tur]}</small>
								</label>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.yeniler.length}
				<section class="kart yigin" aria-labelledby="yeni-baslik">
					<h2 id="yeni-baslik">Yeni olabilecekler</h2>
					<p class="kucuk soluk">Seçtiklerin özel düğüm olarak eklenir ve bu anıya bağlanır.</p>
					<ul class="yeniler">
						{#each data.yeniler as y, i (y.ad)}
							<li>
								<input
									type="checkbox"
									name="yeni"
									value={i}
									id="yeni-{i}"
									checked
									aria-label="{y.ad} eklensin"
								/>
								<input name="ad-{i}" value={y.ad} maxlength="200" aria-label="Ad" class="ad" />
								<select name="tur-{i}" aria-label="{y.ad}: tür">
									<option value="kisi" selected={y.tur === 'kisi'}>Kişi</option>
									<option value="yer" selected={y.tur === 'yer'}>Yer</option>
								</select>
								<small class="soluk kanit">{y.kanit}</small>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.yillar.length && !data.tarihVar}
				<fieldset class="kart yigin">
					<legend>Anının yılı</legend>
					<label><input type="radio" name="yil" value="" checked /> Tarih ekleme</label>
					{#each data.yillar as y (y)}
						<label><input type="radio" name="yil" value={y} /> {y}</label>
					{/each}
				</fieldset>
			{/if}

			<div class="satir">
				<button class="dugme dugme-birincil">Seçilenleri ekle</button>
				<a class="dugme dugme-hayalet" href="/dugumler/{data.id}">Vazgeç</a>
			</div>
		</form>
	{/if}
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	p {
		margin: 0;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	label {
		display: flex;
		align-items: center;
		gap: var(--a-2);
	}
	label small {
		margin-left: auto;
	}
	.yeniler li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--a-1) var(--a-2);
	}
	.yeniler .kanit {
		grid-column: 2 / -1;
	}
	.yeniler .ad,
	.yeniler select {
		min-height: 2.5rem;
		padding: 0 var(--a-2);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-sm);
		background: var(--yuzey);
		color: var(--metin);
		font: inherit;
	}
	fieldset {
		border: 1px solid var(--cizgi);
	}
	legend {
		font-weight: 650;
	}
	input[type='checkbox'],
	input[type='radio'] {
		accent-color: var(--vurgu);
	}
</style>
