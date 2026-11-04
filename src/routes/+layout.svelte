<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/fraunces';
	import '#lib/stiller/tasarim.css';
	import { page } from '$app/state';
	import Bildirimler from '#lib/bilesenler/Bildirimler.svelte';
	import Logo from '#lib/bilesenler/Logo.svelte';
	import Simge, { type SimgeAdi } from '#lib/bilesenler/Simge.svelte';
	import TemaDugmesi from '#lib/bilesenler/TemaDugmesi.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type MenuOgesi = { yol: string; etiket: string; simge: SimgeAdi };
	const MENU: MenuOgesi[] = [
		{ yol: '/pano', etiket: 'Pano', simge: 'pano' },
		{ yol: '/dugumler', etiket: 'Düğümler', simge: 'dugumler' },
		{ yol: '/izler', etiket: 'İzler', simge: 'iz' },
		{ yol: '/ara', etiket: 'Eser ara', simge: 'ara' }
	];
	// Mobil alt menü: ortada belirgin "Ekle"
	const ALT_MENU: (MenuOgesi & { ozel?: boolean })[] = [
		MENU[0],
		MENU[1],
		{ yol: '/dugumler/yeni', etiket: 'Ekle', simge: 'ekle', ozel: true },
		MENU[2],
		{ ...MENU[3], etiket: 'Ara' }
	];

	function etkinMi(yol: string) {
		const p = page.url.pathname;
		if (yol === '/dugumler') return p.startsWith('/dugumler') && p !== '/dugumler/yeni';
		return p === yol || p.startsWith(yol + '/');
	}
</script>

<svelte:head>
	<!-- Arama motorlarına varsayılan olarak kapalı; yalnızca sayfa açıkça izin verirse dizine eklenir -->
	{#if page.data.indekslenebilir !== true}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<a class="atla" href="#icerik">İçeriğe geç</a>

<header class="ust">
	<div class="kap ust-ic">
		<a href={data.kullanici ? '/pano' : '/'} class="logo-baglanti" aria-label="İz ana sayfa">
			<Logo />
		</a>

		{#if data.kullanici}
			<nav class="ust-menu" aria-label="Ana menü">
				{#each MENU as m (m.yol)}
					<a href={m.yol} aria-current={etkinMi(m.yol) ? 'page' : undefined}>{m.etiket}</a>
				{/each}
			</nav>
		{/if}

		<div class="ust-sag">
			{#if data.kullanici}
				<a class="dugme dugme-birincil dugme-kucuk ekle-dugmesi" href="/dugumler/yeni">
					<Simge ad="ekle" boyut={16} /> Ekle
				</a>
			{/if}
			<TemaDugmesi baslangic={data.tema} />
			{#if data.kullanici}
				<a
					class="dugme dugme-hayalet dugme-kucuk hesap-baglantisi"
					href="/ayarlar"
					title="Ayarlar (@{data.kullanici.kullaniciAdi})"
					aria-current={page.url.pathname === '/ayarlar' ? 'page' : undefined}
				>
					<Simge ad="ayar" />
					<span class="gorunmez">Ayarlar:</span>
					<span class="kullanici kucuk">{data.kullanici.ad}</span>
				</a>
				<form method="POST" action="/cikis">
					<button class="dugme dugme-hayalet dugme-kucuk" aria-label="Çıkış yap" title="Çıkış yap">
						<Simge ad="cikis" />
					</button>
				</form>
			{:else}
				<a class="dugme dugme-hayalet dugme-kucuk" href="/giris">Giriş</a>
				<a class="dugme dugme-birincil dugme-kucuk" href="/kayit">Kayıt ol</a>
			{/if}
		</div>
	</div>
</header>

<main id="icerik" class:alt-menulu={!!data.kullanici}>
	{@render children()}
</main>

{#if data.kullanici}
	<nav class="alt-menu" aria-label="Ana menü (mobil)">
		{#each ALT_MENU as m (m.yol)}
			<a
				href={m.yol}
				class:ozel={m.ozel}
				aria-current={!m.ozel && etkinMi(m.yol) ? 'page' : undefined}
			>
				<span class="simge"><Simge ad={m.simge} boyut={m.ozel ? 24 : 22} /></span>
				<span class="etiket">{m.etiket}</span>
			</a>
		{/each}
	</nav>
{/if}

<Bildirimler altMenu={!!data.kullanici} />

<footer class="alt" class:alt-menulu={!!data.kullanici}>
	<div class="kap alt-ic">
		<p class="slogan">
			<Logo boyut={20} />
			<span>İnsanlar ne yaşadığını kaydeder; İz neyin seni neye götürdüğünü kaydeder.</span>
		</p>
		<p class="kaynaklar">
			Eser verileri: <a
				href="https://openlibrary.org"
				rel="noopener noreferrer external"
				target="_blank">Open Library</a
			>
			ve
			<a href="https://www.themoviedb.org" rel="noopener noreferrer external" target="_blank"
				>TMDB</a
			>. Bu ürün TMDB API'sini kullanır ancak TMDB tarafından onaylanmamış ya da desteklenmemiştir.
		</p>
	</div>
</footer>

<style>
	.atla {
		position: absolute;
		left: var(--a-4);
		top: -3rem;
		padding: var(--a-2) var(--a-3);
		background: var(--vurgu);
		color: var(--vurgu-uzeri);
		border-radius: var(--yaricap);
		z-index: 20;
	}
	.atla:focus {
		top: var(--a-2);
	}
	.ust {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--zemin) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--cizgi);
	}
	.ust-ic {
		display: flex;
		align-items: center;
		gap: var(--a-4);
		height: var(--ust-yukseklik);
	}
	.logo-baglanti {
		text-decoration: none;
	}
	.ust-menu {
		display: none;
		gap: var(--a-1);
	}
	.ust-menu a {
		position: relative;
		padding: var(--a-2) var(--a-3);
		border-radius: var(--yaricap);
		color: var(--metin-soluk);
		text-decoration: none;
		font-weight: 550;
		font-size: var(--boyut-sm);
		transition:
			background var(--gecis),
			color var(--gecis);
	}
	.ust-menu a:hover {
		background: var(--yuzey-2);
		color: var(--metin);
	}
	.ust-menu a[aria-current='page'] {
		color: var(--metin);
	}
	/* Etkin sayfanın altında küçük iz çizgisi */
	.ust-menu a[aria-current='page']::after {
		content: '';
		position: absolute;
		left: var(--a-3);
		right: var(--a-3);
		bottom: -0.55rem;
		height: 2px;
		border-radius: 2px;
		background: var(--vurgu);
	}
	.ust-sag {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--a-1);
	}
	.ekle-dugmesi {
		display: none;
		margin-right: var(--a-2);
	}
	.kullanici {
		display: none;
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	main {
		padding-block: var(--a-5) var(--a-7);
		min-height: calc(100dvh - 9rem);
	}

	/* ——— Mobil alt menü ——— */
	.alt-menu {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		height: calc(var(--alt-menu-yukseklik) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: color-mix(in srgb, var(--yuzey) 94%, transparent);
		backdrop-filter: blur(10px);
		border-top: 1px solid var(--cizgi);
	}
	.alt-menu a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		color: var(--metin-soluk);
		text-decoration: none;
		font-size: 0.6875rem;
		font-weight: 600;
	}
	.alt-menu a[aria-current='page'] {
		color: var(--vurgu);
	}
	.alt-menu a.ozel .simge {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		margin-top: -1.4rem;
		border-radius: 50%;
		background: var(--vurgu);
		color: var(--vurgu-uzeri);
		box-shadow:
			0 0 0 4px var(--zemin),
			var(--golge-2);
	}
	.alt-menu a.ozel {
		color: var(--metin);
	}

	/* ——— Alt bilgi ——— */
	.alt {
		padding-block: var(--a-5);
		border-top: 1px solid var(--cizgi);
	}
	.alt.alt-menulu {
		padding-bottom: calc(var(--alt-menu-yukseklik) + var(--a-6));
	}
	.alt-ic {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.alt p {
		margin: 0;
	}
	.slogan {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.kaynaklar {
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}
	.kaynaklar a {
		color: var(--metin-soluk);
	}

	@media (min-width: 48rem) {
		.ust-menu {
			display: flex;
		}
		.ekle-dugmesi {
			display: inline-flex;
		}
		.alt-menu {
			display: none;
		}
		.alt.alt-menulu {
			padding-bottom: var(--a-5);
		}
	}
	@media (min-width: 64rem) {
		.kullanici {
			display: inline;
		}
	}
</style>
