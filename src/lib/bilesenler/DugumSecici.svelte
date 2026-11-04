<script lang="ts" module>
	import type { DugumTuru } from '#lib/sabitler.ts';

	export type SecenekDugum = {
		id: string;
		baslik: string;
		altBaslik?: string | null;
		tur: DugumTuru;
	};
</script>

<script lang="ts">
	// Aranabilir düğüm seçici (ARIA combobox). Sayfa JavaScript'siz açılırsa normal <select> gösterilir.
	import { onMount } from 'svelte';
	import { eslesir } from '#lib/metin.ts';
	import { DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import TurSekli from './TurSekli.svelte';

	type Props = {
		id: string;
		/** Gizli alanın adı; verilmezse yalnızca onsec ile çalışır */
		ad?: string;
		secenekler: SecenekDugum[];
		secili?: string | null;
		yerTutucu?: string;
		hata?: string | null;
		/** Seçimde çağrılır (ör. ağda düğüme odaklanmak için) */
		onsec?: (secenek: SecenekDugum) => void;
		/** Seçimden sonra kutuyu boşalt (arama kutusu gibi kullanım) */
		secinceTemizle?: boolean;
	};
	let {
		id,
		ad,
		secenekler,
		secili = null,
		yerTutucu = 'Düğüm adını yaz…',
		hata = null,
		onsec,
		secinceTemizle = false
	}: Props = $props();

	const EN_FAZLA = 60;

	let hazir = $state(false);
	onMount(() => {
		hazir = true;
	});

	// svelte-ignore state_referenced_locally
	let seciliId = $state(secili ?? '');
	// svelte-ignore state_referenced_locally
	let sorgu = $state(secenekler.find((s) => s.id === secili)?.baslik ?? '');
	let acik = $state(false);
	let etkin = $state(-1);

	const seciliBaslik = $derived(secenekler.find((s) => s.id === seciliId)?.baslik ?? null);
	// Seçili bir düğümün adı kutudaysa tüm seçenekleri göster; yazılmaya başlanınca süz
	const suzgec = $derived(seciliId && sorgu === seciliBaslik ? '' : sorgu.trim());
	const eslesenler = $derived(
		suzgec
			? secenekler.filter((s) => eslesir(`${s.baslik} ${s.altBaslik ?? ''}`, suzgec))
			: secenekler
	);
	const gosterilen = $derived(eslesenler.slice(0, EN_FAZLA));

	function sec(s: SecenekDugum) {
		onsec?.(s);
		if (secinceTemizle) {
			seciliId = '';
			sorgu = '';
		} else {
			seciliId = s.id;
			sorgu = s.baslik;
		}
		acik = false;
		etkin = -1;
	}

	function yazildi(e: Event) {
		sorgu = (e.currentTarget as HTMLInputElement).value;
		if (seciliId && sorgu !== seciliBaslik) seciliId = '';
		acik = true;
		etkin = sorgu.trim() ? 0 : -1;
	}

	function tusaBasildi(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			acik = true;
			etkin = Math.min(etkin + 1, gosterilen.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			etkin = Math.max(etkin - 1, 0);
		} else if (e.key === 'Enter') {
			if (acik && gosterilen[etkin]) {
				e.preventDefault();
				sec(gosterilen[etkin]);
			}
		} else if (e.key === 'Escape' && acik) {
			e.preventDefault();
			acik = false;
		}
	}

	$effect(() => {
		if (acik && etkin >= 0) {
			document.getElementById(`${id}-secenek-${etkin}`)?.scrollIntoView({ block: 'nearest' });
		}
	});
</script>

{#if hazir}
	<div class="secici" class:acik>
		<input
			{id}
			type="text"
			role="combobox"
			autocomplete="off"
			spellcheck="false"
			aria-autocomplete="list"
			aria-expanded={acik}
			aria-controls="{id}-liste"
			aria-activedescendant={acik && etkin >= 0 ? `${id}-secenek-${etkin}` : undefined}
			aria-invalid={!!hata}
			placeholder={yerTutucu}
			value={sorgu}
			oninput={yazildi}
			onkeydown={tusaBasildi}
			onfocus={() => (acik = true)}
			onblur={() => (acik = false)}
		/>
		{#if ad}<input type="hidden" name={ad} value={seciliId} />{/if}

		{#if acik}
			<ul id="{id}-liste" role="listbox" aria-label="Düğümler">
				{#each gosterilen as s, i (s.id)}
					<!-- Klavye kullanımı giriş kutusundan yönetilir (aria-activedescendant); seçeneklerin kendi tuş dinleyicisi gerekmez -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="{id}-secenek-{i}"
						role="option"
						tabindex="-1"
						aria-selected={i === etkin}
						class:secili={s.id === seciliId}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => sec(s)}
					>
						<TurSekli tur={s.tur} boyut={12} />
						<span class="ad">
							<span class="baslik">{s.baslik}</span>
							{#if s.altBaslik}<span class="alt">{s.altBaslik}</span>{/if}
						</span>
						<span class="tur">{DUGUM_TURU_ETIKETI[s.tur]}</span>
					</li>
				{:else}
					<li class="bos" role="presentation">“{sorgu}” ile eşleşen düğüm yok.</li>
				{/each}
				{#if eslesenler.length > EN_FAZLA}
					<li class="fazla" role="presentation">
						{eslesenler.length - EN_FAZLA} sonuç daha var; aramayı daralt.
					</li>
				{/if}
			</ul>
		{/if}
	</div>
{:else}
	<select {id} name={ad} aria-invalid={!!hata}>
		<option value="">Bir düğüm seç…</option>
		{#each secenekler as s (s.id)}
			<option value={s.id} selected={s.id === secili}>
				{s.baslik} ({DUGUM_TURU_ETIKETI[s.tur]})
			</option>
		{/each}
	</select>
{/if}

<style>
	.secici {
		position: relative;
	}
	ul {
		position: absolute;
		z-index: 30;
		inset: calc(100% + 4px) 0 auto;
		max-height: min(18rem, 50vh);
		overflow-y: auto;
		margin: 0;
		padding: var(--a-1);
		list-style: none;
		background: var(--yuzey);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap);
		box-shadow: var(--golge-2);
	}
	li[role='option'] {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-2) var(--a-3);
		border-radius: var(--yaricap-sm);
		cursor: pointer;
	}
	li[role='option']:hover,
	li[aria-selected='true'] {
		background: var(--yuzey-2);
	}
	li.secili .baslik {
		color: var(--vurgu);
	}
	.ad {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.baslik {
		font-weight: 550;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.alt {
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tur {
		flex: none;
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}
	.bos,
	.fazla {
		padding: var(--a-2) var(--a-3);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
</style>
