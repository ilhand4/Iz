<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>İzler · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Anlatılabilir yollar"
		baslik="İzler"
		aciklama="Düğümlerinden seçip sıraya dizdiğin yollar. Her durağa bir not yaz; izi bir hikâye gibi oku ya da paylaş."
	>
		{#snippet eylemler()}
			<a class="dugme dugme-birincil" href="/izler/yeni"><Simge ad="ekle" boyut={18} /> Yeni iz</a>
		{/snippet}
	</SayfaBasligi>

	{#if data.silindi}
		<p class="bildirim bildirim-basari" role="status">İz silindi. Düğümlerin yerinde duruyor.</p>
	{/if}

	{#if data.izler.length}
		<div class="izgara">
			{#each data.izler as iz (iz.id)}
				<IzKarti {iz} />
			{/each}
		</div>
	{:else}
		<BosDurum
			baslik="Henüz bir izin yok"
			aciklama="Bir kitaptan bir şehre, bir şehirden bir karara… Düğümlerini sıraya dizerek ilk izini oluştur."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/izler/yeni">İlk izini oluştur</a>
			{/snippet}
		</BosDurum>
	{/if}
</div>
