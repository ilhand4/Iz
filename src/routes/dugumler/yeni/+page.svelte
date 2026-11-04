<script lang="ts">
	import Alan from '#lib/bilesenler/Alan.svelte';
	import DugumFormu from '#lib/bilesenler/DugumFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
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

	{#if data.kaynak}
		<p class="bildirim bildirim-uyari kaynak">
			Bu düğüm, <strong>{data.kaynak.baslik}</strong> düğümünden “beni şuna götürdü” bağıyla eklenecek.
		</p>
	{/if}

	<div class="kart">
		<DugumFormu
			{degerler}
			hatalar={form?.hatalar as Record<string, string> | undefined}
			gonderMetni="Düğümü ekle"
		>
			{#snippet ek()}
				{#if data.kaynak}
					<Alan
						id="bagNotu"
						etiket="Nasıl götürdü?"
						ipucu="İsteğe bağlı kısa not: “kitabın sonunda adı geçiyordu” gibi."
					>
						<input id="bagNotu" name="bagNotu" maxlength="1000" value={degerler.bagNotu ?? ''} />
					</Alan>
				{/if}
			{/snippet}
		</DugumFormu>
	</div>
</div>

<style>
	.kaynak {
		margin: 0;
	}
</style>
