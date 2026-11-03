<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import GizlilikRozeti from '#lib/bilesenler/GizlilikRozeti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import { DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const d = $derived(data.dugum);
	const bagHatalari = $derived((form?.bag?.hatalar ?? {}) as Record<string, string>);
	const bagDegerleri = $derived((form?.bag?.degerler ?? {}) as Record<string, string>);

	const KAYNAK_ADI: Record<string, string> = { openlibrary: 'Open Library', tmdb: 'TMDB' };
	function disBaglanti(kaynak: string | null, kimlik: string | null) {
		if (!kaynak || !kimlik) return null;
		if (kaynak === 'openlibrary') return `https://openlibrary.org/works/${kimlik}`;
		if (kaynak === 'tmdb') return `https://www.themoviedb.org/${kimlik}`;
		return null;
	}
	const disAdres = $derived(disBaglanti(d.disKaynak, d.disKimlik));
</script>

<svelte:head><title>{d.baslik} · İz</title></svelte:head>

<div class="kap yigin">
	{#if data.sahibiMi}<a href="/dugumler" class="kucuk">← Düğümler</a>{/if}

	{#if data.eklendi && !form}
		<p class="bildirim bildirim-basari" role="status">
			Düğüm eklendi. Şimdi onu başka düğümlere bağlayabilirsin.
		</p>
	{/if}
	{#if form?.bagKuruldu}<p class="bildirim bildirim-basari" role="status">Bağ kuruldu.</p>{/if}
	{#if form?.bagSilindi}<p class="bildirim bildirim-basari" role="status">Bağ kaldırıldı.</p>{/if}

	<article class="kart dugum" data-tur={d.tur}>
		{#if d.gorselUrl}
			<img src={d.gorselUrl} alt="{d.baslik} kapağı" referrerpolicy="no-referrer" />
		{/if}
		<div class="yigin bilgi">
			<div class="satir">
				<TurRozeti tur={d.tur} eserTuru={d.eserTuru} />
				<GizlilikRozeti gizlilik={d.gizlilik} />
			</div>
			<div>
				<h1>{d.baslik}</h1>
				{#if d.altBaslik || d.yil}
					<p class="alt-baslik">{[d.altBaslik, d.yil].filter(Boolean).join(' · ')}</p>
				{/if}
			</div>
			<ul class="ozellikler kucuk soluk">
				{#if d.tarih}
					<li><Simge ad="takvim" boyut={16} /> {tarihYaz(d.tarih, d.tarihHassasiyeti)}</li>
				{/if}
				{#if d.yerAdi || d.enlem !== null}
					<li>
						<Simge ad="konum" boyut={16} />
						{d.yerAdi ?? ''}
						{#if d.enlem !== null && d.boylam !== null}
							<span class="koordinat">({d.enlem.toFixed(4)}, {d.boylam.toFixed(4)})</span>
						{/if}
					</li>
				{/if}
				{#if !data.sahibiMi}<li>{data.sahip.ad} (@{data.sahip.kullaniciAdi}) paylaştı</li>{/if}
				{#if disAdres && d.disKaynak}
					<li>
						<a href={disAdres} rel="noopener noreferrer external" target="_blank">
							{KAYNAK_ADI[d.disKaynak]} sayfası ↗
						</a>
					</li>
				{/if}
			</ul>
			{#if d.aciklama}<p class="aciklama">{d.aciklama}</p>{/if}
			{#if data.sahibiMi}
				<div class="satir">
					<a class="dugme dugme-kucuk" href="/dugumler/{d.id}/duzenle">
						<Simge ad="kalem" boyut={16} /> Düzenle
					</a>
				</div>
			{/if}
		</div>
	</article>

	<div class="baglar-izgara">
		<section class="yigin">
			<h2>Bu beni şuna götürdü</h2>
			{#if data.baglar.giden.length}
				<ul class="bag-listesi">
					{#each data.baglar.giden as bag (bag.id)}
						<li>
							<span class="ok" aria-hidden="true">→</span>
							<div class="bag-govde">
								<a href="/dugumler/{bag.dugum.id}">{bag.dugum.baslik}</a>
								<TurRozeti tur={bag.dugum.tur} eserTuru={bag.dugum.eserTuru} />
								{#if bag.not}<p class="not">“{bag.not}”</p>{/if}
								{#if bag.tarih}
									<p class="kucuk soluk">{tarihYaz(bag.tarih, bag.tarihHassasiyeti)}</p>
								{/if}
							</div>
							{#if data.sahibiMi}
								<form method="POST" action="?/bagSil" use:enhance>
									<input type="hidden" name="bagId" value={bag.id} />
									<button
										class="dugme dugme-hayalet dugme-kucuk"
										aria-label="“{bag.dugum.baslik}” bağını kaldır"
										title="Bağı kaldır"
									>
										<Simge ad="cop" boyut={16} />
									</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">Henüz buradan bir yere giden bağ yok.</p>
			{/if}

			{#if data.sahibiMi}
				<div class="kart bag-formu">
					<h3>Yeni bağ kur</h3>
					{#if data.secenekler.length}
						<form method="POST" action="?/bagKur" class="yigin" use:enhance>
							<Alan id="hedefId" etiket="“{d.baslik}” beni şuna götürdü:" hata={bagHatalari.hedefId}>
								<select id="hedefId" name="hedefId" required aria-invalid={!!bagHatalari.hedefId}>
									<option value="">Bir düğüm seç…</option>
									{#each data.secenekler as s (s.id)}
										<option value={s.id} selected={bagDegerleri.hedefId === s.id}>
											{s.baslik} ({DUGUM_TURU_ETIKETI[s.tur]})
										</option>
									{/each}
								</select>
							</Alan>
							<Alan
								id="not"
								etiket="Nasıl?"
								hata={bagHatalari.not}
								ipucu="İsteğe bağlı: “arkadaşım hediye etti”, “filmin müziğiydi”…"
							>
								<input id="not" name="not" maxlength="1000" value={bagDegerleri.not ?? ''} />
							</Alan>
							<Alan
								id="bagTarih"
								etiket="Ne zaman?"
								hata={bagHatalari.tarih}
								ipucu="İsteğe bağlı: 2021 · 2021-03 · 14.03.2021"
							>
								<input
									id="bagTarih"
									name="tarih"
									inputmode="numeric"
									value={bagDegerleri.tarih ?? ''}
									aria-invalid={!!bagHatalari.tarih}
								/>
							</Alan>
							<button class="dugme dugme-birincil">Bağı kur</button>
						</form>
					{:else}
						<p class="soluk kucuk">Bağ kurmak için önce başka bir düğüm eklemen gerek.</p>
					{/if}
					<p class="kucuk soluk yeni-yol">
						Henüz eklemediğin bir şeye mi götürdü?
						<a href="/dugumler/yeni?kaynak={d.id}">Yeni düğüm ekle</a> ya da
						<a href="/ara?kaynak={d.id}">eser ara</a>.
					</p>
				</div>
			{/if}
		</section>

		<section class="yigin">
			<h2>Buraya getirenler</h2>
			{#if data.baglar.gelen.length}
				<ul class="bag-listesi">
					{#each data.baglar.gelen as bag (bag.id)}
						<li>
							<span class="ok" aria-hidden="true">←</span>
							<div class="bag-govde">
								<a href="/dugumler/{bag.dugum.id}">{bag.dugum.baslik}</a>
								<TurRozeti tur={bag.dugum.tur} eserTuru={bag.dugum.eserTuru} />
								{#if bag.not}<p class="not">“{bag.not}”</p>{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">Buraya gelen bir bağ yok.</p>
			{/if}

			{#if data.yol.length > data.baglar.gelen.length}
				<div class="kart yol">
					<h3>Geldiğin yol</h3>
					<p class="kucuk soluk">Bağları geriye doğru izleyince bu düğüme varan her şey:</p>
					<ol>
						{#each data.yol as y (y.id)}
							<li style:--derinlik={y.derinlik}>
								<span class="kucuk soluk">{y.derinlik} adım önce</span>
								<a href="/dugumler/{y.id}">{y.baslik}</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.dugum {
		display: grid;
		gap: var(--a-5);
		border-top: 4px solid var(--renk, var(--cizgi));
	}
	.dugum[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.dugum[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.dugum[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.dugum[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.dugum[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.dugum img {
		width: 8rem;
		border-radius: var(--yaricap);
		box-shadow: var(--golge-2);
	}
	.bilgi {
		gap: var(--a-3);
	}
	h1 {
		font-size: var(--boyut-3xl);
		margin: 0;
	}
	.alt-baslik {
		margin: var(--a-1) 0 0;
		font-size: var(--boyut-lg);
		color: var(--metin-soluk);
	}
	.ozellikler {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2) var(--a-4);
	}
	.ozellikler li {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.koordinat {
		font-family: var(--yazi-kod);
		font-size: var(--boyut-xs);
	}
	.aciklama {
		white-space: pre-line;
		max-width: var(--okuma-genislik);
		margin: 0;
	}
	.baglar-izgara {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	h2 {
		margin: 0;
	}
	.bag-listesi {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.bag-listesi li {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
		line-height: 1.6;
	}
	.bag-govde {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-2);
		align-items: center;
		min-width: 0;
	}
	.bag-govde a {
		font-weight: 600;
		color: var(--metin);
	}
	.bag-govde p {
		width: 100%;
		margin: 0;
	}
	.not {
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.bag-formu h3 {
		margin-bottom: var(--a-3);
	}
	.yeni-yol {
		margin: var(--a-4) 0 0;
	}
	.yol ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.yol li {
		display: flex;
		flex-direction: column;
		border-left: 2px dotted var(--vurgu);
		padding-inline-start: calc(var(--a-3) + (var(--derinlik) - 1) * var(--a-3));
	}
	.yol p {
		margin: 0 0 var(--a-3);
	}
	@media (min-width: 40rem) {
		.dugum:has(img) {
			grid-template-columns: auto 1fr;
		}
	}
	@media (min-width: 56rem) {
		.baglar-izgara {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
