<script lang="ts">
	// Bildirim baloncukları. Form eylemlerinin döndürdüğü `bildirim` burada gösterilir.
	// JavaScript yokken sayfa sunucudan yeniden geldiği için eylem sonucu doğrudan çizilir.
	import { onMount, untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { bildirimler, type BildirimGirdisi } from '#lib/bildirim.svelte.ts';
	import Simge from './Simge.svelte';

	/** Mobil alt menü varsa baloncuklar onun üstünde durur */
	let { altMenu = false }: { altMenu?: boolean } = $props();

	let hazir = $state(false);
	let azHareket = $state(false);
	onMount(() => {
		hazir = true;
		azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	// Her yeni eylem sonucu bir kez gösterilir
	$effect(() => {
		const b = page.form?.bildirim as BildirimGirdisi | undefined;
		if (b) untrack(() => bildirimler.goster(b));
	});

	const sunucuBildirimi = $derived(
		!hazir ? (page.form?.bildirim as BildirimGirdisi | undefined) : undefined
	);
</script>

<div class="bildirim-alani" class:alt-menulu={altMenu} aria-live="polite">
	{#if sunucuBildirimi}
		<div class="baloncuk" data-tur={sunucuBildirimi.tur ?? 'basari'} role="status">
			<span class="mesaj">{sunucuBildirimi.mesaj}</span>
		</div>
	{/if}
	{#each bildirimler.liste as b (b.id)}
		<div
			class="baloncuk"
			data-tur={b.tur}
			role={b.tur === 'hata' ? 'alert' : 'status'}
			transition:fly={{ y: 16, duration: azHareket ? 0 : 180 }}
			onmouseenter={() => bildirimler.duraklat(b.id)}
			onmouseleave={() => bildirimler.devamEt(b.id)}
			onfocusin={() => bildirimler.duraklat(b.id)}
			onfocusout={() => bildirimler.devamEt(b.id)}
		>
			<span class="simge" aria-hidden="true">
				<Simge ad={b.tur === 'hata' ? 'kapat' : 'onay'} boyut={16} />
			</span>
			<span class="mesaj">{b.mesaj}</span>
			{#if b.baglanti}
				<a class="eylem" href={b.baglanti.href} onclick={() => bildirimler.kapat(b.id)}>
					{b.baglanti.metin}
				</a>
			{/if}
			{#if b.geriAl}
				<button type="button" class="eylem" onclick={() => bildirimler.geriAl(b)}>Geri al</button>
			{/if}
			<button
				type="button"
				class="kapat"
				aria-label="Bildirimi kapat"
				onclick={() => bildirimler.kapat(b.id)}
			>
				<Simge ad="kapat" boyut={14} />
			</button>
		</div>
	{/each}
</div>

<style>
	.bildirim-alani {
		position: fixed;
		z-index: 40;
		left: var(--a-3);
		right: var(--a-3);
		bottom: calc(env(safe-area-inset-bottom) + var(--a-3));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--a-2);
		pointer-events: none;
	}
	.bildirim-alani.alt-menulu {
		bottom: calc(var(--alt-menu-yukseklik) + env(safe-area-inset-bottom) + var(--a-3));
	}
	.baloncuk {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: var(--a-2);
		width: min(100%, 26rem);
		padding: var(--a-2) var(--a-2) var(--a-2) var(--a-3);
		border-radius: var(--yaricap-lg);
		background: var(--metin);
		color: var(--zemin);
		box-shadow: var(--golge-2);
		font-size: var(--boyut-sm);
	}
	.simge {
		display: grid;
		place-items: center;
		flex: none;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--basari) 85%, var(--zemin));
		color: var(--zemin);
	}
	.baloncuk[data-tur='hata'] .simge {
		background: color-mix(in srgb, var(--hata) 85%, var(--zemin));
	}
	.baloncuk[data-tur='bilgi'] .simge {
		background: color-mix(in srgb, var(--vurgu) 85%, var(--zemin));
	}
	.mesaj {
		flex: 1;
		min-width: 0;
		line-height: 1.4;
	}
	.eylem {
		flex: none;
		padding: var(--a-1) var(--a-2);
		border: 0;
		border-radius: var(--yaricap-sm);
		background: transparent;
		color: color-mix(in srgb, var(--vurgu) 60%, var(--zemin));
		font: inherit;
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}
	.eylem:hover {
		background: color-mix(in srgb, var(--zemin) 14%, transparent);
		color: var(--zemin);
	}
	.kapat {
		display: grid;
		place-items: center;
		flex: none;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: color-mix(in srgb, var(--zemin) 70%, transparent);
		cursor: pointer;
	}
	.kapat:hover {
		background: color-mix(in srgb, var(--zemin) 14%, transparent);
		color: var(--zemin);
	}
	@media (min-width: 48rem) {
		.bildirim-alani,
		.bildirim-alani.alt-menulu {
			left: auto;
			right: var(--a-5);
			bottom: var(--a-5);
			align-items: flex-end;
		}
	}
</style>
