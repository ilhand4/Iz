<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { DUGUM_TURLERI, DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const y = $derived(data.yillik);
</script>

<svelte:head><title>İz Yıllığı {y.yil} · İz</title></svelte:head>

<div class="kap kap-orta yigin genis">
	<SayfaBasligi
		ust="İz Yıllığı"
		baslik={String(y.yil)}
		aciklama="O yıl seni nereye götüren neydi? Yılın düğümleri, en uzun zinciri ve yeni oluşan kümeler."
	>
		{#snippet eylemler()}
			{#if y.toplam}
				<a class="dugme" href="/yillik/{y.yil}/kart.png" download="iz-yilligi-{y.yil}.png">
					<Simge ad="asagi" boyut={18} /> Kartı indir
				</a>
			{/if}
		{/snippet}
	</SayfaBasligi>

	{#if data.yillar.length}
		<nav class="yillar" aria-label="Yıllar">
			{#each data.yillar as yil (yil)}
				<a href="/yillik/{yil}" aria-current={yil === y.yil ? 'page' : undefined}>{yil}</a>
			{/each}
		</nav>
	{/if}

	{#if y.toplam === 0}
		<BosDurum
			baslik="Bu yıl için tarihli düğüm yok"
			aciklama="Düğümlerine tarih ekledikçe yıllığın dolar."
		/>
	{:else}
		<section class="ozet" aria-label="Yılın sayıları">
			<div class="kart sayi">
				<strong>{y.toplam}</strong>
				<span>düğüm</span>
			</div>
			{#each DUGUM_TURLERI as t (t)}
				{#if y.turler[t]}
					<div class="kart sayi">
						<strong>{y.turler[t]}</strong>
						<span
							><TurSekli tur={t} boyut={11} /> {DUGUM_TURU_ETIKETI[t].toLocaleLowerCase('tr')}</span
						>
					</div>
				{/if}
			{/each}
			{#if y.gecmistenGelen}
				<div class="kart sayi">
					<strong>{y.gecmistenGelen}</strong>
					<span>önceki yıllardan gelen bağ</span>
				</div>
			{/if}
		</section>

		{#if y.enCokGoturen}
			<section class="kart vurgu" aria-labelledby="goturen-baslik">
				<h2 id="goturen-baslik">Seni en çok yere götüren</h2>
				<p>
					<a href="/dugumler/{y.enCokGoturen.id}"
						><TurSekli tur={y.enCokGoturen.tur} boyut={14} /> {y.enCokGoturen.baslik}</a
					>
					— o yıl, bağlar boyunca {y.enCokGoturen.ulasilan} şeye götürdü.
				</p>
			</section>
		{/if}

		{#if y.enUzunZincir.length > 1}
			<section class="yigin" aria-labelledby="zincir-baslik">
				<h2 id="zincir-baslik">
					Yılın en uzun zinciri <span class="soluk">({y.enUzunZincir.length})</span>
				</h2>
				<ol class="zincir">
					{#each y.enUzunZincir as d, i (d.id)}
						<li>
							<a href="/dugumler/{d.id}"><TurSekli tur={d.tur} boyut={12} /> {d.baslik}</a>
							{#if i < y.enUzunZincir.length - 1}<span class="ok" aria-hidden="true">→</span>{/if}
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if y.kumeler.length}
			<section class="yigin" aria-labelledby="kume-baslik">
				<h2 id="kume-baslik">Yeni kümeler</h2>
				<p class="kucuk soluk">O yıl birbirine bağlanan düğüm grupları.</p>
				<div class="kumeler">
					{#each y.kumeler as kume, i (i)}
						<div class="kart">
							<p class="kucuk soluk">{kume.length} düğüm</p>
							<ul>
								{#each kume.slice(0, 8) as d (d.id)}
									<li>
										<a href="/dugumler/{d.id}"><TurSekli tur={d.tur} boyut={10} /> {d.baslik}</a>
									</li>
								{/each}
								{#if kume.length > 8}<li class="soluk kucuk">
										ve {kume.length - 8} tane daha
									</li>{/if}
							</ul>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.genis {
		gap: var(--a-6);
	}
	h2 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	.yillar {
		display: flex;
		gap: var(--a-2);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.yillar a {
		flex: none;
		padding: var(--a-1) var(--a-3);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-tam);
		color: var(--metin-soluk);
		text-decoration: none;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.yillar a[aria-current] {
		background: var(--metin);
		border-color: var(--metin);
		color: var(--zemin);
	}
	.ozet {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
	}
	.sayi {
		display: flex;
		flex-direction: column;
	}
	.sayi strong {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-3xl);
		line-height: 1.1;
	}
	.sayi span {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.vurgu {
		border-left: 4px solid var(--vurgu);
	}
	.vurgu p {
		margin: var(--a-2) 0 0;
	}
	a {
		color: var(--metin);
	}
	.vurgu a,
	.zincir a,
	.kumeler a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-weight: 600;
	}
	.zincir {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2);
	}
	.zincir li {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
	}
	.kumeler {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
	}
	.kumeler ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
	}
	.kumeler p {
		margin: 0 0 var(--a-2);
	}
</style>
