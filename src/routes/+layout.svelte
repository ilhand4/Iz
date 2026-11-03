<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/fraunces';
	import '#lib/stiller/tasarim.css';
	import { page } from '$app/state';
	import Logo from '#lib/bilesenler/Logo.svelte';
	import Simge, { type SimgeAdi } from '#lib/bilesenler/Simge.svelte';
	import TemaDugmesi from '#lib/bilesenler/TemaDugmesi.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const MENU: { yol: string; etiket: string; simge: SimgeAdi }[] = [
		{ yol: '/pano', etiket: 'Pano', simge: 'pano' },
		{ yol: '/dugumler', etiket: 'Düğümler', simge: 'dugumler' },
		{ yol: '/dugumler/yeni', etiket: 'Ekle', simge: 'ekle' },
		{ yol: '/ara', etiket: 'Eser ara', simge: 'ara' }
	];

	function etkinMi(yol: string) {
		const p = page.url.pathname;
		if (yol === '/dugumler') return p === '/dugumler' || (p.startsWith('/dugumler/') && p !== '/dugumler/yeni');
		return p === yol || p.startsWith(yol + '/');
	}
</script>

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
			<TemaDugmesi baslangic={data.tema} />
			{#if data.kullanici}
				<span class="kullanici kucuk soluk" title="@{data.kullanici.kullaniciAdi}">
					{data.kullanici.ad}
				</span>
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
		{#each MENU as m (m.yol)}
			<a href={m.yol} aria-current={etkinMi(m.yol) ? 'page' : undefined}>
				<Simge ad={m.simge} boyut={22} />
				<span>{m.etiket}</span>
			</a>
		{/each}
	</nav>
{/if}

<footer class="alt kap">
	<p class="kucuk soluk">
		İz — insanlar ne yaşadığını kaydeder; İz neyin seni neye götürdüğünü kaydeder.
	</p>
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
		min-height: 3.75rem;
	}
	.logo-baglanti {
		text-decoration: none;
	}
	.ust-menu {
		display: none;
		gap: var(--a-1);
	}
	.ust-menu a {
		padding: var(--a-2) var(--a-3);
		border-radius: var(--yaricap);
		color: var(--metin-soluk);
		text-decoration: none;
		font-weight: 550;
		font-size: var(--boyut-sm);
	}
	.ust-menu a:hover {
		background: var(--yuzey-2);
		color: var(--metin);
	}
	.ust-menu a[aria-current='page'] {
		background: var(--yuzey-2);
		color: var(--metin);
	}
	.ust-sag {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--a-1);
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
	main.alt-menulu {
		padding-bottom: calc(var(--alt-menu-yukseklik) + var(--a-6));
	}
	.alt-menu {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: calc(var(--alt-menu-yukseklik) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--yuzey);
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
		font-size: var(--boyut-xs);
		font-weight: 550;
	}
	.alt-menu a[aria-current='page'] {
		color: var(--vurgu);
	}
	.alt {
		padding-block: var(--a-5);
		border-top: 1px solid var(--cizgi);
	}
	main.alt-menulu + .alt-menu + .alt {
		padding-bottom: calc(var(--alt-menu-yukseklik) + var(--a-5));
	}
	.alt p {
		margin: 0;
	}

	@media (min-width: 48rem) {
		.ust-menu {
			display: flex;
		}
		.kullanici {
			display: inline;
		}
		.alt-menu {
			display: none;
		}
		main.alt-menulu {
			padding-bottom: var(--a-7);
		}
		main.alt-menulu + .alt-menu + .alt {
			padding-bottom: var(--a-5);
		}
	}
</style>
