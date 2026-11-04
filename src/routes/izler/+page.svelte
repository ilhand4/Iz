<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import DahaFazla from '#lib/bilesenler/DahaFazla.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import SilindiBildirimi from '#lib/bilesenler/SilindiBildirimi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let birikim = $state<PageProps['data']['izler']>([]);
	$effect.pre(() => {
		if (!data.devam) birikim = [];
	});
	const goruntulenen = $derived([...birikim, ...data.izler]);
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

	<SilindiBildirimi silinen={data.silinen} />

	{#if goruntulenen.length || data.q}
		<form method="GET" class="arama" role="search">
			<label class="gorunmez" for="q">İzlerde ara</label>
			<input
				id="q"
				name="q"
				type="search"
				value={data.q}
				placeholder="İz adında ya da açıklamasında ara…"
				maxlength="100"
			/>
			<button class="dugme" aria-label="Ara"><Simge ad="ara" boyut={18} /></button>
		</form>
	{/if}

	{#if goruntulenen.length}
		<div class="izgara">
			{#each goruntulenen as iz (iz.id)}
				<IzKarti {iz} />
			{/each}
		</div>
		<DahaFazla
			sonraki={data.sonraki}
			devam={data.devam}
			birikti={birikim.length > 0}
			ononcesi={() => (birikim = goruntulenen)}
		/>
	{:else if data.q}
		<BosDurum baslik="Bu aramaya uyan iz yok" aciklama="Farklı bir sözcük dene.">
			{#snippet eylemler()}
				<a class="dugme" href="/izler">Aramayı temizle</a>
			{/snippet}
		</BosDurum>
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

<style>
	.arama {
		display: flex;
		gap: var(--a-2);
		max-width: 32rem;
	}
</style>
