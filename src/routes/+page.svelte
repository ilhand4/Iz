<script lang="ts">
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Tanıtım çizimindeki örnek keşif yolu
	const ornekDugumler = [
		{ x: 110, y: 60, tur: 'ani', baslik: 'Babaannemin kitaplığı', alt: 'Anı · 1998' },
		{ x: 400, y: 60, tur: 'eser', baslik: 'Kürk Mantolu Madonna', alt: 'Kitap · Sabahattin Ali' },
		{ x: 540, y: 190, tur: 'yer', baslik: 'Berlin', alt: 'Yer' },
		{ x: 330, y: 250, tur: 'karar', baslik: 'Almanca öğrenmek', alt: 'Karar · 2019' },
		{ x: 110, y: 200, tur: 'eser', baslik: 'Der Himmel über Berlin', alt: 'Film · Wim Wenders' }
	] as const;
	// Bağ notlarının konumu elle seçildi: etiketlerle çakışmasın
	const ornekBaglar = [
		{ a: 0, b: 1, not: 'rafta buldum', nx: 255, ny: 48 },
		{ a: 1, b: 2, not: 'hikâye orada geçiyor', nx: 530, ny: 122 },
		{ a: 2, b: 3, not: 'gitmek istedim', nx: 440, ny: 206 },
		{ a: 3, b: 4, not: 'hocam önerdi', nx: 225, ny: 216 }
	];

	const moduller = [
		{ ad: 'Kültür İzi', aciklama: 'Kitap, film, dizi, müzik, oyun ve podcast arasındaki gerçek keşif bağları. Öneriler puandan değil, insanların yürüdüğü yollardan gelir.', durum: 'Şimdi' },
		{ ad: 'Karar Defteri', aciklama: 'Gerekçe, beklenti ve yüzde kaç emin olduğun. Zamanı gelince sonucu sorar, ne kadar isabetli tahmin ettiğini gösterir.', durum: 'Yakında' },
		{ ad: 'Bir Zamanlar Burası', aciklama: 'Haritada aynı yerin eski ve yeni fotoğrafları; kaydırarak önce/sonra karşılaştırması.', durum: 'Yakında' },
		{ ad: 'Aile Hafızası', aciklama: 'Sesli anlatılan anılar Türkçe yazıya dökülür; kişiler, yerler ve yıllar kendiliğinden düğüm olur. Basılı kitap olarak da alınabilir.', durum: 'Yakında' },
		{ ad: 'Çeviri Masası', aciklama: 'Aynı paragrafın farklı Türkçe çevirileri yan yana; okurlar oylar, tartışır.', durum: 'Yakında' }
	];
</script>

<svelte:head>
	<title>İz — hayatının bağlantılı haritası</title>
	<meta
		name="description"
		content="İnsanlar ne yaşadığını kaydeder; İz neyin seni neye götürdüğünü kaydeder. Kitaplar, filmler, kişiler, yerler, kararlar ve anılar arasındaki bağları kur."
	/>
</svelte:head>

<section class="kap kahraman">
	<div class="kahraman-metin">
		<p class="ust-baslik">Hayatının bağlantılı haritası</p>
		<h1>
			İnsanlar ne yaşadığını kaydeder.
			<span class="vurgu">İz, neyin seni neye götürdüğünü kaydeder.</span>
		</h1>
		<p class="giris-metni">
			Bir kitap seni bir şehre, şehir bir karara, karar yeni bir insana götürür. İz bu bağları
			saklar; geriye dönüp baktığında yolunu görürsün.
		</p>
		<div class="satir">
			{#if data.kullanici}
				<a class="dugme dugme-birincil" href="/pano">Panoya git <Simge ad="ok" boyut={18} /></a>
			{:else}
				<a class="dugme dugme-birincil" href="/kayit">İzini başlat <Simge ad="ok" boyut={18} /></a>
				<a class="dugme" href="/giris">Giriş yap</a>
			{/if}
		</div>
	</div>

	<figure class="kart cizim" aria-label="Örnek bir keşif yolu">
		<svg viewBox="0 0 640 310" role="img" aria-labelledby="cizim-baslik">
			<title id="cizim-baslik">
				Babaannemin kitaplığı, Kürk Mantolu Madonna'ya; o Berlin'e; Berlin Almanca öğrenme kararına;
				karar da Der Himmel über Berlin filmine götürdü.
			</title>
			<defs>
				<marker id="ok-ucu" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0 0 10 5 0 10z" fill="var(--vurgu)" />
				</marker>
			</defs>
			{#each ornekBaglar as bag (bag.a)}
				{@const a = ornekDugumler[bag.a]}
				{@const b = ornekDugumler[bag.b]}
				<line
					x1={a.x}
					y1={a.y}
					x2={a.x + (b.x - a.x) * 0.92}
					y2={a.y + (b.y - a.y) * 0.92}
					class="cizgi"
					marker-end="url(#ok-ucu)"
				/>
				<text x={bag.nx} y={bag.ny} class="bag-notu" text-anchor="middle">
					{bag.not}
				</text>
			{/each}
			{#each ornekDugumler as d (d.baslik)}
				<g class="dugum" data-tur={d.tur}>
					<circle cx={d.x} cy={d.y} r="11" />
					<text x={d.x} y={d.y + 30} text-anchor="middle" class="d-baslik">{d.baslik}</text>
					<text x={d.x} y={d.y + 46} text-anchor="middle" class="d-alt">{d.alt}</text>
				</g>
			{/each}
		</svg>
	</figure>
</section>

<section class="kap bolum">
	<h2>Üç parça, bir harita</h2>
	<div class="izgara">
		<article class="kart">
			<span class="rozet" data-tur="eser">Düğüm</span>
			<h3>Hayatındaki şeyler</h3>
			<p class="soluk">Eserler, kişiler, yerler, kararlar ve anılar. Her birinin bir tarihi, istersen bir konumu var.</p>
		</article>
		<article class="kart">
			<span class="rozet" data-tur="kisi">Bağ</span>
			<h3>“Bu beni şuna götürdü”</h3>
			<p class="soluk">İki düğüm arasındaki yönlü bağ, nasıl olduğunu anlatan kısa bir notla birlikte.</p>
		</article>
		<article class="kart">
			<span class="rozet" data-tur="yer">İz</span>
			<h3>Anlatılabilir yollar</h3>
			<p class="soluk">Düğümlerden seçtiğin sıralı bir yol: bir hikâye gibi anlatılır, istersen paylaşılır.</p>
		</article>
	</div>
</section>

<section class="kap bolum">
	<h2>Aynı veri, üç görünüm</h2>
	<div class="izgara">
		<article class="kart"><h3>Ağ</h3><p class="soluk">Yakınlaştırıp uzaklaştırabildiğin bağlantı ağı.</p></article>
		<article class="kart"><h3>Zaman çizgisi</h3><p class="soluk">Neyin ne zaman olduğunu, neyin neyi izlediğini gösterir.</p></article>
		<article class="kart"><h3>Harita</h3><p class="soluk">Konumu olan düğümler dünya haritasında.</p></article>
	</div>
</section>

<section class="kap bolum">
	<h2>Modüller</h2>
	<p class="soluk">Asıl fark modüller arasındaki bağlarda: bir anı bir kitaba, kitap bir karara bağlanabilir.</p>
	<div class="izgara">
		{#each moduller as m (m.ad)}
			<article class="kart modul">
				<div class="satir"><h3>{m.ad}</h3><span class="rozet">{m.durum}</span></div>
				<p class="soluk">{m.aciklama}</p>
			</article>
		{/each}
	</div>
</section>

<section class="kap bolum">
	<div class="kart gizlilik">
		<h2>Gizlilik her düğümde ayrı</h2>
		<p class="soluk">
			Her düğüm ve iz için ayrı ayrı seçersin: <strong>özel</strong> (yalnızca sen),
			<strong>aile / grup</strong> ya da <strong>herkese açık</strong>. Varsayılan her zaman özeldir.
		</p>
	</div>
</section>

<style>
	.kahraman {
		display: grid;
		gap: var(--a-6);
		padding-block: var(--a-5) var(--a-7);
	}
	.ust-baslik {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: var(--boyut-xs);
		font-weight: 650;
		color: var(--vurgu);
		margin-bottom: var(--a-3);
	}
	h1 {
		font-size: clamp(2.25rem, 6.5vw, 3.75rem);
		line-height: 1.05;
		letter-spacing: -0.025em;
		margin-bottom: var(--a-5);
	}
	.vurgu {
		display: block;
		color: var(--vurgu);
		font-style: italic;
		font-weight: 500;
	}
	.giris-metni {
		font-size: var(--boyut-lg);
		color: var(--metin-soluk);
		max-width: 36rem;
		margin-bottom: var(--a-5);
	}
	.cizim {
		margin: 0;
		padding: var(--a-3);
	}
	.cizim svg {
		width: 100%;
		height: auto;
	}
	.cizgi {
		stroke: var(--vurgu);
		stroke-width: 1.6;
		stroke-dasharray: 2 5;
		stroke-linecap: round;
	}
	.bag-notu {
		font-size: 12px;
		font-style: italic;
		fill: var(--metin-soluk);
		paint-order: stroke;
		stroke: var(--yuzey);
		stroke-width: 4px;
	}
	.dugum circle {
		stroke: var(--yuzey);
		stroke-width: 3;
	}
	.dugum[data-tur='ani'] circle {
		fill: var(--tur-ani);
	}
	.dugum[data-tur='eser'] circle {
		fill: var(--tur-eser);
	}
	.dugum[data-tur='yer'] circle {
		fill: var(--tur-yer);
	}
	.dugum[data-tur='karar'] circle {
		fill: var(--tur-karar);
	}
	.d-baslik {
		font-size: 14px;
		font-weight: 600;
		fill: var(--metin);
		paint-order: stroke;
		stroke: var(--yuzey);
		stroke-width: 4px;
	}
	.d-alt {
		font-size: 11.5px;
		fill: var(--metin-soluk);
	}
	.bolum {
		padding-block: var(--a-5);
	}
	.bolum h2 {
		font-size: var(--boyut-2xl);
	}
	.kart h3 {
		margin-top: var(--a-3);
	}
	.modul .satir {
		justify-content: space-between;
	}
	.modul h3 {
		margin: 0;
	}
	.modul p,
	.izgara .kart p {
		margin: var(--a-2) 0 0;
	}
	.gizlilik p {
		margin: 0;
		max-width: var(--okuma-genislik);
	}

	.cizim {
		max-width: 46rem;
	}
	@media (min-width: 75rem) {
		.kahraman {
			grid-template-columns: 1fr 1.1fr;
			align-items: center;
			padding-block: var(--a-7);
		}
	}
</style>
