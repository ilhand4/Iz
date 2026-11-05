<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import { hataDilde } from '#lib/dil.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let gonderiliyor = $state(false);
	const t = $derived(ceviri.t);
	const hd = (m: string | null | undefined) => hataDilde(m, ceviri.dil);
</script>

<svelte:head><title>{t('unuttum.sekme')} · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		<h1>{t('unuttum.baslik')}</h1>
		{#if form?.gonderildi}
			<p class="bildirim bildirim-basari" role="status">
				{#if ceviri.dil === 'en'}{t('unuttum.gonderildi')} (<strong>{form.eposta}</strong
					>){:else}<strong>{form.eposta}</strong>
					{t('unuttum.gonderildi')}{/if}
				{t('unuttum.gecerlilik')}
			</p>
			<p class="kucuk soluk alt-not"><a href="/giris">{t('unuttum.giriseDon')}</a></p>
		{:else}
			<p class="soluk">{t('unuttum.giris')}</p>
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
				<Alan id="eposta" etiket={t('giris.eposta')} hata={hd(form?.hata)}>
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
					{gonderiliyor ? t('unuttum.gonderiliyor') : t('unuttum.gonder')}
				</button>
			</form>
			<p class="kucuk soluk alt-not">
				{t('unuttum.hatirladin')} <a href="/giris">{t('giris.yap')}</a>
			</p>
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
