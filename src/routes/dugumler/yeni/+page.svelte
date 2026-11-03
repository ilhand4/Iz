<script lang="ts">
	import Alan from '#lib/bilesenler/Alan.svelte';
	import DugumFormu from '#lib/bilesenler/DugumFormu.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const degerler: Record<string, string> = $derived(
		(form?.degerler as Record<string, string> | undefined) ?? data.baslangic
	);
</script>

<svelte:head><title>Yeni düğüm · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<div>
		<a href={data.kaynak ? `/dugumler/${data.kaynak.id}` : '/dugumler'} class="kucuk">← Geri</a>
		<h1>Yeni düğüm</h1>
		{#if data.kaynak}
			<p class="bildirim bildirim-uyari">
				Bu düğüm, <strong>{data.kaynak.baslik}</strong> düğümünden “beni şuna götürdü” bağıyla eklenecek.
			</p>
		{/if}
	</div>

	<div class="kart">
		<DugumFormu {degerler} hatalar={form?.hatalar as Record<string, string> | undefined} gonderMetni="Düğümü ekle">
			{#snippet ek()}
				{#if data.kaynak}
					<Alan id="bagNotu" etiket="Nasıl götürdü?" ipucu="İsteğe bağlı kısa not: “kitabın sonunda adı geçiyordu” gibi.">
						<input id="bagNotu" name="bagNotu" maxlength="1000" value={degerler.bagNotu ?? ''} />
					</Alan>
				{/if}
			{/snippet}
		</DugumFormu>
	</div>
</div>

<style>
	h1 {
		font-size: var(--boyut-2xl);
		margin-top: var(--a-2);
	}
</style>
