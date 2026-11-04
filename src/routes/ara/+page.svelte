<script lang="ts">
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import { durumEtiketi } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const SEKMELER = [
		{ tur: 'kitap', etiket: 'Kitap', kaynak: 'Open Library' },
		{ tur: 'film', etiket: 'Film', kaynak: 'TMDB' },
		{ tur: 'dizi', etiket: 'Dizi', kaynak: 'TMDB' }
	] as const;

	function sekmeAdresi(tur: string) {
		// Bağlantı adresi üretmek için geçici nesne; tepkisel olması gerekmiyor
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const p = new URLSearchParams({ tur });
		if (data.q) p.set('q', data.q);
		if (data.kaynak) p.set('kaynak', data.kaynak.id);
		return `/ara?${p}`;
	}
	const eylem = $derived(data.kaynak ? `?/ekle&kaynak=${data.kaynak.id}` : '?/ekle');
	const tmdbKapali = $derived(data.tur !== 'kitap' && !data.tmdbEtkin);
</script>

<svelte:head><title>Eser ara · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Kültür İzi"
		baslik="Eser ara"
		aciklama="Bulduğun eseri tek dokunuşla düğüme dönüştür. Eklediklerin varsayılan olarak özeldir."
		geri={data.kaynak
			? { href: `/dugumler/${data.kaynak.id}`, etiket: data.kaynak.baslik }
			: undefined}
	/>
	{#if data.kaynak}
		<p class="bildirim bildirim-uyari kaynak">
			Seçtiğin eser, <a href="/dugumler/{data.kaynak.id}"><strong>{data.kaynak.baslik}</strong></a>
			düğümünden “beni şuna götürdü” bağıyla eklenecek.
		</p>
	{/if}

	<nav class="sekmeler" aria-label="Eser türü">
		{#each SEKMELER as s (s.tur)}
			<a href={sekmeAdresi(s.tur)} aria-current={data.tur === s.tur ? 'page' : undefined}>
				{s.etiket} <small>{s.kaynak}</small>
			</a>
		{/each}
	</nav>

	{#if tmdbKapali}
		<div class="kart bildirim-uyari kapali">
			<h2>Film ve dizi araması şu an kapalı</h2>
			<p>
				Bu özellik için bir TMDB anahtarı gerekiyor. Ücretsiz bir anahtarı
				<a
					href="https://www.themoviedb.org/settings/api"
					rel="noopener noreferrer external"
					target="_blank">TMDB ayarlarından</a
				>
				alıp <code>.env</code> dosyasındaki <code>TMDB_ANAHTARI</code> satırına yazman ve sunucuyu yeniden
				başlatman yeterli.
			</p>
			<p class="kucuk">
				Bu arada filmi ya da diziyi <a href="/dugumler/yeni?tur=eser&eserTuru={data.tur}"
					>elle ekleyebilirsin</a
				>.
			</p>
		</div>
	{:else}
		<form method="GET" class="arama" role="search">
			<input type="hidden" name="tur" value={data.tur} />
			{#if data.kaynak}<input type="hidden" name="kaynak" value={data.kaynak.id} />{/if}
			<label class="gorunmez" for="q">Aranacak eser</label>
			<input
				id="q"
				name="q"
				type="search"
				value={data.q}
				minlength="2"
				maxlength="120"
				placeholder={data.tur === 'kitap'
					? 'Kitap adı ya da yazar…'
					: data.tur === 'film'
						? 'Film adı…'
						: 'Dizi adı…'}
				required
			/>
			<button class="dugme dugme-birincil"><Simge ad="ara" boyut={18} /> Ara</button>
		</form>

		{#if form?.hata}<p class="bildirim bildirim-hata" role="alert">{form.hata}</p>{/if}
		{#if data.hata}<p class="bildirim bildirim-hata" role="alert">{data.hata}</p>{/if}

		{#if data.q && data.q.length < 2}
			<p class="soluk">Aramak için en az 2 karakter yaz.</p>
		{:else if data.q && !data.hata && data.sonuclar.length === 0}
			<div class="kart">
				<p>“{data.q}” için sonuç bulunamadı.</p>
				<p class="kucuk soluk">
					Yazımı kontrol et ya da eseri <a href="/dugumler/yeni?tur=eser&eserTuru={data.tur}"
						>elle ekle</a
					>.
				</p>
			</div>
		{/if}

		{#if data.sonuclar.length}
			<ul class="sonuclar">
				{#each data.sonuclar as s (s.disKimlik)}
					<li class="kart sonuc">
						{#if s.gorselUrl}
							<img src={s.gorselUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
						{:else}
							<span class="kapak-yok" aria-hidden="true">{s.baslik.slice(0, 1)}</span>
						{/if}
						<div class="sonuc-govde">
							<strong>{s.baslik}</strong>
							{#if s.altBaslik || s.yil}
								<span class="kucuk soluk">{[s.altBaslik, s.yil].filter(Boolean).join(' · ')}</span>
							{/if}
							{#if s.ozet}<p class="kucuk ozet">{s.ozet}</p>{/if}
							{#if data.mevcut[s.disKimlik]}
								<a class="dugme dugme-kucuk" href="/dugumler/{data.mevcut[s.disKimlik]}"
									>Düğümüne git</a
								>
							{:else}
								<form method="POST" action={eylem} class="ekle-formu">
									<input type="hidden" name="kaynak" value={s.kaynak} />
									<input type="hidden" name="disKimlik" value={s.disKimlik} />
									<input type="hidden" name="eserTuru" value={s.eserTuru} />
									<input type="hidden" name="baslik" value={s.baslik} />
									<input type="hidden" name="altBaslik" value={s.altBaslik ?? ''} />
									<input type="hidden" name="yil" value={s.yil ?? ''} />
									<input type="hidden" name="gorselUrl" value={s.gorselUrl ?? ''} />
									<button class="dugme dugme-birincil dugme-kucuk" name="durum" value="bitti">
										<Simge ad="onay" boyut={16} />
										{durumEtiketi('bitti', s.eserTuru)}
									</button>
									<button class="dugme dugme-kucuk" name="durum" value="merak">
										<Simge ad="ekle" boyut={16} /> Merak listeme
									</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
			<p class="kucuk soluk">
				Veriler: {data.tur === 'kitap' ? 'Open Library' : 'TMDB'}.
				{#if data.tur !== 'kitap'}Bu ürün TMDB API'sini kullanır ancak TMDB tarafından
					onaylanmamıştır.{/if}
			</p>
		{/if}
	{/if}
</div>

<style>
	.kaynak {
		margin: 0;
	}
	.sekmeler {
		display: flex;
		gap: var(--a-1);
		border-bottom: 1px solid var(--cizgi);
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
	}
	.sekmeler a {
		padding: var(--a-2) var(--a-3);
		color: var(--metin-soluk);
		text-decoration: none;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		white-space: nowrap;
	}
	.sekmeler a small {
		display: none;
		font-weight: 400;
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}
	@media (min-width: 30rem) {
		.sekmeler a small {
			display: inline;
		}
	}
	.sekmeler a[aria-current='page'] {
		color: var(--metin);
		border-bottom-color: var(--vurgu);
	}
	.arama {
		display: flex;
		gap: var(--a-2);
	}
	.kapali h2 {
		font-size: var(--boyut-lg);
	}
	.kapali p:last-child {
		margin: 0;
	}
	.kapali {
		background: var(--uyari-zemin);
		color: var(--metin);
	}
	code {
		font-family: var(--yazi-kod);
		font-size: 0.9em;
		background: var(--yuzey-2);
		padding: 0.1em 0.35em;
		border-radius: 4px;
	}
	.sonuclar {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
	}
	.sonuc {
		display: flex;
		gap: var(--a-3);
		padding: var(--a-3);
	}
	.sonuc img,
	.kapak-yok {
		flex: none;
		width: 4.5rem;
		height: 6.5rem;
		object-fit: cover;
		border-radius: var(--yaricap-sm);
		background: var(--yuzey-2);
	}
	.kapak-yok {
		display: grid;
		place-items: center;
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-2xl);
		color: var(--tur-eser);
	}
	.sonuc-govde {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--a-1);
		min-width: 0;
	}
	.ozet {
		margin: 0;
		color: var(--metin-soluk);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.ekle-formu {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.sonuc-govde form,
	.sonuc-govde .dugme {
		margin-top: auto;
	}
</style>
