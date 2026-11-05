<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Emanetler · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="Dijital vasiyet"
		baslik="Sana emanet edilenler"
		aciklama="Seni varisi olarak seçen kişiler. Arşivleri, belirledikleri süre boyunca İz’e hiç gelmezlerse sana salt okunur olarak açılır; o güne kadar hiçbir içeriği göremezsin."
	/>
	{#if data.emanetler.length}
		<ul class="liste">
			{#each data.emanetler as e (e.kullaniciAdi)}
				<li class="kart">
					<span class="metin">
						<strong>{e.ad}</strong>
						<small class="soluk">@{e.kullaniciAdi}</small>
					</span>
					{#if e.acik}
						<a class="dugme dugme-birincil dugme-kucuk" href="/emanet/{e.kullaniciAdi}">Arşivi aç</a
						>
					{:else}
						<span class="rozet"
							><Simge ad="kilit" boyut={14} /> {e.beklemeAy} ay gelmezse açılır</span
						>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<BosDurum
			baslik="Sana emanet edilen bir arşiv yok"
			aciklama="Biri seni Ayarlar → Dijital vasiyet bölümünden varisi olarak seçerse burada görünür."
		/>
	{/if}
</div>

<style>
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.liste li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-3);
		flex-wrap: wrap;
	}
	.metin {
		display: flex;
		flex-direction: column;
	}
</style>
