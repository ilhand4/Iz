<script lang="ts">
	import DugumKarti from '#lib/bilesenler/DugumKarti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import { DUGUM_TURLERI, DUGUM_TURU_COGUL } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const pano = $derived(data.pano);
	const toplam = $derived(Object.values(pano.sayilar).reduce((a, b) => a + (b ?? 0), 0));
</script>

<svelte:head><title>Pano · İz</title></svelte:head>

<div class="kap yigin">
	<header class="baslik-satiri">
		<div>
			<h1>Merhaba, {data.kullanici?.ad}</h1>
			<p class="soluk">
				{#if toplam === 0}
					Haritan henüz boş. İlk düğümünü ekleyerek başla.
				{:else}
					Haritanda {toplam} düğüm ve {pano.bagSayisi} bağ var.
				{/if}
			</p>
		</div>
		<div class="satir">
			<a class="dugme dugme-birincil" href="/dugumler/yeni"><Simge ad="ekle" boyut={18} /> Düğüm ekle</a>
			<a class="dugme" href="/ara"><Simge ad="ara" boyut={18} /> Eser ara</a>
		</div>
	</header>

	{#if data.hosgeldin}
		<p class="bildirim bildirim-basari" role="status">
			Hesabın açıldı. Hoş geldin! Bir kitap, film ya da hayatındaki bir anla başlayabilirsin.
		</p>
	{/if}

	<section aria-label="Türlere göre düğüm sayıları" class="sayilar">
		{#each DUGUM_TURLERI as tur (tur)}
			<a class="kart sayi" href="/dugumler?tur={tur}" data-tur={tur}>
				<strong>{pano.sayilar[tur] ?? 0}</strong>
				<span>{DUGUM_TURU_COGUL[tur]}</span>
			</a>
		{/each}
	</section>

	<div class="iki-sutun">
		<section class="yigin">
			<div class="satir bolum-baslik">
				<h2>Son eklenenler</h2>
				{#if pano.sonDugumler.length}<a href="/dugumler" class="kucuk">Tümü</a>{/if}
			</div>
			{#if pano.sonDugumler.length}
				<div class="yigin liste">
					{#each pano.sonDugumler as dugum (dugum.id)}
						<DugumKarti {dugum} />
					{/each}
				</div>
			{:else}
				<div class="kart bos">
					<p>Henüz düğüm yok.</p>
					<p class="soluk kucuk">Okuduğun bir kitap, tanıştığın biri, yaşadığın bir yer… Her şey bir düğüm olabilir.</p>
				</div>
			{/if}
		</section>

		<section class="yigin">
			<h2>Son bağlar</h2>
			{#if pano.sonBaglar.length}
				<ul class="baglar">
					{#each pano.sonBaglar as bag (bag.id)}
						<li class="kart">
							<a href="/dugumler/{bag.kaynak.id}">{bag.kaynak.baslik}</a>
							<span class="ok" aria-label="şuna götürdü">→</span>
							<a href="/dugumler/{bag.hedef.id}">{bag.hedef.baslik}</a>
							<span class="satir">
								<TurRozeti tur={bag.kaynak.tur} />
								<span class="soluk kucuk">→</span>
								<TurRozeti tur={bag.hedef.tur} />
							</span>
							{#if bag.not}<p class="not">“{bag.not}”</p>{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<div class="kart bos">
					<p>Henüz bağ yok.</p>
					<p class="soluk kucuk">
						Bir düğümün sayfasında “Bu beni şuna götürdü” diyerek iki düğümü bağlayabilirsin.
					</p>
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.baslik-satiri {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: var(--a-4);
	}
	.baslik-satiri h1 {
		font-size: var(--boyut-2xl);
		margin-bottom: var(--a-1);
	}
	.baslik-satiri p {
		margin: 0;
	}
	.sayilar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
		gap: var(--a-3);
	}
	.sayi {
		display: flex;
		flex-direction: column;
		padding: var(--a-3) var(--a-4);
		text-decoration: none;
		color: var(--metin);
		border-top: 3px solid var(--renk, var(--cizgi));
	}
	.sayi:hover {
		color: var(--metin);
		box-shadow: var(--golge-2);
	}
	.sayi[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.sayi[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.sayi[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.sayi[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.sayi[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.sayi strong {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-2xl);
		line-height: 1.1;
	}
	.sayi span {
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.iki-sutun {
		display: grid;
		gap: var(--a-6);
	}
	.bolum-baslik {
		justify-content: space-between;
	}
	h2 {
		margin: 0;
	}
	.liste {
		gap: var(--a-2);
	}
	.bos p {
		margin: 0 0 var(--a-1);
	}
	.baglar {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.baglar li {
		padding: var(--a-3) var(--a-4);
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-2);
		align-items: baseline;
	}
	.baglar a {
		font-weight: 600;
		color: var(--metin);
	}
	.ok {
		color: var(--vurgu);
	}
	.baglar .satir {
		width: 100%;
	}
	.not {
		width: 100%;
		margin: 0;
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	@media (min-width: 56rem) {
		.iki-sutun {
			grid-template-columns: 1.3fr 1fr;
		}
	}
</style>
