<script lang="ts">
	import IzFormu from '#lib/bilesenler/IzFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Yeni iz · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<SayfaBasligi
		ust="İzler"
		baslik="Yeni iz"
		aciklama="Önce izine bir ad ver; durakları bir sonraki adımda ekleyip sıralayacaksın."
		geri={data.ilkDugum
			? { href: `/dugumler/${data.ilkDugum.id}`, etiket: data.ilkDugum.baslik }
			: { href: '/izler', etiket: 'İzler' }}
	/>

	{#if data.ilkDugum}
		<p class="bildirim bildirim-uyari ilk">
			İlk durak: <TurSekli tur={data.ilkDugum.tur} boyut={12} /> <strong>{data.ilkDugum.baslik}</strong>
		</p>
	{/if}

	<div class="kart">
		<IzFormu
			degerler={form?.degerler as Record<string, string> | undefined}
			hatalar={form?.hatalar as Record<string, string> | undefined}
			gonderMetni="İzi oluştur"
		/>
	</div>
</div>

<style>
	.ilk {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		margin: 0;
	}
</style>
