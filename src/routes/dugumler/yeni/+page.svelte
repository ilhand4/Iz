<script lang="ts">
	import DugumFormu from '#lib/bilesenler/DugumFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const degerler: Record<string, string> = $derived(
		(form?.degerler as Record<string, string> | undefined) ?? data.baslangic
	);
</script>

<svelte:head><title>Yeni düğüm · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<SayfaBasligi
		ust="Haritana ekle"
		baslik="Yeni düğüm"
		aciklama="Bir eser, kişi, yer, karar ya da anı. Kitap, film ve diziler için eser aramasını da kullanabilirsin."
		geri={data.kaynak
			? { href: `/dugumler/${data.kaynak.id}`, etiket: data.kaynak.baslik }
			: { href: '/dugumler', etiket: 'Düğümler' }}
	/>

	<form method="GET" action="/hizli" class="hizli-ekle" role="search">
		<label for="hizliMetin">
			<Simge ad="ekle" boyut={16} /> Acelen mi var? Tek satırda yaz:
		</label>
		<div class="satir">
			<input
				id="hizliMetin"
				name="metin"
				maxlength="300"
				placeholder="ör. Tutunamayanlar, Selin Hoca önerdi"
			/>
			<button class="dugme">Devam</button>
		</div>
	</form>

	<div class="kart">
		<DugumFormu
			{degerler}
			hatalar={form?.hatalar as Record<string, string> | undefined}
			gonderMetni="Düğümü ekle"
			getirenSecenekleri={data.secenekler}
			bagSecenekleri={data.secenekler}
		/>
	</div>
</div>

<style>
	.hizli-ekle {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		padding: var(--a-3) var(--a-4);
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap);
	}
	.hizli-ekle label {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-size: var(--boyut-sm);
		font-weight: 550;
		color: var(--metin-soluk);
	}
	.hizli-ekle .satir {
		flex-wrap: nowrap;
	}
</style>
