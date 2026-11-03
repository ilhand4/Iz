<script lang="ts">
	import { page } from '$app/state';

	const BASLIK: Record<number, string> = {
		400: 'İstek anlaşılamadı',
		403: 'Bu işleme izin yok',
		404: 'Burada bir iz yok',
		429: 'Biraz yavaşlayalım',
		500: 'Bir şeyler ters gitti'
	};
</script>

<svelte:head><title>{BASLIK[page.status] ?? 'Hata'} · İz</title></svelte:head>

<div class="kap kap-dar">
	<div class="kart hata">
		<p class="kod">{page.status}</p>
		<h1>{BASLIK[page.status] ?? 'Hata'}</h1>
		<p class="soluk">
			{page.status === 500 ? 'Beklenmedik bir hata oluştu. Lütfen biraz sonra tekrar dene.' : page.error?.message}
		</p>
		<div class="satir">
			<a class="dugme dugme-birincil" href="/">Ana sayfa</a>
			<a class="dugme" href="/pano">Pano</a>
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
