<script lang="ts">
	import ArsivKitabi from '#lib/bilesenler/ArsivKitabi.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Kitabım · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Aile hafızası"
		baslik="Kitabım"
		aciklama="Anıların, yerlerin ve kişilerin; fotoğrafları ve anlattıklarınla, tarih sırasıyla. Yazdırınca ya da PDF olarak kaydedince A5 bir kitap olur. Yalnızca sen görürsün."
	/>
	{#if data.ogeler.length}
		<ArsivKitabi
			baslik={data.ad}
			altBaslik="Hayatımın izleri"
			ogeler={data.ogeler}
			yillar={data.yillar}
			seciliYil={data.yil}
		/>
	{:else}
		<BosDurum
			baslik="Kitabın henüz boş"
			aciklama="Anı, yer ve kişi düğümleri ekledikçe; fotoğraf ve sesli anlatılarla birlikte burada bir kitaba dönüşür."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni?tur=ani">Bir anı ekle</a>
			{/snippet}
		</BosDurum>
	{/if}
</div>
