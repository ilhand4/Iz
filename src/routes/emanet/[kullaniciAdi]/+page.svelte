<script lang="ts">
	import ArsivKitabi from '#lib/bilesenler/ArsivKitabi.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.sahip.ad} · Emanet · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Sana emanet edildi"
		baslik={data.sahip.ad}
		aciklama="{data.sahip
			.ad}, arşivini senin için bıraktı. Burada salt okunur olarak görebilir, tüm verilerini indirebilirsin."
		geri={{ href: '/emanet', etiket: 'Emanetler' }}
	>
		{#snippet eylemler()}
			<a class="dugme" href="/emanet/{data.sahip.kullaniciAdi}/disa-aktar" download>
				<Simge ad="asagi" boyut={16} /> Verileri indir (JSON)
			</a>
		{/snippet}
	</SayfaBasligi>
	{#if data.ogeler.length}
		<ArsivKitabi
			baslik={data.sahip.ad}
			altBaslik="Hayatının izleri"
			ogeler={data.ogeler}
			yillar={data.yillar}
			seciliYil={data.yil}
		/>
	{:else}
		<BosDurum
			baslik="Arşivde anı, yer ya da kişi yok"
			aciklama="Diğer düğümler indirilebilen JSON dosyasında."
		/>
	{/if}
</div>
