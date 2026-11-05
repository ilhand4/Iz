<script lang="ts">
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import { TUR_ETIKETI } from '#lib/dil.ts';
	import AgGorunumu from '#lib/bilesenler/AgGorunumu.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import DugumKarti from '#lib/bilesenler/DugumKarti.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { DUGUM_TURLERI, DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(ceviri.t);
	const p = $derived(data.profil);
	const bagliIdler = $derived(new Set(data.ag.baglar.flatMap((b) => [b.kaynakId, b.hedefId])));
	const turSayilari = $derived(
		DUGUM_TURLERI.map((tur) => ({
			tur,
			sayi: data.dugumler.filter((d) => d.tur === tur).length
		})).filter((t) => t.sayi > 0)
	);
	const katilma = $derived(
		new Intl.DateTimeFormat(ceviri.dil === 'en' ? 'en-GB' : 'tr-TR', {
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Istanbul'
		}).format(new Date(p.olusturma))
	);
	const bos = $derived(data.dugumler.length === 0 && data.izler.length === 0);
</script>

<svelte:head>
	<title>{p.ad} (@{p.kullaniciAdi}) · İz</title>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={t('profil.rssBaslik', { ad: p.ad })}
		href="/@{p.kullaniciAdi}/rss.xml"
	/>
	<meta name="description" content={p.hakkinda ?? t('profil.meta', { ad: p.ad })} />
</svelte:head>

<div class="kap yigin genis-aralik">
	{#if data.kendisi}
		<p class="bildirim bildirim-bilgi kendisi">
			<Simge ad="dunya" boyut={18} />
			<span>{t('profil.kendisi')} <a href="/ayarlar#profil">{t('profil.duzenle')}</a></span>
		</p>
	{/if}

	<header class="profil-basligi">
		<span class="avatar" aria-hidden="true">{p.ad.slice(0, 1).toLocaleUpperCase('tr')}</span>
		<div class="kimlik">
			<h1>{p.ad}</h1>
			<p class="kullanici-adi">@{p.kullaniciAdi} · {t('profil.katilma', { tarih: katilma })}</p>
			{#if p.hakkinda}<p class="hakkinda">{p.hakkinda}</p>{/if}
			{#if !bos}
				<ul class="sayilar" aria-label={t('profil.acikIcerik')}>
					<li><strong>{data.izler.length}</strong> {t('profil.izSayisi')}</li>
					{#each turSayilari as ts (ts.tur)}
						<li>
							<TurSekli tur={ts.tur} boyut={11} /> <strong>{ts.sayi}</strong>
							{(ceviri.dil === 'en'
								? TUR_ETIKETI.en[ts.tur]
								: DUGUM_TURU_ETIKETI[ts.tur]
							).toLocaleLowerCase(ceviri.dil)}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</header>

	{#if bos}
		<BosDurum
			baslik={t('profil.bosBaslik')}
			aciklama={data.kendisi ? t('profil.bosKendisi') : t('profil.bosBaskasi', { ad: p.ad })}
		/>
	{:else}
		{#if data.izler.length}
			<section class="yigin" aria-labelledby="izler-baslik">
				<div class="bolum-ust">
					<h2 id="izler-baslik">{t('profil.izler')}</h2>
					<a class="kucuk rss" href="/@{p.kullaniciAdi}/rss.xml">{t('profil.rss')}</a>
				</div>
				<div class="izgara">
					{#each data.izler as iz (iz.id)}
						<IzKarti {iz} />
					{/each}
				</div>
			</section>
		{/if}

		{#if data.ag.baglar.length}
			<section class="yigin" aria-labelledby="ag-baslik">
				<h2 id="ag-baslik">{t('profil.acikHarita')}</h2>
				<p class="kucuk soluk">{t('profil.acikHaritaMetin')}</p>
				<AgGorunumu
					dugumler={data.ag.dugumler.filter((d) => bagliIdler.has(d.id))}
					baglar={data.ag.baglar}
					kaydet={false}
				/>
			</section>
		{/if}

		{#if data.dugumler.length}
			<section class="yigin" aria-labelledby="dugumler-baslik">
				<h2 id="dugumler-baslik">{t('profil.dugumler')}</h2>
				<div class="izgara">
					{#each data.dugumler as dugum (dugum.id)}
						<DugumKarti {dugum} />
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.genis-aralik {
		gap: var(--a-6);
	}
	.kendisi {
		display: flex;
		gap: var(--a-2);
		align-items: flex-start;
		margin: 0;
	}
	.profil-basligi {
		display: flex;
		gap: var(--a-4);
		align-items: flex-start;
		padding-top: var(--a-4);
	}
	.avatar {
		flex: none;
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-2xl);
		font-weight: 600;
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--vurgu) 30%, transparent);
	}
	.kimlik {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		min-width: 0;
	}
	h1 {
		margin: 0;
		font-size: var(--boyut-3xl);
	}
	h2 {
		margin: 0;
	}
	.kullanici-adi {
		margin: 0;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.hakkinda {
		margin: 0;
		max-width: var(--okuma-genislik);
		white-space: pre-line;
	}
	.sayilar {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-4);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.sayilar li {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.sayilar strong {
		color: var(--metin);
	}
	.bolum-ust {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--a-3);
	}
	.rss {
		color: var(--metin-soluk);
	}
	.izgara {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	}
</style>
