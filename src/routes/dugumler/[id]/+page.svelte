<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import BagOgesi from '#lib/bilesenler/BagOgesi.svelte';
	import DugumSecici from '#lib/bilesenler/DugumSecici.svelte';
	import GizlilikRozeti from '#lib/bilesenler/GizlilikRozeti.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { durumEtiketi, ESER_DURUMLARI } from '#lib/sabitler.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const d = $derived(data.dugum);

	type BagFormu = {
		yon: string;
		hatalar: Record<string, string>;
		degerler: Record<string, string>;
	};
	const bagFormu = $derived((form?.bag ?? null) as BagFormu | null);
	const gidenHata = $derived(bagFormu?.yon === 'giden' ? bagFormu : null);
	const gelenHata = $derived(bagFormu?.yon === 'gelen' ? bagFormu : null);
	const bagDuzenle = $derived(
		(form?.bagDuzenle ?? null) as {
			bagId: string;
			hatalar: Record<string, string>;
			degerler: Record<string, string>;
		} | null
	);
	// Yeni eklenen ya da "?getiren" ile açılan düğümde getiren sorusu öne çıkar
	const getirenSorusu = $derived(
		data.sahibiMi &&
			(data.eklendi || data.getirenSor) &&
			data.baglar.gelen.length === 0 &&
			data.secenekler.length > 0
	);
	const uzakKapilar = $derived(data.kapilar.filter((k) => k.derinlik > 1));

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
	{#if data.sahibiMi}
		<a href="/dugumler" class="geri"><Simge ad="geri" boyut={16} /> Düğümler</a>
	{/if}

	{#snippet gelenFormu()}
		<form method="POST" action="?/bagKur" class="yigin" use:enhance>
			<input type="hidden" name="yon" value="gelen" />
			<Alan
				id="gelenKaynak"
				etiket="Beni “{d.baslik}” düğümüne getiren:"
				hata={gelenHata?.hatalar.digerId}
			>
				<DugumSecici
					id="gelenKaynak"
					ad="digerId"
					secenekler={data.secenekler}
					secili={gelenHata?.degerler.digerId}
					hata={gelenHata?.hatalar.digerId}
				/>
			</Alan>
			<Alan
				id="gelenNot"
				etiket="Nasıl?"
				hata={gelenHata?.hatalar.not}
				ipucu="İsteğe bağlı: “Selin Hoca önerdi”, “filmin müziğiydi”…"
			>
				<input id="gelenNot" name="not" maxlength="1000" value={gelenHata?.degerler.not ?? ''} />
			</Alan>
			<Alan
				id="gelenTarih"
				etiket="Ne zaman?"
				hata={gelenHata?.hatalar.tarih}
				ipucu="İsteğe bağlı: 2021 · 2021-03 · 14.03.2021"
			>
				<input
					id="gelenTarih"
					name="tarih"
					inputmode="numeric"
					value={gelenHata?.degerler.tarih ?? ''}
					aria-invalid={!!gelenHata?.hatalar.tarih}
				/>
			</Alan>
			<div class="satir"><button class="dugme dugme-birincil">Bağı kur</button></div>
		</form>
	{/snippet}

	{#if getirenSorusu}
		<section class="getiren-sorusu" aria-labelledby="getiren-sorusu-baslik">
			<h2 id="getiren-sorusu-baslik">
				{data.eklendi ? 'Eklendi. ' : ''}Seni buraya ne getirdi?
			</h2>
			<p class="soluk kucuk">
				İz'in kalbi bu soru: bir kişi, bir başka eser, bir yer ya da bir an olabilir. Haritanda
				yoksa <a href="/dugumler/yeni?tur=kisi">yeni bir düğüm</a> olarak ekleyebilirsin.
			</p>
			{@render gelenFormu()}
		</section>
	{/if}

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
			{#if d.tur === 'eser'}
				{#if data.sahibiMi}
					<form method="POST" action="?/durum" class="durumlar" use:enhance>
						<span class="gorunmez" id="durum-baslik">Durum</span>
						<div class="durum-dugmeleri" role="group" aria-labelledby="durum-baslik">
							{#each ESER_DURUMLARI as durum (durum)}
								<button
									class="durum-dugmesi"
									name="durum"
									value={durum}
									aria-pressed={d.durum === durum}
								>
									{durumEtiketi(durum, d.eserTuru)}
								</button>
							{/each}
						</div>
					</form>
				{:else if d.durum}
					<span class="rozet durum-rozeti">{durumEtiketi(d.durum, d.eserTuru)}</span>
				{/if}
			{/if}
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
				{#if !data.sahibiMi}
					<li>
						<a href="/@{data.sahip.kullaniciAdi}">{data.sahip.ad} (@{data.sahip.kullaniciAdi})</a> paylaştı
					</li>
				{/if}
				{#if disAdres && d.disKaynak}
					<li>
						<a href={disAdres} rel="noopener noreferrer external" target="_blank">
							{KAYNAK_ADI[d.disKaynak]} sayfası ↗
						</a>
					</li>
				{/if}
			</ul>
			{#if d.aciklama}<p class="aciklama">{d.aciklama}</p>{/if}
			{#if data.yol.length || data.kapilar.length}
				<p class="olcuyler kucuk">
					{#if data.yol.length}
						<a href="#gelen-baslik"><strong>{data.yol.length}</strong> şeyden geliniyor</a>
					{/if}
					{#if data.kapilar.length}
						<a href="#giden-baslik"><strong>{data.kapilar.length}</strong> şeye kapı açtı</a>
					{/if}
				</p>
			{/if}
			{#if data.sahibiMi}
				<div class="satir eylemler">
					<a class="dugme dugme-kucuk" href="/dugumler/{d.id}/duzenle">
						<Simge ad="kalem" boyut={16} /> Düzenle
					</a>
					<a class="dugme dugme-kucuk" href="/dugumler/ag?odak={d.id}">
						<Simge ad="dugumler" boyut={16} /> Ağda göster
					</a>
					<a class="dugme dugme-kucuk" href="/izler/yeni?dugum={d.id}">
						<Simge ad="iz" boyut={16} /> Buradan iz başlat
					</a>
				</div>
			{/if}
		</div>
	</article>

	<div class="baglar-izgara">
		<section class="yigin" aria-labelledby="giden-baslik">
			<h2 id="giden-baslik">Bu beni şuna götürdü</h2>
			{#if data.baglar.giden.length}
				<ul class="bag-listesi">
					{#each data.baglar.giden as bag (bag.id)}
						<BagOgesi
							{bag}
							yon="giden"
							duzenlenebilir={data.sahibiMi}
							hatalar={bagDuzenle?.bagId === bag.id ? bagDuzenle.hatalar : null}
							degerler={bagDuzenle?.bagId === bag.id ? bagDuzenle.degerler : null}
						/>
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
							<input type="hidden" name="yon" value="giden" />
							<Alan
								id="gidenHedef"
								etiket="“{d.baslik}” beni şuna götürdü:"
								hata={gidenHata?.hatalar.digerId}
							>
								<DugumSecici
									id="gidenHedef"
									ad="digerId"
									secenekler={data.secenekler}
									secili={gidenHata?.degerler.digerId}
									hata={gidenHata?.hatalar.digerId}
								/>
							</Alan>
							<Alan
								id="gidenNot"
								etiket="Nasıl?"
								hata={gidenHata?.hatalar.not}
								ipucu="İsteğe bağlı: “arkadaşım hediye etti”, “filmin müziğiydi”…"
							>
								<input
									id="gidenNot"
									name="not"
									maxlength="1000"
									value={gidenHata?.degerler.not ?? ''}
								/>
							</Alan>
							<Alan
								id="gidenTarih"
								etiket="Ne zaman?"
								hata={gidenHata?.hatalar.tarih}
								ipucu="İsteğe bağlı: 2021 · 2021-03 · 14.03.2021"
							>
								<input
									id="gidenTarih"
									name="tarih"
									inputmode="numeric"
									value={gidenHata?.degerler.tarih ?? ''}
									aria-invalid={!!gidenHata?.hatalar.tarih}
								/>
							</Alan>
							<div class="satir"><button class="dugme dugme-birincil">Bağı kur</button></div>
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

			{#if uzakKapilar.length}
				<div class="kart yol kapilar">
					<h3>Açtığı kapılar</h3>
					<p class="kucuk soluk">
						Bağları ileriye doğru izleyince “{d.baslik}” dolaylı olarak bunlara da götürmüş:
					</p>
					<ol>
						{#each uzakKapilar as k (k.id)}
							<li style:--derinlik={k.derinlik - 1}>
								<span class="kucuk soluk">{k.derinlik} adım sonra</span>
								<a href="/dugumler/{k.id}"><TurSekli tur={k.tur} boyut={11} /> {k.baslik}</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>

		<section class="yigin" aria-labelledby="gelen-baslik">
			<h2 id="gelen-baslik">Beni buraya getirenler</h2>
			{#if data.baglar.gelen.length}
				<ul class="bag-listesi">
					{#each data.baglar.gelen as bag (bag.id)}
						<BagOgesi
							{bag}
							yon="gelen"
							duzenlenebilir={data.sahibiMi}
							hatalar={bagDuzenle?.bagId === bag.id ? bagDuzenle.hatalar : null}
							degerler={bagDuzenle?.bagId === bag.id ? bagDuzenle.degerler : null}
						/>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">Buraya gelen bir bağ yok.</p>
			{/if}

			{#if data.sahibiMi && data.secenekler.length && !getirenSorusu}
				<details class="kart bag-formu" open={!!gelenHata}>
					<summary>Seni buraya ne getirdi?</summary>
					{@render gelenFormu()}
				</details>
			{/if}

			{#if data.yol.length > data.baglar.gelen.length}
				<div class="kart yol">
					<h3>Geldiğin yol</h3>
					<p class="kucuk soluk">Bağları geriye doğru izleyince bu düğüme varan her şey:</p>
					<ol>
						{#each data.yol as y (y.id)}
							<li style:--derinlik={y.derinlik}>
								<span class="kucuk soluk">{y.derinlik} adım önce</span>
								<a href="/dugumler/{y.id}"><TurSekli tur={y.tur} boyut={11} /> {y.baslik}</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>
	</div>

	{#if data.izler.length || data.sahibiMi}
		<section class="izler yigin" aria-labelledby="izler-baslik">
			<h2 id="izler-baslik">Geçtiği izler</h2>
			{#if data.izler.length}
				<div class="iz-izgarasi">
					{#each data.izler as iz (iz.id)}
						<IzKarti {iz} />
					{/each}
				</div>
			{:else}
				<p class="soluk kucuk">Bu düğüm henüz bir izde durak değil.</p>
			{/if}

			{#if data.sahibiMi}
				<div class="ize-ekle">
					{#if data.eklenebilirIzler.length}
						<form method="POST" action="?/izeEkle" class="satir" use:enhance>
							<label class="gorunmez" for="izId">Eklenecek iz</label>
							<select id="izId" name="izId" required aria-invalid={!!form?.izHatasi}>
								<option value="">Bir iz seç…</option>
								{#each data.eklenebilirIzler as iz (iz.id)}
									<option value={iz.id}>{iz.baslik}</option>
								{/each}
							</select>
							<button class="dugme">İze ekle</button>
						</form>
						{#if form?.izHatasi}<p class="hata-metni kucuk" role="alert">{form.izHatasi}</p>{/if}
					{/if}
					<a class="kucuk" href="/izler/yeni?dugum={d.id}">Bu düğümle yeni bir iz başlat →</a>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
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
	.getiren-sorusu {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		padding: var(--a-4) var(--a-5);
		border: 1px solid color-mix(in srgb, var(--vurgu) 35%, var(--cizgi));
		border-left: 4px solid var(--vurgu);
		border-radius: var(--yaricap-lg);
		background: var(--vurgu-zemin);
	}
	.getiren-sorusu p {
		margin: 0;
	}
	.olcuyler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-4);
		margin: 0;
	}
	.olcuyler a {
		color: var(--metin-soluk);
		text-decoration: none;
	}
	.olcuyler a:hover {
		color: var(--vurgu);
	}
	.olcuyler strong {
		color: var(--vurgu);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
	}
	.durumlar {
		margin: 0;
	}
	.durum-dugmeleri {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 3px;
		border-radius: var(--yaricap-lg);
		border: 1px solid var(--cizgi);
		background: var(--yuzey-2);
	}
	.durum-dugmesi {
		min-height: 2.25rem;
		padding: 0 var(--a-3);
		border: 0;
		border-radius: var(--yaricap);
		background: transparent;
		color: var(--metin-soluk);
		font: inherit;
		font-size: var(--boyut-sm);
		font-weight: 600;
		cursor: pointer;
		transition:
			background var(--gecis),
			color var(--gecis);
	}
	.durum-dugmesi:hover {
		color: var(--metin);
	}
	.durum-dugmesi[aria-pressed='true'] {
		background: var(--yuzey);
		color: var(--tur-eser);
		box-shadow: var(--golge-1);
	}
	.durum-rozeti {
		align-self: flex-start;
	}
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
	.eylemler {
		padding-top: var(--a-2);
		border-top: 1px solid var(--cizgi);
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
	.bag-formu h3 {
		margin-bottom: var(--a-3);
	}
	details.bag-formu summary {
		cursor: pointer;
		font-family: var(--yazi-baslik);
		font-weight: 600;
		font-size: var(--boyut-lg);
	}
	details.bag-formu[open] summary {
		margin-bottom: var(--a-3);
	}
	.yeni-yol {
		margin: var(--a-4) 0 0;
	}
	.yol h3 {
		margin-bottom: var(--a-1);
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
	.kapilar li {
		border-left-style: solid;
		border-left-color: color-mix(in srgb, var(--vurgu) 45%, transparent);
	}
	.yol li a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.yol p {
		margin: 0 0 var(--a-3);
	}
	.iz-izgarasi {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	}
	.ize-ekle {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		max-width: 32rem;
	}
	.ize-ekle form {
		flex-wrap: nowrap;
	}
	.ize-ekle p {
		margin: 0;
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
