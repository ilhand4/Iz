<script lang="ts">
	// Aile arşivi / kitap: ekranda okunur, "Yazdır" ile tarayıcının "PDF olarak kaydet"iyle basılı
	// kitaba dönüşür (sunucuda PDF kitaplığı yok; @page ve yazdırma biçemleri). Her anı bir bölüm.
	import { tarihYaz } from '#lib/tarih.ts';
	import { DUGUM_TURU_ETIKETI, type DugumTuru, type TarihHassasiyeti } from '#lib/sabitler.ts';
	import Simge from './Simge.svelte';
	import TurSekli from './TurSekli.svelte';

	type Oge = {
		id: string;
		tur: DugumTuru;
		baslik: string;
		altBaslik: string | null;
		aciklama: string | null;
		tarih: string | null;
		tarihHassasiyeti: TarihHassasiyeti | null;
		yerAdi: string | null;
		yazar: string;
		fotolar: {
			id: string;
			donem: string;
			yil: number | null;
			aciklama: string | null;
			kaynak: string | null;
		}[];
		anlatilar: string[];
	};
	type Props = {
		baslik: string;
		altBaslik: string;
		ogeler: Oge[];
		yillar: number[];
		seciliYil: number | null;
		/** Yazar adı her bölümde gösterilsin mi (grup arşivinde evet) */
		yazarlar?: boolean;
	};
	let { baslik, altBaslik, ogeler, yillar, seciliYil, yazarlar = false }: Props = $props();

	/** On yıllara göre bölümler; tarihsizler en sonda */
	const bolumler = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- $derived içinde yerel, tepkisel olması gerekmez
		const harita = new Map<string, Oge[]>();
		for (const o of ogeler) {
			const ad = o.tarih ? `${o.tarih.slice(0, 3)}0'lar` : 'Tarihi bilinmeyenler';
			harita.set(ad, [...(harita.get(ad) ?? []), o]);
		}
		return [...harita.entries()];
	});
	const ilk = $derived(ogeler.find((o) => o.tarih)?.tarih?.slice(0, 4));
	const son = $derived(ogeler.findLast((o) => o.tarih)?.tarih?.slice(0, 4));
</script>

<div class="arac-cubugu satir">
	<button type="button" class="dugme dugme-birincil" onclick={() => print()}>
		<Simge ad="asagi" boyut={16} /> Yazdır ya da PDF olarak kaydet
	</button>
	{#if yillar.length > 1}
		<nav class="yillar" aria-label="Yıla göre">
			<a href="?" aria-current={seciliYil === null ? 'page' : undefined}>Tümü</a>
			{#each yillar as y (y)}
				<a href="?yil={y}" aria-current={seciliYil === y ? 'page' : undefined}>{y}</a>
			{/each}
		</nav>
	{/if}
</div>

<article class="kitap">
	<header class="kapak">
		<p class="ust-yazi">İz</p>
		<h1>{baslik}</h1>
		<p class="alt-yazi">{altBaslik}</p>
		{#if ilk}
			<p class="donem">{seciliYil ?? (ilk === son ? ilk : `${ilk} – ${son}`)}</p>
		{/if}
		<p class="sayi">{ogeler.length} anlatı</p>
	</header>

	{#if bolumler.length > 1}
		<nav class="icindekiler" aria-label="İçindekiler">
			<h2>İçindekiler</h2>
			<ol>
				{#each bolumler as [ad, liste] (ad)}
					<li>
						<a href="#bolum-{ad}">{ad}</a>
						<span class="soluk">{liste.length}</span>
					</li>
				{/each}
			</ol>
		</nav>
	{/if}

	{#each bolumler as [ad, liste] (ad)}
		<section class="bolum" id="bolum-{ad}" aria-labelledby="bolum-baslik-{ad}">
			<h2 id="bolum-baslik-{ad}" class="bolum-basligi">{ad}</h2>
			{#each liste as o (o.id)}
				<article class="anlati" data-tur={o.tur}>
					<header>
						<p class="kunye">
							<TurSekli tur={o.tur} boyut={11} />
							{DUGUM_TURU_ETIKETI[o.tur]}{o.tarih
								? ` · ${tarihYaz(o.tarih, o.tarihHassasiyeti)}`
								: ''}{o.yerAdi ? ` · ${o.yerAdi}` : ''}{yazarlar ? ` · ${o.yazar}` : ''}
						</p>
						<h3><a href="/dugumler/{o.id}">{o.baslik}</a></h3>
						{#if o.altBaslik}<p class="alt">{o.altBaslik}</p>{/if}
					</header>
					{#if o.fotolar.length}
						<div class="fotolar" data-sayi={Math.min(o.fotolar.length, 2)}>
							{#each o.fotolar.slice(0, 4) as f (f.id)}
								<figure>
									<img
										src="/fotograflar/{f.id}"
										alt="{o.baslik}{f.yil ? `, ${f.yil}` : ''}{f.aciklama ? `: ${f.aciklama}` : ''}"
										loading="lazy"
									/>
									<figcaption>
										{f.yil ?? (f.donem === 'eski' ? 'Eskiden' : 'Bugün')}{f.aciklama
											? ` · ${f.aciklama}`
											: ''}{f.kaynak ? ` · ${f.kaynak}` : ''}
									</figcaption>
								</figure>
							{/each}
						</div>
					{/if}
					{#if o.aciklama}<p class="metin">{o.aciklama}</p>{/if}
					{#each o.anlatilar as a, i (i)}
						<blockquote class="metin anlatim">{a}</blockquote>
					{/each}
				</article>
			{/each}
		</section>
	{/each}
</article>

<style>
	.arac-cubugu {
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
	}
	.yillar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1);
	}
	.yillar a {
		padding: 0.2rem 0.6rem;
		border-radius: var(--yaricap-tam);
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.yillar a[aria-current='page'] {
		background: var(--vurgu-zemin);
		color: var(--metin);
		font-weight: 650;
	}
	.kitap {
		max-width: 44rem;
		margin: 0 auto;
		font-family: var(--yazi-baslik);
	}
	.kapak {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-8) var(--a-4);
		text-align: center;
		border-bottom: 1px solid var(--cizgi);
	}
	.kapak p {
		margin: 0;
		font-family: var(--yazi-govde);
	}
	.ust-yazi {
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--vurgu);
		font-weight: 700;
	}
	.kapak h1 {
		margin: 0;
		font-size: clamp(2rem, 6vw, 3.2rem);
		font-weight: 500;
	}
	.alt-yazi {
		color: var(--metin-soluk);
	}
	.donem {
		font-size: var(--boyut-xl);
	}
	.sayi {
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.icindekiler {
		padding: var(--a-6) 0;
		border-bottom: 1px solid var(--cizgi);
	}
	.icindekiler h2,
	.bolum-basligi {
		margin: 0 0 var(--a-3);
		font-weight: 500;
	}
	.icindekiler ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.icindekiler li {
		display: flex;
		justify-content: space-between;
		padding: var(--a-1) 0;
		border-bottom: 1px dotted var(--cizgi-guclu);
	}
	.bolum {
		padding-top: var(--a-6);
	}
	.bolum-basligi {
		font-size: 1.8rem;
		color: var(--vurgu);
	}
	.anlati {
		padding: var(--a-5) 0;
		border-bottom: 1px solid var(--cizgi);
	}
	.anlati header {
		margin-bottom: var(--a-3);
	}
	.kunye {
		display: flex;
		align-items: center;
		gap: var(--a-1);
		margin: 0;
		font-family: var(--yazi-govde);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	h3 {
		margin: var(--a-1) 0 0;
		font-size: 1.6rem;
		font-weight: 500;
		line-height: 1.25;
	}
	h3 a {
		color: var(--metin);
		text-decoration: none;
	}
	.alt {
		margin: var(--a-1) 0 0;
		color: var(--metin-soluk);
	}
	.metin {
		margin: var(--a-3) 0 0;
		font-size: 1.15rem;
		line-height: 1.7;
		white-space: pre-line;
	}
	.anlatim {
		padding-left: var(--a-4);
		border-left: 3px solid var(--tur-ani);
		font-style: italic;
	}
	.fotolar {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: 1fr;
		margin: var(--a-3) 0;
	}
	.fotolar[data-sayi='2'] {
		grid-template-columns: 1fr 1fr;
	}
	figure {
		margin: 0;
	}
	figure img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--yaricap-sm);
	}
	figcaption {
		margin-top: var(--a-1);
		font-family: var(--yazi-govde);
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}

	@media print {
		/* Site çerçevesi yazdırılmaz; kitap kâğıda göre */
		:global(header.ust),
		:global(nav.alt-menu),
		:global(footer.alt),
		:global(.atla),
		:global(.sayfa-basligi),
		.arac-cubugu {
			display: none !important;
		}
		:global(body) {
			background: #fff !important;
			color: #000 !important;
		}
		:global(main) {
			padding: 0 !important;
		}
		.kitap {
			max-width: none;
			color: #000;
		}
		.kapak {
			min-height: 90vh;
			justify-content: center;
			border: 0;
			break-after: page;
		}
		.icindekiler {
			break-after: page;
		}
		.bolum {
			break-before: page;
		}
		.anlati {
			break-inside: avoid-page;
		}
		h3 a {
			color: #000;
		}
		.kunye,
		.alt,
		figcaption,
		.sayi,
		.alt-yazi {
			color: #444;
		}
	}
	@page {
		size: A5;
		margin: 18mm 16mm;
	}
</style>
