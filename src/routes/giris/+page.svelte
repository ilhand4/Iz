<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
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
			<Alan id="sifre" etiket="Şifre" hata={h?.sifre}>
				<input id="sifre" name="sifre" type="password" autocomplete="current-password" aria-invalid={!!h?.sifre} required />
			</Alan>

			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				{gonderiliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
			</button>
		</form>

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
	.alt-not {
		margin: var(--a-4) 0 0;
	}
</style>
