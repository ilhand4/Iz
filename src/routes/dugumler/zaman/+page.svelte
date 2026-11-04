<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import GizlilikRozeti from '#lib/bilesenler/GizlilikRozeti.svelte';
	import GorunumSecici from '#lib/bilesenler/GorunumSecici.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { AY_ADLARI } from '#lib/tarih.ts';
	import type { ZamanOgesi } from '#lib/zaman.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cizgi = $derived(data.cizgi);
	const enCok = $derived(Math.max(1, ...cizgi.yogunluk.map((y) => y.sayi)));
	const tarihliSayi = $derived(cizgi.yillar.reduce((t, y) => t + y.sayi, 0));
	const ilkYil = $derived(cizgi.yogunluk[0]?.yil);
	const sonYil = $derived(cizgi.yogunluk[cizgi.yogunluk.length - 1]?.yil);

	/** Öğenin tarih sütununda görünecek etiket */
	function gunEtiketi(o: ZamanOgesi): string {
		if (o.tarihHassasiyeti === 'gun') return String(Number(o.tarih!.slice(8, 10)));
		return '';
	}
</script>

<svelte:head><title>Zaman çizgisi · İz</title></svelte:head>

{#snippet ogeSatiri(o: ZamanOgesi)}
	<li class="oge" data-tur={o.tur}>
		<span class="gun" aria-hidden={!gunEtiketi(o)}>{gunEtiketi(o)}</span>
		<span class="isaret"><TurSekli tur={o.tur} boyut={14} /></span>
		<div class="kart oge-karti">
			<div class="oge-ust">
				<a class="oge-baslik" href="/dugumler/{o.id}">{o.baslik}</a>
				{#if o.gizlilik !== 'ozel'}<GizlilikRozeti gizlilik={o.gizlilik} />{/if}
			</div>
			{#if o.altBaslik}<p class="alt">{o.altBaslik}</p>{/if}
			<div class="oge-alt">
				<TurRozeti tur={o.tur} eserTuru={o.eserTuru} />
				{#if o.gidenler.length}
					<span class="gidenler">
						<span class="ok" aria-label="Götürdükleri:">→</span>
						{#each o.gidenler.slice(0, 3) as g, i (g.id)}
							<!-- Svelte 5 blok içindeki baştaki/sondaki boşluğu siler; ayıraç bu yüzden ifade olarak yazıldı -->
							<!-- eslint-disable-next-line svelte/no-useless-mustaches -->
							{#if i > 0}{', '}{/if}<a href="/dugumler/{g.id}">{g.baslik}</a>
						{/each}
						{#if o.gidenler.length > 3}<span class="soluk">+{o.gidenler.length - 3}</span>{/if}
					</span>
				{/if}
			</div>
		</div>
	</li>
{/snippet}

<div class="kap yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Zaman çizgisi"
		aciklama="Düğümlerin yaşandıkları sırayla. Yalnızca yılı ya da ayı bilinenler, o yılın ya da ayın başında ayrıca gösterilir."
	>
		{#snippet eylemler()}
			<a class="dugme dugme-birincil" href="/dugumler/yeni"
				><Simge ad="ekle" boyut={18} /> Düğüm ekle</a
			>
		{/snippet}
	</SayfaBasligi>

	<GorunumSecici etkin="zaman" />

	{#if data.toplam === 0}
		<BosDurum
			baslik="Zaman çizgin henüz boş"
			aciklama="Düğüm eklerken “Ne zaman?” alanına bir yıl, ay ya da gün yazdığında burada yerini alır."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni">İlk düğümü ekle</a>
			{/snippet}
		</BosDurum>
	{:else}
		<div class="ozet satir">
			<p class="soluk kucuk">
				{#if tarihliSayi}
					{tarihliSayi} tarihli düğüm{#if ilkYil !== sonYil}, {ilkYil}–{sonYil}{:else}, {ilkYil}{/if}
				{:else}
					Henüz tarihli düğüm yok
				{/if}
				{#if cizgi.tarihsiz.length}· {cizgi.tarihsiz.length} tarihsiz{/if}
			</p>
			<a
				class="dugme dugme-kucuk dugme-hayalet"
				href="?sira={data.sira === 'eski' ? 'yeni' : 'eski'}"
			>
				<Simge ad={data.sira === 'eski' ? 'asagi' : 'yukari'} boyut={16} />
				{data.sira === 'eski' ? 'Eskiden yeniye' : 'Yeniden eskiye'}
			</a>
		</div>

		{#if cizgi.yogunluk.length > 1}
			<nav class="yogunluk" aria-label="Yıllara git">
				<div class="cubuklar">
					{#each cizgi.yogunluk as y (y.yil)}
						{#if y.sayi}
							<a
								href="#yil-{y.yil}"
								class="cubuk"
								style:--oran={y.sayi / enCok}
								title="{y.yil}: {y.sayi} düğüm"
								aria-label="{y.yil}: {y.sayi} düğüm"
							></a>
						{:else}
							<span class="cubuk bos" aria-hidden="true"></span>
						{/if}
					{/each}
				</div>
				<div class="eksen kucuk soluk" aria-hidden="true">
					<span>{ilkYil}</span><span>{sonYil}</span>
				</div>
			</nav>
		{/if}

		{#if cizgi.yillar.length}
			<ol class="zaman-cizgisi">
				{#each cizgi.yillar as y (y.yil)}
					<li class="yil" id="yil-{y.yil}">
						<h2 class="yil-baslik">
							<span class="yil-no">{y.yil}</span>
							<span class="yil-sayi">{y.sayi} düğüm</span>
						</h2>
						{#if y.yilBoyunca.length}
							<section class="ay" aria-label="{y.yil} yılı içinde">
								<h3 class="ay-baslik">Yıl içinde</h3>
								<ul>
									{#each y.yilBoyunca as o (o.id)}{@render ogeSatiri(o)}{/each}
								</ul>
							</section>
						{/if}
						{#each y.aylar as a (a.ay)}
							<section class="ay" aria-label="{AY_ADLARI[a.ay - 1]} {y.yil}">
								<h3 class="ay-baslik">{AY_ADLARI[a.ay - 1]}</h3>
								<ul>
									{#each a.ogeler as o (o.id)}{@render ogeSatiri(o)}{/each}
								</ul>
							</section>
						{/each}
					</li>
				{/each}
			</ol>
		{/if}

		{#if cizgi.tarihsiz.length}
			<section class="tarihsiz">
				<h2>Tarihsiz <span class="soluk">({cizgi.tarihsiz.length})</span></h2>
				<p class="soluk kucuk">Bunlara bir tarih eklersen zaman çizgisinde yerlerini alırlar.</p>
				<ul>
					{#each cizgi.tarihsiz as o (o.id)}
						<li>
							<TurSekli tur={o.tur} boyut={12} />
							<a href="/dugumler/{o.id}">{o.baslik}</a>
							<a class="kucuk tarih-ekle" href="/dugumler/{o.id}/duzenle">Tarih ekle</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</div>

<style>
	.ozet {
		justify-content: space-between;
	}
	.ozet p {
		margin: 0;
	}

	/* ——— Yoğunluk şeridi ——— */
	.yogunluk {
		padding: var(--a-3) var(--a-4) var(--a-2);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
	}
	.cubuklar {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 3.5rem;
	}
	.cubuk {
		flex: 1;
		min-width: 2px;
		height: calc(12% + 88% * var(--oran, 0));
		border-radius: 3px 3px 1px 1px;
		background: var(--vurgu);
		opacity: 0.75;
		transition: opacity var(--gecis);
	}
	a.cubuk:hover,
	a.cubuk:focus-visible {
		opacity: 1;
	}
	.cubuk.bos {
		height: 3px;
		background: var(--cizgi);
		opacity: 1;
	}
	.eksen {
		display: flex;
		justify-content: space-between;
		margin-top: var(--a-1);
		font-variant-numeric: tabular-nums;
	}

	/* ——— Çizgi ——— */
	.zaman-cizgisi {
		--gun-genislik: 2rem;
		--isaret-genislik: 1.75rem;
		--eksen-x: calc(var(--gun-genislik) + var(--isaret-genislik) / 2);
		position: relative;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	/* Dikey eksen */
	.zaman-cizgisi::before {
		content: '';
		position: absolute;
		top: 1.5rem;
		bottom: 0;
		left: calc(var(--eksen-x) - 1px);
		border-left: 2px dotted color-mix(in srgb, var(--vurgu) 55%, transparent);
	}
	.yil {
		position: relative;
		padding-bottom: var(--a-5);
		scroll-margin-top: calc(var(--ust-yukseklik) + var(--a-3));
	}
	.yil-baslik {
		position: sticky;
		top: var(--ust-yukseklik);
		z-index: 2;
		display: flex;
		align-items: baseline;
		gap: var(--a-3);
		margin: 0 0 var(--a-2);
		padding: var(--a-2) 0;
		background: color-mix(in srgb, var(--zemin) 92%, transparent);
		backdrop-filter: blur(6px);
	}
	.yil-no {
		font-size: var(--boyut-2xl);
		font-variant-numeric: tabular-nums;
		/* Noktanın merkezi eksen çizgisinin tam üstüne gelsin */
		padding-left: calc(var(--eksen-x) - 0.35rem);
	}
	.yil-no::before {
		content: '';
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		margin-right: var(--a-3);
		border-radius: 50%;
		background: var(--vurgu);
		box-shadow: 0 0 0 4px var(--zemin);
		vertical-align: 0.2em;
	}
	.yil-sayi {
		font-family: var(--yazi-govde);
		font-size: var(--boyut-xs);
		font-weight: 500;
		color: var(--metin-soluk);
	}
	.ay {
		margin-bottom: var(--a-3);
	}
	.ay-baslik {
		margin: var(--a-2) 0 var(--a-2) calc(var(--eksen-x) + var(--a-4));
		font-family: var(--yazi-govde);
		font-size: var(--boyut-xs);
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--metin-soluk);
	}
	.ay ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.oge {
		display: grid;
		grid-template-columns: var(--gun-genislik) var(--isaret-genislik) 1fr;
		align-items: start;
	}
	.gun {
		padding-top: 0.7rem;
		padding-right: var(--a-1);
		text-align: right;
		font-family: var(--yazi-baslik);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--metin-soluk);
	}
	.isaret {
		position: relative;
		display: grid;
		place-items: center;
		height: 1.75rem;
		margin-top: 0.55rem;
	}
	/* İşaretin arkasında eksen çizgisini kesen zemin halkası */
	.isaret::before {
		content: '';
		position: absolute;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		background: var(--zemin);
	}
	.isaret :global(svg) {
		position: relative;
	}
	.oge-karti {
		min-width: 0;
		margin-left: var(--a-2);
		padding: var(--a-3) var(--a-4);
		border-left: 3px solid var(--renk, var(--cizgi));
	}
	.oge[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.oge[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.oge[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.oge[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.oge[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.oge-ust {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--a-2);
	}
	.oge-baslik {
		font-weight: 600;
		color: var(--metin);
		text-decoration: none;
		line-height: 1.35;
	}
	.oge-baslik:hover {
		color: var(--vurgu);
	}
	.alt {
		margin: 2px 0 0;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.oge-alt {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-1) var(--a-3);
		margin-top: var(--a-2);
	}
	.gidenler {
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
	.gidenler a {
		color: var(--metin-soluk);
	}
	.gidenler a:hover {
		color: var(--vurgu);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
	}

	/* ——— Tarihsiz ——— */
	.tarihsiz {
		padding: var(--a-4);
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap-lg);
	}
	.tarihsiz h2 {
		font-size: var(--boyut-lg);
		margin-bottom: var(--a-1);
	}
	.tarihsiz ul {
		list-style: none;
		margin: var(--a-3) 0 0;
		padding: 0;
		display: grid;
		gap: var(--a-2);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
	}
	.tarihsiz li {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		min-width: 0;
	}
	.tarihsiz li a:first-of-type {
		color: var(--metin);
		font-weight: 550;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tarih-ekle {
		margin-left: auto;
		flex: none;
	}

	@media (min-width: 40rem) {
		.zaman-cizgisi {
			--gun-genislik: 3rem;
			--isaret-genislik: 2rem;
		}
		.oge-karti {
			margin-left: var(--a-3);
		}
	}
</style>
