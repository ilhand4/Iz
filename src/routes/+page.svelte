<script lang="ts">
	import { page } from '$app/state';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import { SEKIL_YOLU } from '#lib/bilesenler/TurSekli.svelte';
	import type { DugumTuru } from '#lib/sabitler.ts';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import type { Anahtar } from '#lib/sozluk/tr.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(ceviri.t);

	// Tanıtım çizimi: tek bir anlatılabilir yol. Konumlar elle yerleştirildi; etiketler çakışmasın diye
	// her düğümün etiketi kendi tarafına (sol/sağ/alt) yazılır.
	type Ornek = {
		x: number;
		y: number;
		tur: DugumTuru;
		baslik: string;
		alt: string;
		yon: 'alt' | 'sol' | 'sag' | 'ust';
	};
	const ornek: Ornek[] = [
		{ x: 92, y: 74, tur: 'ani', baslik: 'tanitim.ornek1', alt: 'Anı · 1998', yon: 'alt' },
		{ x: 300, y: 54, tur: 'eser', baslik: 'Kürk Mantolu Madonna', alt: 'Kitap · 2003', yon: 'ust' },
		{ x: 520, y: 118, tur: 'yer', baslik: 'Berlin', alt: 'Yer · 2009', yon: 'sag' },
		{ x: 392, y: 238, tur: 'karar', baslik: 'tanitim.ornek4', alt: 'Karar · 2019', yon: 'alt' },
		{
			x: 140,
			y: 236,
			tur: 'eser',
			baslik: 'Der Himmel über Berlin',
			alt: 'Film · 2020',
			yon: 'alt'
		}
	];
	const notlar: { x: number; y: number; metin: Anahtar }[] = [
		{ x: 196, y: 84, metin: 'tanitim.not1' },
		{ x: 446, y: 62, metin: 'tanitim.not2' },
		{ x: 506, y: 198, metin: 'tanitim.not3' },
		{ x: 268, y: 270, metin: 'tanitim.not4' }
	];
	/** Örnek düğüm başlığı: sözlük anahtarıysa çevrilir, değilse (özel ad) olduğu gibi */
	const ad = (b: string) => (b.startsWith('tanitim.') ? t(b as Anahtar) : b);
	/** "Anı · 1998" gibi alt satırın türü dile göre */
	const altSatir = (d: { tur: DugumTuru; alt: string }) => {
		const yil = d.alt.split(' · ')[1];
		const tur =
			ceviri.dil === 'en'
				? {
						ani: 'Memory',
						eser: d.alt.startsWith('Film') ? 'Film' : 'Book',
						yer: 'Place',
						karar: 'Decision',
						kisi: 'Person'
					}[d.tur]
				: d.alt.split(' · ')[0];
		return `${tur} · ${yil}`;
	};
	/** Düğümleri sırayla yumuşak eğrilerle bağlayan yol (iz) */
	const yol = ornek
		.map((d, i) => {
			if (i === 0) return `M${d.x} ${d.y}`;
			const o = ornek[i - 1];
			const cx = (o.x + d.x) / 2;
			const egri = i % 2 ? -26 : 26;
			return `Q${cx} ${(o.y + d.y) / 2 + egri} ${d.x} ${d.y}`;
		})
		.join(' ');

	const etiketKonumu = (d: Ornek) =>
		d.yon === 'sol'
			? { x: d.x - 20, y: d.y + 4, anchor: 'end' }
			: d.yon === 'sag'
				? { x: d.x + 20, y: d.y + 4, anchor: 'start' }
				: d.yon === 'ust'
					? { x: d.x, y: d.y - 40, anchor: 'middle' }
					: { x: d.x, y: d.y + 32, anchor: 'middle' };

	const adimlar = ['1', '2', '3'] as const;
	const gorunumler = [
		{ ad: 'Liste', baslik: 'tanitim.gListe', metin: 'tanitim.gListeMetin' },
		{ ad: 'Ağ', baslik: 'tanitim.gAg', metin: 'tanitim.gAgMetin' },
		{ ad: 'Zaman çizgisi', baslik: 'tanitim.gZaman', metin: 'tanitim.gZamanMetin' },
		{ ad: 'Harita', baslik: 'tanitim.gHarita', metin: 'tanitim.gHaritaMetin' }
	] as const;
	const moduller: { no: 1 | 2 | 3 | 4 | 5 | 6; tur: DugumTuru }[] = [
		{ no: 1, tur: 'eser' },
		{ no: 2, tur: 'karar' },
		{ no: 3, tur: 'yer' },
		{ no: 4, tur: 'ani' },
		{ no: 5, tur: 'kisi' },
		{ no: 6, tur: 'eser' }
	];
</script>

<svelte:head>
	<title>{t('tanitim.baslikEtiketi')}</title>
	<meta name="description" content={t('tanitim.aciklamaMeta')} />
</svelte:head>

{#if page.url.searchParams.has('hesapSilindi')}
	<p class="kap bildirim bildirim-basari hesap-silindi" role="status">
		{t('tanitim.hesapSilindi')}
	</p>
{/if}

<section class="kap kahraman">
	<div class="kahraman-metin">
		<p class="ust-baslik">{t('tanitim.ust')}</p>
		<h1>
			{t('tanitim.h1a')}
			<span class="vurgu">{t('tanitim.h1b')}</span>
		</h1>
		<p class="giris-metni">{t('tanitim.giris')}</p>
		<div class="satir eylemler">
			{#if data.kullanici}
				<a class="dugme dugme-birincil dugme-buyuk" href="/pano"
					>{t('tanitim.panoyaGit')} <Simge ad="ok" boyut={18} /></a
				>
			{:else}
				<a class="dugme dugme-birincil dugme-buyuk" href="/kayit"
					>{t('tanitim.baslat')} <Simge ad="ok" boyut={18} /></a
				>
				<a class="dugme dugme-buyuk dugme-hayalet" href="/giris">{t('tanitim.girisYap')}</a>
			{/if}
		</div>
		<p class="guvence">{t('tanitim.guvence')}</p>
	</div>

	<figure class="cizim" aria-labelledby="cizim-baslik">
		<svg viewBox="0 0 640 310" role="img" aria-labelledby="cizim-baslik">
			<title id="cizim-baslik">{t('tanitim.cizimBaslik')}</title>
			<defs>
				<pattern id="nokta-kagit" width="18" height="18" patternUnits="userSpaceOnUse">
					<circle cx="1" cy="1" r="1" class="kagit-noktasi" />
				</pattern>
			</defs>
			<rect width="640" height="310" fill="url(#nokta-kagit)" />
			<path d={yol} class="iz-golgesi" />
			<path d={yol} class="iz-yolu" pathLength="1" />
			{#each notlar as n (n.metin)}
				<text x={n.x} y={n.y} class="bag-notu" text-anchor="middle">{t(n.metin)}</text>
			{/each}
			{#each ornek as d, i (d.baslik)}
				{@const e = etiketKonumu(d)}
				<g class="dugum" data-tur={d.tur} style:--gecikme="{0.25 + i * 0.22}s">
					<circle cx={d.x} cy={d.y} r="17" class="hale" />
					<path d={SEKIL_YOLU[d.tur]} transform="translate({d.x - 12} {d.y - 12}) scale(1.5)" />
					<text x={e.x} y={e.y} text-anchor={e.anchor} class="d-baslik">{ad(d.baslik)}</text>
					<text x={e.x} y={e.y + 15} text-anchor={e.anchor} class="d-alt">{altSatir(d)}</text>
				</g>
			{/each}
		</svg>
		<figcaption>{t('tanitim.cizimAlt')}</figcaption>
	</figure>
</section>

<section class="kap bolum" aria-labelledby="adimlar-baslik">
	<h2 id="adimlar-baslik" class="bolum-basligi">{t('tanitim.adimlarBaslik')}</h2>
	<ol class="adimlar">
		{#each adimlar as a (a)}
			<li>
				<span class="no" aria-hidden="true">0{a}</span>
				<p class="ad">{t(`tanitim.adim${a}Ad`)}</p>
				<h3>{t(`tanitim.adim${a}Baslik`)}</h3>
				<p>{t(`tanitim.adim${a}Metin`)}</p>
			</li>
		{/each}
	</ol>
</section>

<section class="kap bolum" aria-labelledby="gorunum-baslik">
	<h2 id="gorunum-baslik" class="bolum-basligi">{t('tanitim.gorunumBaslik')}</h2>
	<ul class="gorunumler">
		{#each gorunumler as g (g.ad)}
			<li>
				<svg viewBox="0 0 160 90" aria-hidden="true" class="mini">
					{#if g.ad === 'Liste'}
						{#each [0, 1, 2, 3] as i (i)}
							<rect
								x="18"
								y={14 + i * 18}
								width="10"
								height="10"
								rx="3"
								class="m-sekil"
								data-i={i}
							/>
							<rect x="36" y={16 + i * 18} width={90 - i * 14} height="6" rx="3" class="m-cizgi" />
						{/each}
					{:else if g.ad === 'Ağ'}
						<path
							d="M30 60 L70 28 L118 44 L96 74 L52 76 Z M70 28 L96 74 M30 60 L118 44"
							class="m-bag"
						/>
						{#each [[30, 60], [70, 28], [118, 44], [96, 74], [52, 76], [138, 20]] as [x, y], i (i)}
							<circle cx={x} cy={y} r={i === 1 ? 7 : 5} class="m-sekil" data-i={i % 4} />
						{/each}
						<path d="M118 44 L138 20" class="m-bag" />
					{:else if g.ad === 'Zaman çizgisi'}
						<path d="M14 50 H146" class="m-eksen" />
						{#each [24, 46, 58, 92, 104, 130] as x, i (x)}
							<path d="M{x} 44 V56" class="m-eksen" />
							<circle cx={x} cy={i % 2 ? 32 : 68} r="5" class="m-sekil" data-i={i % 4} />
						{/each}
						<rect x="40" y="46" width="62" height="8" rx="4" class="m-donem" />
					{:else}
						<path
							d="M8 70 C30 52 46 76 70 58 S112 30 152 44 M20 24 C48 36 62 18 96 26 S130 14 150 18"
							class="m-yol"
						/>
						{#each [[48, 52], [96, 38], [128, 60]] as [x, y], i (i)}
							<path
								d="M{x} {y} m-6 -6 a6 6 0 1 1 12 0 c0 6 -6 12 -6 12 s-6 -6 -6 -12z"
								class="m-sekil"
								data-i={i + 1}
							/>
						{/each}
					{/if}
				</svg>
				<h3>{t(g.baslik)}</h3>
				<p>{t(g.metin)}</p>
			</li>
		{/each}
	</ul>
</section>

<section class="kap bolum" aria-labelledby="modul-baslik">
	<h2 id="modul-baslik" class="bolum-basligi">{t('tanitim.odalarBaslik')}</h2>
	<p class="bolum-giris">{t('tanitim.odalarGiris')}</p>
	<ul class="moduller">
		{#each moduller as m (m.no)}
			<li data-tur={m.tur}>
				<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" class="m-tur">
					<path d={SEKIL_YOLU[m.tur]} />
				</svg>
				<div>
					<h3>{t(`tanitim.oda${m.no}`)}</h3>
					<p>{t(`tanitim.oda${m.no}Metin`)}</p>
				</div>
			</li>
		{/each}
	</ul>
</section>

<section class="kap bolum gizlilik" aria-labelledby="gizlilik-baslik">
	<div>
		<h2 id="gizlilik-baslik" class="bolum-basligi">{t('tanitim.gizlilikBaslik')}</h2>
		<p class="bolum-giris">{t('tanitim.gizlilikMetin')}</p>
	</div>
	<dl class="duzeyler">
		<div>
			<dt>{t('tanitim.dOzel')}</dt>
			<dd>{t('tanitim.dOzelMetin')}</dd>
		</div>
		<div>
			<dt>{t('tanitim.dGrup')}</dt>
			<dd>{t('tanitim.dGrupMetin')}</dd>
		</div>
		<div>
			<dt>{t('tanitim.dGolge')}</dt>
			<dd>{t('tanitim.dGolgeMetin')}</dd>
		</div>
		<div>
			<dt>{t('tanitim.dHerkes')}</dt>
			<dd>{t('tanitim.dHerkesMetin')}</dd>
		</div>
	</dl>
</section>

{#if !data.kullanici}
	<section class="kap kapanis" aria-labelledby="kapanis-baslik">
		<h2 id="kapanis-baslik">{t('tanitim.kapanis')}</h2>
		<p>{t('tanitim.kapanisMetin')}</p>
		<a class="dugme dugme-birincil dugme-buyuk" href="/kayit"
			>{t('tanitim.baslat')} <Simge ad="ok" boyut={18} /></a
		>
	</section>
{/if}

<style>
	.hesap-silindi {
		margin-top: var(--a-5);
	}
	.kahraman {
		display: grid;
		gap: var(--a-7);
		align-items: center;
		padding-block: clamp(var(--a-6), 7vw, 6.5rem) var(--a-7);
	}
	@media (min-width: 62rem) {
		.kahraman {
			grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
		}
	}
	.ust-baslik {
		margin: 0 0 var(--a-3);
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	h1 {
		margin: 0;
		font-size: clamp(2.3rem, 4.6vw, 3.6rem);
		line-height: 1.02;
		letter-spacing: -0.025em;
		font-weight: 500;
		text-wrap: balance;
	}
	.vurgu {
		display: block;
		margin-top: 0.18em;
		color: var(--vurgu);
		font-style: italic;
		font-weight: 400;
	}
	.giris-metni {
		max-width: 34rem;
		margin: var(--a-5) 0 var(--a-5);
		font-size: var(--boyut-lg);
		line-height: 1.6;
		color: var(--metin-soluk);
		text-wrap: pretty;
	}
	.eylemler {
		gap: var(--a-3);
	}
	:global(.dugme-buyuk) {
		min-height: 3rem;
		padding-inline: var(--a-5);
		font-size: var(--boyut-md);
	}
	.guvence {
		margin: var(--a-4) 0 0;
		font-size: var(--boyut-sm);
		color: var(--metin-silik);
	}

	/* ——— Çizim ——— */
	.cizim {
		margin: 0;
		padding: var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		box-shadow:
			0 1px 0 var(--cizgi),
			0 24px 48px -32px rgb(60 40 20 / 0.35);
		transform: rotate(-0.6deg);
	}
	.cizim svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.cizim figcaption {
		padding: var(--a-2) var(--a-2) 0;
		font-family: var(--yazi-baslik);
		font-style: italic;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.kagit-noktasi {
		fill: var(--cizgi-guclu);
		opacity: 0.55;
	}
	.iz-golgesi {
		fill: none;
		stroke: var(--vurgu-zemin);
		stroke-width: 12;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.iz-yolu {
		fill: none;
		stroke: var(--vurgu);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
		animation: ciz 2.2s cubic-bezier(0.65, 0, 0.35, 1) both;
	}
	@keyframes ciz {
		from {
			stroke-dashoffset: 1;
		}
	}
	.bag-notu {
		font-family: var(--yazi-baslik);
		font-style: italic;
		font-size: 12.5px;
		fill: var(--metin-soluk);
	}
	.dugum {
		animation: belir 0.5s ease-out both;
		animation-delay: var(--gecikme);
	}
	@keyframes belir {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}
	.hale {
		fill: var(--yuzey);
		stroke: var(--cizgi-guclu);
		stroke-width: 1;
	}
	.dugum path {
		fill: var(--renk);
		stroke: var(--renk);
		stroke-width: 1.4;
		stroke-linejoin: round;
	}
	.d-baslik {
		font-size: 13.5px;
		font-weight: 650;
		fill: var(--metin);
	}
	.d-alt {
		font-size: 11px;
		fill: var(--metin-soluk);
	}
	[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	@media (prefers-reduced-motion: reduce) {
		.iz-yolu,
		.dugum {
			animation: none;
		}
	}

	/* ——— Bölümler ——— */
	.bolum {
		padding-block: var(--a-7);
		border-top: 1px solid var(--cizgi);
	}
	.bolum-basligi {
		margin: 0 0 var(--a-5);
		font-size: clamp(1.6rem, 3vw, 2.1rem);
		font-weight: 500;
		letter-spacing: -0.015em;
	}
	.bolum-giris {
		max-width: 38rem;
		margin: calc(-1 * var(--a-3)) 0 var(--a-5);
		color: var(--metin-soluk);
		line-height: 1.6;
	}
	h3 {
		margin: 0 0 var(--a-2);
		font-family: var(--yazi-baslik);
		font-size: 1.3rem;
		font-weight: 500;
		line-height: 1.25;
	}
	li p,
	dd {
		margin: 0;
		color: var(--metin-soluk);
		line-height: 1.6;
	}

	.adimlar {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--a-5) var(--a-6);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
	}
	.adimlar li {
		padding-top: var(--a-4);
		border-top: 2px solid var(--metin);
	}
	.adimlar .no {
		display: block;
		font-family: var(--yazi-baslik);
		font-size: 2.6rem;
		line-height: 1;
		color: var(--vurgu);
		font-variant-numeric: lining-nums;
	}
	.adimlar .ad {
		margin: var(--a-3) 0 var(--a-1);
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--metin-silik);
	}

	.gorunumler {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--a-4);
		grid-template-columns: repeat(auto-fit, minmax(min(45%, 13rem), 1fr));
	}
	.mini {
		display: block;
		width: 100%;
		height: auto;
		margin-bottom: var(--a-3);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
	}
	.m-sekil {
		fill: var(--tur-eser);
	}
	.m-sekil[data-i='1'] {
		fill: var(--tur-kisi);
	}
	.m-sekil[data-i='2'] {
		fill: var(--tur-yer);
	}
	.m-sekil[data-i='3'] {
		fill: var(--tur-karar);
	}
	.m-cizgi {
		fill: var(--cizgi-guclu);
	}
	.m-bag,
	.m-eksen,
	.m-yol {
		fill: none;
		stroke: var(--cizgi-guclu);
		stroke-width: 1.5;
	}
	.m-yol {
		stroke-width: 6;
		stroke-linecap: round;
		opacity: 0.6;
	}
	.m-donem {
		fill: var(--vurgu-zemin);
	}

	.moduller {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0 var(--a-7);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
	}
	.moduller li {
		display: flex;
		gap: var(--a-3);
		padding: var(--a-4) 0;
		border-bottom: 1px solid var(--cizgi);
	}
	.m-tur {
		flex: none;
		margin-top: 0.35rem;
	}
	.m-tur path {
		fill: var(--renk);
		stroke: var(--renk);
		stroke-width: 1.6;
		stroke-linejoin: round;
	}

	.gizlilik {
		display: grid;
		gap: var(--a-5);
	}
	@media (min-width: 62rem) {
		.gizlilik {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}
	.duzeyler {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		overflow: hidden;
		background: var(--cizgi);
	}
	.duzeyler div {
		padding: var(--a-4);
		background: var(--yuzey);
	}
	.duzeyler dt {
		margin-bottom: var(--a-1);
		font-family: var(--yazi-baslik);
		font-size: 1.15rem;
	}

	.kapanis {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--a-3);
		margin-block: var(--a-4) var(--a-7);
		padding: clamp(var(--a-5), 5vw, var(--a-7));
		border-radius: var(--yaricap-lg);
		background: var(--metin);
		color: var(--zemin);
	}
	.kapanis h2 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		font-weight: 500;
		font-style: italic;
		letter-spacing: -0.02em;
	}
	.kapanis p {
		margin: 0 0 var(--a-2);
		max-width: 34rem;
		opacity: 0.8;
	}
</style>
