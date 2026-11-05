<script lang="ts">
	// Başka sitelere <iframe> ile gömülen sade iz görünümü. Bağlantılar yeni sekmede açılır.
	import { page } from '$app/state';
	import Logo from '#lib/bilesenler/Logo.svelte';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const koken = $derived(page.url.origin);
</script>

<svelte:head><title>{data.iz.baslik} · İz</title></svelte:head>

<article class="gomme">
	<header>
		<h1>
			<a href="{koken}/izler/{data.iz.id}" target="_blank" rel="noopener">{data.iz.baslik}</a>
		</h1>
		<p class="kucuk soluk">
			<a href="{koken}/@{data.sahip.kullaniciAdi}" target="_blank" rel="noopener">{data.sahip.ad}</a
			>
			· {ceviri.t('iz.durak', { sayi: data.duraklar.length })}
		</p>
	</header>
	<ol class="duraklar">
		{#each data.duraklar as durak, i (durak.adimId)}
			<li>
				<span class="no" aria-hidden="true">{i + 1}</span>
				{#if 'gizli' in durak}
					<span class="gizli">{ceviri.t('iz.gizliDurak')}</span>
				{:else}
					<span class="govde">
						<a
							class="baslik"
							href="{koken}/dugumler/{durak.dugum.id}"
							target="_blank"
							rel="noopener"
						>
							<TurSekli tur={durak.dugum.tur} boyut={12} />
							{durak.dugum.baslik}
						</a>
						{#if durak.not}<span class="not">{durak.not}</span>{/if}
						{#if durak.sonrakineBag?.not}
							<span class="bag">→ {durak.sonrakineBag.not}</span>
						{/if}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
	<footer>
		<a href="{koken}/izler/{data.iz.id}" target="_blank" rel="noopener" class="imza">
			<Logo boyut={16} />
			{ceviri.t('iz.izdeAc')}
		</a>
	</footer>
</article>

<style>
	:global(body) {
		background: var(--yuzey);
	}
	.gomme {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		padding: var(--a-4);
		max-width: 40rem;
		margin: 0 auto;
	}
	h1 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	h1 a {
		color: var(--metin);
		text-decoration: none;
	}
	header p {
		margin: var(--a-1) 0 0;
	}
	.duraklar {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.duraklar li {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
	}
	.no {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
		font-size: var(--boyut-xs);
		font-weight: 700;
	}
	.govde {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.baslik {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-weight: 600;
		color: var(--metin);
		text-decoration: none;
	}
	.baslik:hover {
		color: var(--vurgu);
	}
	.not {
		font-size: var(--boyut-sm);
	}
	.bag {
		font-size: var(--boyut-sm);
		font-style: italic;
		color: var(--metin-soluk);
	}
	.gizli {
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
		padding-top: 0.2rem;
	}
	footer {
		border-top: 1px solid var(--cizgi);
		padding-top: var(--a-2);
	}
	.imza {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-size: var(--boyut-sm);
		font-weight: 600;
		color: var(--metin-soluk);
		text-decoration: none;
	}
</style>
