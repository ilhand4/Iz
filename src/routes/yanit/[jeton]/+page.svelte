<script lang="ts">
	import { enhance } from '$app/forms';
	import SesKaydedici from '#lib/bilesenler/SesKaydedici.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let gonderiliyor = $state(false);
</script>

<svelte:head>
	<title>{data.soran} sana bir soru sordu · İz</title>
	<!-- Bağlantıdaki jeton başka sitelere sızmasın -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="kap kap-dar yigin">
	{#if form?.tamam || data.yanitlandi}
		<section class="kart tesekkur yigin" aria-live="polite">
			<p class="ust-etiket">Teşekkürler</p>
			<h1>{form?.tamam ? 'Yanıtın gönderildi.' : 'Bu soru yanıtlanmış.'}</h1>
			<p>
				{data.soran}, anlattıklarını kendi İz arşivinde saklayacak. Bu sayfayı kapatabilirsin.
			</p>
		</section>
	{:else}
		<header class="yigin">
			<p class="ust-etiket">{data.aliciAdi}, {data.soran} sana bir soru sordu</p>
			<h1>{data.metin}</h1>
			<p class="soluk">
				Hesap açman gerekmiyor. Yazarak ya da sesli yanıtlayabilirsin; istediğin kadar uzun
				anlatabilirsin.
			</p>
		</header>

		<form
			method="POST"
			enctype="multipart/form-data"
			class="kart yigin"
			use:enhance={() => {
				gonderiliyor = true;
				return async ({ update }) => {
					await update({ reset: false });
					gonderiliyor = false;
				};
			}}
		>
			<div class="alan">
				<label for="yanit">Yazarak yanıtla</label>
				<textarea id="yanit" name="yanit" rows="7" maxlength="20000"
					>{form && 'metin' in form ? (form.metin ?? '') : ''}</textarea
				>
			</div>
			<div class="alan">
				<span class="etiket" id="ses-etiket">ya da sesli anlat</span>
				<SesKaydedici id="ses" ad="ses" />
			</div>
			<label class="onay">
				<input type="checkbox" name="onay" value="evet" required />
				<span
					>Yanıtımın (ve sesli kaydımın) {data.soran} tarafından kişisel aile arşivinde saklanmasına izin
					veriyorum. Sağlık, inanç gibi hassas bilgileri paylaşıp paylaşmamak bana kalmış.</span
				>
			</label>
			{#if form?.hata}<p class="hata-metni" role="alert">{form.hata}</p>{/if}
			<div class="satir">
				<button class="dugme dugme-birincil" disabled={gonderiliyor}>
					{gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}
				</button>
			</div>
		</form>
		<p class="kucuk soluk">
			Bu bağlantı yalnızca bir kez yanıtlanabilir. Yanıtın İz’de herkese açık gösterilmez.
		</p>
	{/if}
</div>

<style>
	h1 {
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2.1rem);
		line-height: 1.2;
	}
	header p,
	.tesekkur p {
		margin: 0;
	}
	.ust-etiket {
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	.etiket {
		font-weight: 600;
		font-size: var(--boyut-sm);
	}
	.onay {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
	}
	.onay input {
		margin-top: 0.2rem;
		accent-color: var(--vurgu);
	}
</style>
