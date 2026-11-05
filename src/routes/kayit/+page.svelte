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

	const h = $derived(form?.hatalar as Record<string, string> | undefined);
	const d = $derived(form?.degerler as Record<string, string> | undefined);
</script>

<svelte:head><title>{t('kayit.sekme')} · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		<h1>{t('kayit.baslik')}</h1>
		<p class="soluk">{t('kayit.giris')}</p>

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
			{#if h?.genel}<p class="bildirim bildirim-hata" role="alert">{hd(h.genel)}</p>{/if}

			<Alan id="ad" etiket={t('kayit.ad')} hata={hd(h?.ad)}>
				<input
					id="ad"
					name="ad"
					autocomplete="name"
					value={d?.ad ?? ''}
					aria-invalid={!!h?.ad}
					required
					maxlength="80"
				/>
			</Alan>
			<Alan
				id="kullaniciAdi"
				etiket={t('kayit.kullaniciAdi')}
				hata={hd(h?.kullaniciAdi)}
				ipucu={t('kayit.kullaniciAdiIpucu')}
			>
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
			<Alan id="eposta" etiket={t('giris.eposta')} hata={hd(h?.eposta)}>
				<input
					id="eposta"
					name="eposta"
					type="email"
					autocomplete="email"
					value={d?.eposta ?? ''}
					aria-invalid={!!h?.eposta}
					required
				/>
			</Alan>
			<Alan id="sifre" etiket={t('giris.sifre')} hata={hd(h?.sifre)} ipucu={t('kayit.sifreIpucu')}>
				<input
					id="sifre"
					name="sifre"
					type="password"
					autocomplete="new-password"
					aria-invalid={!!h?.sifre}
					required
					minlength="10"
				/>
			</Alan>
			<Alan id="sifreTekrar" etiket={t('kayit.sifreTekrar')} hata={hd(h?.sifreTekrar)}>
				<input
					id="sifreTekrar"
					name="sifreTekrar"
					type="password"
					autocomplete="new-password"
					aria-invalid={!!h?.sifreTekrar}
					required
				/>
			</Alan>

			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				{gonderiliyor ? t('kayit.aciliyor') : t('kayit.ac')}
			</button>
			<p class="kucuk soluk aydinlatma">
				{t('kayit.aydinlatmaBas')} <a href="/gizlilik">{t('kayit.aydinlatmaBag')}</a>{ceviri.dil ===
				'en'
					? ''
					: ' '}{t('kayit.aydinlatmaSon')}
			</p>
		</form>

		<p class="kucuk soluk alt-not">{t('kayit.hesapVar')} <a href="/giris">{t('giris.yap')}</a></p>
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
	.aydinlatma {
		margin: 0;
		line-height: 1.5;
	}
</style>
