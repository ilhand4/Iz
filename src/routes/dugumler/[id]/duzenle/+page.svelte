<script lang="ts">
	import DugumFormu from '#lib/bilesenler/DugumFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Düzenle: {data.baslik} · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<SayfaBasligi
		ust="Düzenle"
		baslik={data.baslik}
		geri={{ href: `/dugumler/${data.id}`, etiket: 'Düğüme dön' }}
	/>

	<div class="kart">
		<DugumFormu
			degerler={(form?.degerler as Record<string, string> | undefined) ?? data.degerler}
			hatalar={form?.hatalar as Record<string, string> | undefined}
			gonderMetni="Değişiklikleri kaydet"
			eylem="?/kaydet"
			bagSecenekleri={data.secenekler}
		/>
	</div>

	<section class="kart tehlike">
		<h2>Düğümü sil</h2>
		<p class="soluk kucuk">
			Düğüm, bağları ve izlerdeki durakları çöp kutusuna gider; 30 gün içinde geri yükleyebilirsin.
			Sonra kalıcı olarak silinir.
		</p>
		<form method="POST" action="?/sil" class="satir">
			<input type="hidden" name="onay" value="evet" />
			<button class="dugme dugme-tehlike">
				<Simge ad="cop" boyut={16} /> Çöp kutusuna at
			</button>
		</form>
		{#if form?.hatalar?.genel}<p class="hata-metni kucuk" role="alert">{form.hatalar.genel}</p>{/if}
	</section>
</div>

<style>
	.tehlike {
		border-color: color-mix(in srgb, var(--hata) 35%, var(--cizgi));
	}
	.tehlike h2 {
		font-size: var(--boyut-lg);
	}
	.tehlike form {
		justify-content: space-between;
	}
</style>
