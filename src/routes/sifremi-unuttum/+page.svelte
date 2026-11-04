<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let gonderiliyor = $state(false);
</script>

<svelte:head><title>Şifremi unuttum · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		<h1>Şifreni mi unuttun?</h1>
		{#if form?.gonderildi}
			<p class="bildirim bildirim-basari" role="status">
				<strong>{form.eposta}</strong> adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik.
				Bağlantı bir saat geçerli. Gelen kutunda yoksa istenmeyen klasörüne de bak.
			</p>
			<p class="kucuk soluk alt-not"><a href="/giris">Girişe dön</a></p>
		{:else}
			<p class="soluk">E-posta adresini yaz; şifreni yenilemen için bir bağlantı gönderelim.</p>
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
				<Alan id="eposta" etiket="E-posta" hata={form?.hata}>
					<input
						id="eposta"
						name="eposta"
						type="email"
						autocomplete="email"
						value={form?.eposta ?? ''}
						aria-invalid={!!form?.hata}
						required
					/>
				</Alan>
				<button class="dugme dugme-birincil" disabled={gonderiliyor}>
					{gonderiliyor ? 'Gönderiliyor…' : 'Bağlantı gönder'}
				</button>
			</form>
			<p class="kucuk soluk alt-not">Hatırladın mı? <a href="/giris">Giriş yap</a></p>
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
	.alt-not {
		margin: var(--a-4) 0 0;
	}
</style>
