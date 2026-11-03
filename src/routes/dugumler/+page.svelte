<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import DugumKarti from '#lib/bilesenler/DugumKarti.svelte';
	import GorunumSecici from '#lib/bilesenler/GorunumSecici.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { DUGUM_TURLERI, DUGUM_TURU_COGUL } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function turAdresi(tur: string | null) {
		const p = new URLSearchParams();
		if (tur) p.set('tur', tur);
		if (data.q) p.set('q', data.q);
		const s = p.toString();
		return s ? `/dugumler?${s}` : '/dugumler';
	}
</script>

<svelte:head><title>Düğümler · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Düğümler"
		aciklama="Hayatındaki eserler, kişiler, yerler, kararlar ve anılar."
	>
		{#snippet eylemler()}
			<a class="dugme" href="/ara"><Simge ad="ara" boyut={18} /> Eser ara</a>
			<a class="dugme dugme-birincil" href="/dugumler/yeni"><Simge ad="ekle" boyut={18} /> Düğüm ekle</a>
		{/snippet}
	</SayfaBasligi>

	<GorunumSecici etkin="liste" />

	<div class="suzme">
		<form method="GET" class="arama" role="search">
			{#if data.tur}<input type="hidden" name="tur" value={data.tur} />{/if}
			<label class="gorunmez" for="q">Düğümlerde ara</label>
			<input
				id="q"
				name="q"
				type="search"
				value={data.q}
				placeholder="Başlık ya da kısa bilgide ara…"
				maxlength="100"
			/>
			<button class="dugme" aria-label="Ara"><Simge ad="ara" boyut={18} /></button>
		</form>

		<nav class="suzgecler" aria-label="Türe göre süz">
			<a href={turAdresi(null)} aria-current={!data.tur ? 'true' : undefined}>Tümü</a>
			{#each DUGUM_TURLERI as tur (tur)}
				<a href={turAdresi(tur)} aria-current={data.tur === tur ? 'true' : undefined}>
					<TurSekli {tur} boyut={11} />
					{DUGUM_TURU_COGUL[tur]}
				</a>
			{/each}
		</nav>
	</div>

	{#if data.dugumler.length}
		<div class="izgara">
			{#each data.dugumler as dugum (dugum.id)}
				<DugumKarti {dugum} />
			{/each}
		</div>
	{:else if data.q || data.tur}
		<BosDurum baslik="Bu süzgece uyan düğüm yok" aciklama="Farklı bir arama dene ya da süzgeci temizle.">
			{#snippet eylemler()}
				<a class="dugme" href="/dugumler">Süzgeci temizle</a>
			{/snippet}
		</BosDurum>
	{:else}
		<BosDurum
			baslik="Henüz hiç düğümün yok"
			aciklama="Okuduğun bir kitap, tanıştığın biri, yaşadığın bir yer… Her şey bir düğüm olabilir."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/yeni">Elle ekle</a>
				<a class="dugme" href="/ara">Eser ara</a>
			{/snippet}
		</BosDurum>
	{/if}
</div>

<style>
	.suzme {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.arama {
		display: flex;
		gap: var(--a-2);
		max-width: 32rem;
	}
	.suzgecler {
		display: flex;
		gap: var(--a-2);
		overflow-x: auto;
		padding-bottom: var(--a-1);
		scrollbar-width: none;
	}
	.suzgecler a {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: var(--a-1) var(--a-3);
		border-radius: var(--yaricap-tam);
		border: 1px solid var(--cizgi-guclu);
		color: var(--metin-soluk);
		text-decoration: none;
		font-size: var(--boyut-sm);
		font-weight: 550;
	}
	.suzgecler a:hover {
		color: var(--metin);
		background: var(--yuzey-2);
	}
	.suzgecler a[aria-current] {
		background: var(--metin);
		border-color: var(--metin);
		color: var(--zemin);
	}
	@media (min-width: 48rem) {
		.suzme {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
		.arama {
			flex: 1;
		}
	}
</style>
