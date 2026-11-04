<script lang="ts">
	// Hat haritası: izler metro hatları, düğümler duraklar; birden fazla izin geçtiği düğümler
	// aktarma istasyonu. Yatay eksen zaman. Çizim SVG; yanında erişilebilir metin listesi.
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const c = $derived(data.cizim);
	const istasyon = $derived(new Map(c.istasyonlar.map((s) => [s.id, s])));

	// Hat renkleri: tür ve vurgu belirteçleri sırayla
	const RENKLER = [
		'var(--vurgu)',
		'var(--tur-karar)',
		'var(--tur-yer)',
		'var(--tur-ani)',
		'var(--tur-eser)',
		'var(--tur-kisi)'
	];
	const renk = (i: number) => RENKLER[i % RENKLER.length];
	/** Köşeleri yuvarlatılmış metro çizgisi: yatay git, sonra eğimli geç */
	function yol(noktalar: { x: number; y: number }[]) {
		if (!noktalar.length) return '';
		let d = `M${noktalar[0].x} ${noktalar[0].y}`;
		for (let i = 1; i < noktalar.length; i++) {
			const a = noktalar[i - 1];
			const b = noktalar[i];
			if (a.y === b.y) d += ` L${b.x} ${b.y}`;
			else {
				const orta = (a.x + b.x) / 2;
				d += ` C${orta} ${a.y} ${orta} ${b.y} ${b.x} ${b.y}`;
			}
		}
		return d;
	}
	const kisa = (s: string) => (s.length > 22 ? s.slice(0, 21) + '…' : s);
</script>

<svelte:head><title>Hat haritası · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="İzler"
		baslik="Hat haritası"
		aciklama="İzlerin metro hatları gibi: her iz bir hat, her düğüm bir durak. Birden fazla izin geçtiği düğümler aktarma istasyonu; soldan sağa zaman."
		geri={{ href: '/izler', etiket: 'İzler' }}
	/>

	{#if c.istasyonlar.length === 0}
		<BosDurum
			baslik="Henüz çizilecek hat yok"
			aciklama="Birkaç iz oluşturduğunda burada hatlar ve aktarma istasyonları belirir."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/izler/yeni">İz oluştur</a>
			{/snippet}
		</BosDurum>
	{:else}
		<ul class="lejant" aria-label="Hatlar">
			{#each c.hatlar as h (h.id)}
				<li style:--renk={renk(h.sira)}>
					<span class="cizgi" aria-hidden="true"></span>
					<a href="/izler/{h.id}">{h.baslik}</a>
				</li>
			{/each}
		</ul>

		<div class="tuval">
			<svg
				role="group"
				aria-label="Hat haritası: {c.hatlar.length} hat, {c.istasyonlar.length} durak"
				width={c.genislik}
				height={c.yukseklik}
				viewBox="0 0 {c.genislik} {c.yukseklik}"
			>
				{#each c.yillar as y (y.yil)}
					<line x1={y.x} x2={y.x} y1="24" y2={c.yukseklik - 10} class="yil-cizgisi" />
					<text x={y.x + 6} y="22" class="yil">{y.yil}</text>
				{/each}
				{#each c.hatlar as h (h.id)}
					<path d={yol(h.noktalar)} class="hat" style:stroke={renk(h.sira)} />
				{/each}
				{#each c.istasyonlar as s (s.id)}
					<a href="/dugumler/{s.id}" class="istasyon" class:aktarma={s.aktarma}>
						<title>{s.baslik}{s.aktarma ? ` · ${s.hatlar.length} izin aktarma durağı` : ''}</title>
						<circle
							cx={s.x}
							cy={s.y}
							r={s.aktarma ? 12 : 8}
							style:stroke={s.aktarma ? undefined : renk(s.hatlar[0])}
						/>
						<text x={s.x + 4} y={s.y - 16} transform="rotate(-30 {s.x + 4} {s.y - 16})"
							>{kisa(s.baslik)}</text
						>
					</a>
				{/each}
			</svg>
		</div>

		<details class="metin-listesi">
			<summary>Hatları metin olarak göster</summary>
			{#each c.hatlar as h (h.id)}
				<h2>{h.baslik}</h2>
				<ol>
					{#each h.noktalar as n (n.id)}
						{@const s = istasyon.get(n.id)}
						{#if s}
							<li>
								<a href="/dugumler/{s.id}">{s.baslik}</a>{s.aktarma ? ' (aktarma)' : ''}
							</li>
						{/if}
					{/each}
				</ol>
			{/each}
		</details>
		<p class="kucuk soluk">
			<Simge ad="iz" boyut={14} /> Bir durağa dokununca düğümün sayfası açılır. Geniş haritalarda yatay
			kaydır.
		</p>
	{/if}
</div>

<style>
	.lejant {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2) var(--a-4);
	}
	.lejant li {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
		font-weight: 600;
	}
	.lejant .cizgi {
		width: 1.8rem;
		height: 6px;
		border-radius: 3px;
		background: var(--renk);
	}
	.lejant a {
		color: var(--metin);
	}
	.tuval {
		overflow-x: auto;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
	}
	svg {
		display: block;
	}
	.yil-cizgisi {
		stroke: var(--cizgi);
		stroke-dasharray: 2 6;
	}
	.yil {
		fill: var(--metin-soluk);
		font-size: 13px;
		font-weight: 700;
		font-family: var(--yazi-govde);
	}
	.hat {
		fill: none;
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.istasyon circle {
		fill: var(--yuzey);
		stroke-width: 4;
	}
	.istasyon.aktarma circle {
		stroke: var(--metin);
		stroke-width: 4.5;
	}
	.istasyon text {
		fill: var(--metin);
		font-size: 13px;
		font-weight: 600;
		font-family: var(--yazi-govde);
	}
	.istasyon:hover text,
	.istasyon:focus-visible text {
		fill: var(--vurgu);
	}
	.istasyon:focus-visible circle {
		stroke: var(--vurgu);
	}
	.metin-listesi h2 {
		font-size: var(--boyut-md);
		margin: var(--a-3) 0 var(--a-1);
	}
	p {
		margin: 0;
	}
</style>
