<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let gonderiliyor = $state(false);

	const h = $derived(form?.hatalar as Record<string, string> | undefined);
	const d = $derived(form?.degerler as Record<string, string> | undefined);
</script>

<svelte:head><title>Kayıt ol · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		<h1>İzini başlat</h1>
		<p class="soluk">Hesabın yalnızca sana ait. Ne eklediğini, kimin göreceğini sen seçersin.</p>

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
			{#if h?.genel}<p class="bildirim bildirim-hata" role="alert">{h.genel}</p>{/if}

			<Alan id="ad" etiket="Adın" hata={h?.ad}>
				<input id="ad" name="ad" autocomplete="name" value={d?.ad ?? ''} aria-invalid={!!h?.ad} required maxlength="80" />
			</Alan>
			<Alan id="kullaniciAdi" etiket="Kullanıcı adı" hata={h?.kullaniciAdi} ipucu="3–30 karakter: a-z, rakam, nokta, alt çizgi.">
				<input
					id="kullaniciAdi"
					name="kullaniciAdi"
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					value={d?.kullaniciAdi ?? ''}
					aria-invalid={!!h?.kullaniciAdi}
					required
					maxlength="30"
				/>
			</Alan>
			<Alan id="eposta" etiket="E-posta" hata={h?.eposta}>
				<input id="eposta" name="eposta" type="email" autocomplete="email" value={d?.eposta ?? ''} aria-invalid={!!h?.eposta} required />
			</Alan>
			<Alan id="sifre" etiket="Şifre" hata={h?.sifre} ipucu="En az 10 karakter. Uzun bir cümle iyi bir şifredir.">
				<input id="sifre" name="sifre" type="password" autocomplete="new-password" aria-invalid={!!h?.sifre} required minlength="10" />
			</Alan>
			<Alan id="sifreTekrar" etiket="Şifre (tekrar)" hata={h?.sifreTekrar}>
				<input id="sifreTekrar" name="sifreTekrar" type="password" autocomplete="new-password" aria-invalid={!!h?.sifreTekrar} required />
			</Alan>

			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				{gonderiliyor ? 'Hesap açılıyor…' : 'Hesap aç'}
			</button>
		</form>

		<p class="kucuk soluk alt-not">Zaten hesabın var mı? <a href="/giris">Giriş yap</a></p>
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
	.alt-not {
		margin: var(--a-4) 0 0;
	}
</style>
