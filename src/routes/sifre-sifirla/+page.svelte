<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const h = $derived(form?.hatalar as Record<string, string> | undefined);
</script>

<svelte:head>
	<title>Yeni şifre · İz</title>
	<!-- Jetonlu adres başka sitelere gönderilmesin -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		{#if data.jeton}
			<h1>Yeni şifreni belirle</h1>
			<p class="soluk kucuk">
				{data.eposta} hesabı için. Kaydedince tüm cihazlardan çıkış yapılır.
			</p>
			<form method="POST" class="yigin" novalidate use:enhance>
				{#if h?.genel}<p class="bildirim bildirim-hata" role="alert">{h.genel}</p>{/if}
				<input type="hidden" name="jeton" value={data.jeton} />
				<input
					type="text"
					name="kullaniciAdi"
					autocomplete="username"
					value={data.eposta}
					hidden
					readonly
				/>
				<Alan id="sifre" etiket="Yeni şifre" hata={h?.sifre} ipucu="En az 10 karakter.">
					<input
						id="sifre"
						name="sifre"
						type="password"
						autocomplete="new-password"
						minlength="10"
						aria-invalid={!!h?.sifre}
						required
					/>
				</Alan>
				<Alan id="sifreTekrar" etiket="Yeni şifre (tekrar)" hata={h?.sifreTekrar}>
					<input
						id="sifreTekrar"
						name="sifreTekrar"
						type="password"
						autocomplete="new-password"
						aria-invalid={!!h?.sifreTekrar}
						required
					/>
				</Alan>
				<button class="dugme dugme-birincil">Şifreyi kaydet</button>
			</form>
		{:else}
			<h1>Bağlantı geçersiz</h1>
			<p class="soluk">
				Bu bağlantının süresi dolmuş ya da daha önce kullanılmış. Şifre sıfırlama bağlantıları bir
				saat geçerli ve tek kullanımlıktır.
			</p>
			<div class="satir">
				<a class="dugme dugme-birincil" href="/sifremi-unuttum">Yeni bağlantı iste</a>
			</div>
		{/if}
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
</style>
