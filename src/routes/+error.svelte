<script lang="ts">
	import { page } from '$app/state';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';

	const t = $derived(ceviri.t);
	const baslik = $derived(
		page.status === 400 ||
			page.status === 403 ||
			page.status === 404 ||
			page.status === 429 ||
			page.status === 500
			? t(`hata.${page.status}`)
			: t('hata.genel')
	);
	// Sunucunun Türkçe hata iletisi İngilizce arayüzde genel bir metinle değiştirilir
	const ileti = $derived(
		page.status >= 500
			? t('hata.500Metin')
			: ceviri.dil === 'en' && page.status === 404
				? t('hata.404Metin')
				: page.error?.message
	);
</script>

<svelte:head><title>{baslik} · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hata">
		<p class="kod">{page.status}</p>
		<h1>{baslik}</h1>
		<p class="soluk">
			{ileti}
		</p>
		<div class="satir">
			<a class="dugme dugme-birincil" href="/">{t('hata.anaSayfa')}</a>
			<a class="dugme" href="/pano">{t('hata.pano')}</a>
		</div>
	</div>
</div>

<style>
	.hata {
		margin-top: var(--a-6);
		text-align: center;
	}
	.hata .satir {
		justify-content: center;
	}
	.kod {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-4xl);
		color: var(--vurgu);
		margin: 0;
		line-height: 1;
	}
	h1 {
		font-size: var(--boyut-2xl);
	}
</style>
