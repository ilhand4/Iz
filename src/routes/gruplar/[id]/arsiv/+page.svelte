<script lang="ts">
	import ArsivKitabi from '#lib/bilesenler/ArsivKitabi.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.grup.ad} arşivi · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Aile arşivi"
		baslik={data.grup.ad}
		aciklama="Üyelerin yalnızca bu gruba açtığı (“Grup” gizlilikli) anıları, yerleri ve kişileri. Herkese açık içerik buraya girmez; arşiv yalnızca üyelere görünür. Yazdırınca ya da PDF olarak kaydedince kitap olur."
		geri={{ href: `/gruplar/${data.grup.id}`, etiket: data.grup.ad }}
	/>
	{#if data.ogeler.length}
		<ArsivKitabi
			baslik={data.grup.ad}
			altBaslik="{data.uyeSayisi} kişinin ortak hafızası"
			ogeler={data.ogeler}
			yillar={data.yillar}
			seciliYil={data.yil}
			yazarlar
		/>
	{:else}
		<BosDurum
			baslik="Arşiv henüz boş"
			aciklama="Bir anıyı, yeri ya da kişiyi aileyle paylaşmak için düğümün gizliliğini “Grup” yap. Herkese açık ya da özel düğümler arşive girmez."
		/>
	{/if}
</div>
