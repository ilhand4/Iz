<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import GecisAnahtari from '#lib/bilesenler/GecisAnahtari.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let gonderiliyor = $state(false);

	const h = $derived(form?.hatalar as Record<string, string> | undefined);
</script>

<svelte:head><title>Giriş · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		<h1>Tekrar hoş geldin</h1>

		<form
			method="POST"
			class="yigin"
			novalidate
			use:enhance={() => {
				gonderiliyor = true;
				return async ({ update }) => {
					await update({ reset: false });
					gonderiliyor = false;
				};
			}}
		>
			{#if page.url.searchParams.has('sifirlandi') && !form}
				<p class="bildirim bildirim-basari" role="status">
					Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.
				</p>
			{/if}
			{#if h?.genel}<p class="bildirim bildirim-hata" role="alert">{h.genel}</p>{/if}

			<Alan id="eposta" etiket="E-posta" hata={h?.eposta}>
				<input
					id="eposta"
					name="eposta"
					type="email"
					autocomplete="email"
					value={form?.degerler?.eposta ?? ''}
					aria-invalid={!!h?.eposta}
					required
				/>
			</Alan>
			<Alan id="sifre" etiket="Şifre" hata={h?.sifre} ipucu={null}>
				<input
					id="sifre"
					name="sifre"
					type="password"
					autocomplete="current-password"
					aria-invalid={!!h?.sifre}
					required
				/>
			</Alan>

			<p class="kucuk sifre-unuttum"><a href="/sifremi-unuttum">Şifremi unuttum</a></p>

			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				{gonderiliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
			</button>
		</form>

		<div class="ya-da" aria-hidden="true"><span>ya da</span></div>
		<GecisAnahtari kip="giris" donus={page.url.searchParams.get('donus')} />

		<p class="kucuk soluk alt-not">Hesabın yok mu? <a href="/kayit">Kayıt ol</a></p>
	</div>
</div>

<style>
	.hesap-karti {
		max-width: 28rem;
		margin: var(--a-4) auto;
	}
	h1 {
		font-size: var(--boyut-2xl);
	}
	.sifre-unuttum {
		margin: calc(-1 * var(--a-2)) 0 0;
		text-align: right;
	}
	.ya-da {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		margin: var(--a-4) 0 var(--a-3);
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.ya-da::before,
	.ya-da::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--cizgi);
	}
	.alt-not {
		margin: var(--a-4) 0 0;
	}
</style>
