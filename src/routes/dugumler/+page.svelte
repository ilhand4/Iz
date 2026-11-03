<script lang="ts">
	import DugumKarti from '#lib/bilesenler/DugumKarti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
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
	<div class="satir baslik">
		<h1>Düğümler</h1>
		<a class="dugme dugme-birincil" href="/dugumler/yeni"><Simge ad="ekle" boyut={18} /> Ekle</a>
	</div>

	<form method="GET" class="arama" role="search">
		{#if data.tur}<input type="hidden" name="tur" value={data.tur} />{/if}
		<label class="gorunmez" for="q">Düğümlerde ara</label>
		<input id="q" name="q" type="search" value={data.q} placeholder="Başlık ya da kısa bilgide ara…" maxlength="100" />
		<button class="dugme">Ara</button>
	</form>

	<nav class="suzgecler" aria-label="Türe göre süz">
		<a href={turAdresi(null)} aria-current={!data.tur ? 'true' : undefined}>Tümü</a>
		{#each DUGUM_TURLERI as tur (tur)}
			<a href={turAdresi(tur)} data-tur={tur} aria-current={data.tur === tur ? 'true' : undefined}>
				{DUGUM_TURU_COGUL[tur]}
			</a>
		{/each}
	</nav>

	{#if data.dugumler.length}
		<div class="izgara">
			{#each data.dugumler as dugum (dugum.id)}
				<DugumKarti {dugum} />
			{/each}
		</div>
	{:else}
		<div class="kart bos">
			{#if data.q || data.tur}
				<p>Bu süzgece uyan düğüm yok.</p>
				<a href="/dugumler">Süzgeci temizle</a>
			{:else}
				<p>Henüz hiç düğümün yok.</p>
				<p class="soluk kucuk">
					<a href="/dugumler/yeni">Elle ekleyebilir</a> ya da <a href="/ara">bir eser arayabilirsin</a>.
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.baslik {
		justify-content: space-between;
	}
	h1 {
		margin: 0;
		font-size: var(--boyut-2xl);
	}
	.arama {
		display: flex;
		gap: var(--a-2);
	}
	.suzgecler {
		display: flex;
		gap: var(--a-2);
		overflow-x: auto;
		padding-bottom: var(--a-1);
		scrollbar-width: thin;
	}
	.suzgecler a {
		flex: none;
		padding: var(--a-1) var(--a-3);
		border-radius: var(--yaricap-tam);
		border: 1px solid var(--cizgi-guclu);
		color: var(--metin-soluk);
		text-decoration: none;
		font-size: var(--boyut-sm);
		font-weight: 550;
	}
	.suzgecler a[aria-current] {
		background: var(--metin);
		border-color: var(--metin);
		color: var(--zemin);
	}
	.bos p {
		margin: 0 0 var(--a-2);
	}
</style>
