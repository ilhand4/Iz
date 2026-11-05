<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { brierYorumu, KARAR_SONUCU_ETIKETI, type KararSonucu } from '#lib/kararDefteri.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Kalibrasyon bu sayının altında yanıltıcı olabilir */
	const ANLAMLI_SAYI = 5;

	const zamaniGelen = $derived(
		data.liste.filter((k) => !k.sonuc && k.sorulacak && k.sorulacak <= data.bugun)
	);
	const bekleyen = $derived(
		data.liste.filter((k) => !k.sonuc && !(k.sorulacak && k.sorulacak <= data.bugun))
	);
	const sonuclanan = $derived(data.liste.filter((k) => k.sonuc));

	// Grafik ölçüleri (SVG kullanıcı birimleri)
	const G = { sol: 60, ust: 16, gen: 260, yuk: 200 };
	const x = (yuzde: number) => G.sol + (yuzde / 100) * G.gen;
	const y = (yuzde: number) => G.ust + G.yuk - (yuzde / 100) * G.yuk;
	const enBuyuk = $derived(Math.max(1, ...data.dilimler.map((d) => d.sayi)));
	const yaricap = (sayi: number) => 5 + 7 * Math.sqrt(sayi / enBuyuk);
	const CIZGILER = [0, 25, 50, 75, 100];

	const tarihMetni = (t: string) =>
		new Intl.DateTimeFormat('tr-TR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(t + 'T00:00:00Z'));
	const brierMetni = (b: number) => b.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
</script>

<svelte:head><title>Kararlar · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Karar defteri"
		baslik="Kararlar"
		aciklama="Karar verirken ne beklediğini ve ne kadar emin olduğunu yaz; zamanı gelince sonucunu sor. Zamanla güveninin ne kadar isabetli olduğunu görürsün. Bu sayfa yalnızca sana açık."
	>
		{#snippet eylemler()}
			<a class="dugme dugme-birincil" href="/dugumler/yeni?tur=karar">
				<Simge ad="ekle" boyut={18} /> Karar ekle
			</a>
		{/snippet}
	</SayfaBasligi>

	{#if !data.liste.length}
		<BosDurum
			baslik="Henüz karar düğümün yok"
			aciklama="Bir iş değişikliği, taşınma, bir okulu seçmek… Bir karar düğümü ekle, defterine gerekçeni ve beklentini yaz."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni?tur=karar">İlk kararını ekle</a>
			{/snippet}
		</BosDurum>
	{:else}
		<section class="kart kalibrasyon" aria-labelledby="kalibrasyon-baslik">
			<div class="kalibrasyon-ust">
				<div>
					<h2 id="kalibrasyon-baslik">Kalibrasyon</h2>
					<p class="soluk kucuk">
						Noktalar çapraz çizgiye ne kadar yakınsa, “%70 eminim” dediğin şeyler o kadar sık %70
						oranında gerçekleşiyor demektir. Çizginin altı: fazla emin; üstü: fazla temkinli.
					</p>
				</div>
				<div class="brier" aria-live="polite">
					<span class="brier-etiket">Brier puanı</span>
					<strong>{data.brier === null ? '—' : brierMetni(data.brier)}</strong>
					<span class="kucuk"
						>{data.brier !== null && data.sonuclananSayisi < ANLAMLI_SAYI
							? 'Yorum için henüz az sonuç var.'
							: brierYorumu(data.brier)}</span
					>
				</div>
			</div>

			{#if data.dilimler.length}
				<figure>
					<svg
						viewBox="0 0 {G.sol + G.gen + 16} {G.ust + G.yuk + 40}"
						role="img"
						aria-labelledby="grafik-aciklama"
					>
						{#each CIZGILER as c (c)}
							<line class="izgara" x1={x(0)} x2={x(100)} y1={y(c)} y2={y(c)} />
							<text class="eksen" x={G.sol - 8} y={y(c) + 4} text-anchor="end">%{c}</text>
							<text class="eksen" x={x(c)} y={G.ust + G.yuk + 18} text-anchor="middle">%{c}</text>
						{/each}
						<line class="kusursuz" x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} />
						{#each data.dilimler as d (d.alt)}
							<circle
								class="nokta"
								cx={x(d.ortalamaGuven)}
								cy={y(d.gerceklesme)}
								r={yaricap(d.sayi)}
							/>
						{/each}
						<text
							class="eksen-adi"
							transform="translate(14 {y(50)}) rotate(-90)"
							text-anchor="middle">Gerçekleşen</text
						>
						<text class="eksen-adi" x={x(50)} y={G.ust + G.yuk + 36} text-anchor="middle"
							>Güvenin</text
						>
					</svg>
					<figcaption id="grafik-aciklama" class="gorunmez">
						Güven dilimlerine göre gerçekleşme oranları; ayrıntılar aşağıdaki tabloda.
					</figcaption>
				</figure>
				<table>
					<caption class="gorunmez">Güven dilimlerine göre kararların gerçekleşme oranı</caption>
					<thead>
						<tr>
							<th scope="col">Güven</th>
							<th scope="col">Karar</th>
							<th scope="col">Gerçekleşen</th>
						</tr>
					</thead>
					<tbody>
						{#each data.dilimler as d (d.alt)}
							<tr>
								<th scope="row">%{d.alt}–{d.ust}</th>
								<td>{d.sayi}</td>
								<td>%{d.gerceklesme}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if data.sonuclananSayisi < ANLAMLI_SAYI}
					<p class="kucuk soluk">
						{data.sonuclananSayisi} sonuç var; kalibrasyon en az {ANLAMLI_SAYI} sonuçla anlam kazanmaya
						başlar. “Kısmen” yarım gerçekleşme sayılır.
					</p>
				{/if}
			{:else}
				<p class="soluk">Güven yazdığın bir kararın sonucu belli olunca grafik burada belirir.</p>
			{/if}
		</section>

		{#snippet kararSatiri(k: (typeof data.liste)[number])}
			<li>
				<a href="/dugumler/{k.dugumId}" class="karar-baglantisi">
					<TurSekli tur="karar" boyut={12} />
					<span class="metin">
						<strong>{k.baslik}</strong>
						{#if k.beklenti}<span class="kucuk soluk">Beklenti: {k.beklenti}</span>{/if}
					</span>
					<span class="ek">
						{#if k.sonuc}
							<span class="rozet" data-sonuc={k.sonuc}
								>{KARAR_SONUCU_ETIKETI[k.sonuc as KararSonucu]}</span
							>
						{:else if k.sorulacak}
							<span class="kucuk soluk">{tarihMetni(k.sorulacak)}</span>
						{:else if k.guven === null && !k.beklenti}
							<span class="kucuk soluk">Deftere yazılmadı</span>
						{/if}
						{#if k.guven !== null}<span class="kucuk soluk">%{k.guven} emin</span>{/if}
						{#if !k.sonuc && !k.sorulacak && k.tarih}
							<span class="kucuk soluk">{tarihYaz(k.tarih, k.tarihHassasiyeti)}</span>
						{/if}
					</span>
				</a>
			</li>
		{/snippet}

		{#if zamaniGelen.length}
			<section class="yigin" aria-labelledby="zaman-baslik">
				<h2 id="zaman-baslik">Sonuç zamanı</h2>
				<ul class="liste vurgulu">
					{#each zamaniGelen as k (k.dugumId)}{@render kararSatiri(k)}{/each}
				</ul>
			</section>
		{/if}

		{#if bekleyen.length}
			<section class="yigin" aria-labelledby="bekleyen-baslik">
				<h2 id="bekleyen-baslik">Sonucu bekleyenler</h2>
				<ul class="liste">
					{#each bekleyen as k (k.dugumId)}{@render kararSatiri(k)}{/each}
				</ul>
			</section>
		{/if}

		{#if sonuclanan.length}
			<section class="yigin" aria-labelledby="sonuclanan-baslik">
				<h2 id="sonuclanan-baslik">Sonuçlananlar</h2>
				<ul class="liste">
					{#each sonuclanan as k (k.dugumId)}{@render kararSatiri(k)}{/each}
				</ul>
			</section>
		{/if}
	{/if}
</div>

<style>
	h2 {
		margin: 0;
	}
	.kalibrasyon {
		display: flex;
		flex-direction: column;
		gap: var(--a-4);
	}
	.kalibrasyon-ust {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-4);
		justify-content: space-between;
	}
	.kalibrasyon-ust > div:first-child {
		flex: 1 1 20rem;
	}
	.kalibrasyon-ust p {
		margin: var(--a-1) 0 0;
		max-width: var(--okuma-genislik);
	}
	.brier {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 12rem;
		max-width: 18rem;
		padding: var(--a-3) var(--a-4);
		border-radius: var(--yaricap);
		background: var(--tur-karar-zemin);
	}
	.brier-etiket {
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--tur-karar);
	}
	.brier strong {
		font-family: var(--yazi-baslik);
		font-size: 2rem;
		line-height: 1.1;
	}
	figure {
		margin: 0;
		max-width: 26rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.izgara {
		stroke: var(--cizgi);
		stroke-width: 1;
	}
	.kusursuz {
		stroke: var(--metin-silik);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}
	.nokta {
		fill: var(--tur-karar);
		fill-opacity: 0.85;
		stroke: var(--yuzey);
		stroke-width: 2;
	}
	.eksen {
		font-size: 11px;
		fill: var(--metin-soluk);
	}
	.eksen-adi {
		font-size: 12px;
		font-weight: 600;
		fill: var(--metin-soluk);
	}
	table {
		border-collapse: collapse;
		font-size: var(--boyut-sm);
		max-width: 26rem;
	}
	th,
	td {
		padding: var(--a-1) var(--a-3);
		text-align: left;
		border-bottom: 1px solid var(--cizgi);
	}
	thead th {
		color: var(--metin-soluk);
		font-weight: 600;
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		overflow: hidden;
	}
	.liste li + li {
		border-top: 1px solid var(--cizgi);
	}
	.liste.vurgulu {
		border-left: 4px solid var(--tur-karar);
	}
	.karar-baglantisi {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		padding: var(--a-3) var(--a-4);
		color: var(--metin);
		text-decoration: none;
	}
	.karar-baglantisi:hover {
		background: var(--yuzey-2);
	}
	.karar-baglantisi .metin {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.karar-baglantisi .metin span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ek {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		text-align: right;
		flex: none;
	}
	.rozet[data-sonuc='gerceklesti'] {
		background: var(--basari-zemin);
		color: var(--basari);
	}
	.rozet[data-sonuc='kismen'] {
		background: var(--tur-karar-zemin);
		color: var(--tur-karar);
	}
	.rozet[data-sonuc='gerceklesmedi'] {
		background: var(--yuzey-2);
		color: var(--metin-soluk);
	}
	@media (max-width: 30rem) {
		.karar-baglantisi {
			flex-wrap: wrap;
		}
		.ek {
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			width: 100%;
			padding-left: calc(12px + var(--a-3));
			text-align: left;
		}
	}
</style>
