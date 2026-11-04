<script lang="ts">
	import AgGorunumu from '#lib/bilesenler/AgGorunumu.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import GorunumSecici from '#lib/bilesenler/GorunumSecici.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const basliklar = $derived(new Map(data.dugumler.map((d) => [d.id, d.baslik])));
</script>

<svelte:head><title>Ağ · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Ağ"
		aciklama="Neyin seni neye götürdüğü, tek bakışta. Düğümler türlerine göre renk ve şekil alır; büyüklükleri bağ sayılarını gösterir."
	>
		{#snippet eylemler()}
			<a class="dugme dugme-birincil" href="/dugumler/yeni"
				><Simge ad="ekle" boyut={18} /> Düğüm ekle</a
			>
		{/snippet}
	</SayfaBasligi>

	<GorunumSecici etkin="ag" />

	{#if data.dugumler.length === 0}
		<BosDurum
			baslik="Ağın henüz boş"
			aciklama="Birkaç düğüm ekleyip aralarında “bu beni şuna götürdü” bağları kurdukça ağın burada büyüyecek."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni">İlk düğümü ekle</a>
				<a class="dugme" href="/ara">Eser ara</a>
			{/snippet}
		</BosDurum>
	{:else}
		{#if data.baglar.length === 0}
			<p class="bildirim bildirim-uyari">
				Düğümlerin henüz birbirine bağlı değil. Bir düğümün sayfasında “Bu beni şuna götürdü”
				diyerek ilk bağı kurabilirsin.
			</p>
		{/if}
		<noscript>
			<p class="bildirim bildirim-uyari">
				Ağ görünümü JavaScript gerektirir. Bağlarını aşağıdaki listeden görebilirsin.
			</p>
		</noscript>

		{#if data.kismi}
			<p class="bildirim bildirim-bilgi">
				Haritan büyük ({data.kismi.toplam} düğüm): yalnızca seçili düğümün iki adım çevresi gösteriliyor.
				Başka bir yere bakmak için aramadan bir düğüm seç ya da bir düğümün sayfasındaki “Ağda göster”i
				kullan.
			</p>
		{/if}
		<AgGorunumu
			dugumler={data.dugumler}
			baglar={data.baglar}
			odakId={data.odakId}
			baslangic={data.baslangic}
			adreseYaz
			bagKurabilir
			zamanSurgusu
		/>

		{#if data.baglar.length}
			<details class="metin-listesi">
				<summary>Bağları metin olarak göster ({data.baglar.length})</summary>
				<ul>
					{#each data.baglar as b (b.id)}
						<li>
							<a href="/dugumler/{b.kaynakId}">{basliklar.get(b.kaynakId)}</a>
							<span aria-label="şuna götürdü">→</span>
							<a href="/dugumler/{b.hedefId}">{basliklar.get(b.hedefId)}</a>
							{#if b.not}<span class="soluk">— {b.not}</span>{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	{/if}
</div>

<style>
	.metin-listesi {
		font-size: var(--boyut-sm);
	}
	.metin-listesi summary {
		cursor: pointer;
		font-weight: 550;
		color: var(--metin-soluk);
	}
	.metin-listesi ul {
		margin: var(--a-3) 0 0;
		padding-left: var(--a-5);
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
	}
	.metin-listesi a {
		color: var(--metin);
		font-weight: 550;
	}
</style>
