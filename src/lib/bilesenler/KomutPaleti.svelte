<script lang="ts">
	// Komut paleti (Ctrl+K / ⌘K): her sayfadan kendi düğüm ve izlerinde arama ve hızlı eylemler.
	// ARIA combobox + listbox; klavyeyle tam kullanılır.
	import { goto } from '$app/navigation';
	import type { DugumTuru } from '#lib/sabitler.ts';
	import Simge, { type SimgeAdi } from './Simge.svelte';
	import TurSekli from './TurSekli.svelte';

	type Oge =
		| { tur: 'eylem'; id: string; etiket: string; simge: SimgeAdi; href: string }
		| {
				tur: 'dugum';
				id: string;
				etiket: string;
				alt: string | null;
				dugumTuru: DugumTuru;
				href: string;
		  }
		| { tur: 'iz'; id: string; etiket: string; alt: string; href: string };

	const EYLEMLER: Extract<Oge, { tur: 'eylem' }>[] = [
		{ tur: 'eylem', id: 'e-yeni', etiket: 'Düğüm ekle', simge: 'ekle', href: '/dugumler/yeni' },
		{ tur: 'eylem', id: 'e-iz', etiket: 'Yeni iz başlat', simge: 'iz', href: '/izler/yeni' },
		{ tur: 'eylem', id: 'e-ara', etiket: 'Eser ara', simge: 'ara', href: '/ara' },
		{ tur: 'eylem', id: 'e-ag', etiket: 'Ağ görünümü', simge: 'dugumler', href: '/dugumler/ag' },
		{
			tur: 'eylem',
			id: 'e-zaman',
			etiket: 'Zaman çizgisi',
			simge: 'zaman',
			href: '/dugumler/zaman'
		},
		{
			tur: 'eylem',
			id: 'e-merak',
			etiket: 'Merak listesi',
			simge: 'yildiz',
			href: '/dugumler?durum=merak'
		},
		{ tur: 'eylem', id: 'e-hat', etiket: 'Hat haritası', simge: 'iz', href: '/izler/hat' },
		{ tur: 'eylem', id: 'e-donemler', etiket: 'Dönemler', simge: 'takvim', href: '/donemler' },
		{ tur: 'eylem', id: 'e-gruplar', etiket: 'Gruplar', simge: 'grup', href: '/gruplar' },
		{ tur: 'eylem', id: 'e-ayarlar', etiket: 'Ayarlar', simge: 'ayar', href: '/ayarlar' }
	];

	let acik = $state(false);
	let sorgu = $state('');
	let sonuclar = $state<Oge[]>([]);
	let etkin = $state(0);
	let girdi: HTMLInputElement | undefined = $state();
	let iletisim: HTMLDialogElement | undefined = $state();
	let istekNo = 0;

	const eylemler = $derived(
		EYLEMLER.filter((e) =>
			e.etiket.toLocaleLowerCase('tr').includes(sorgu.trim().toLocaleLowerCase('tr'))
		)
	);
	const hizliEkle = $derived<Oge[]>(
		sorgu.trim().length > 2
			? [
					{
						tur: 'eylem',
						id: 'e-hizli',
						etiket: `Hızlı ekle: “${sorgu.trim()}”`,
						simge: 'simsek',
						href: `/hizli?metin=${encodeURIComponent(sorgu.trim())}`
					}
				]
			: []
	);
	const ogeler = $derived<Oge[]>([...sonuclar, ...eylemler, ...hizliEkle]);

	export function ac() {
		acik = true;
		sorgu = '';
		sonuclar = [];
		etkin = 0;
		iletisim?.showModal();
		queueMicrotask(() => girdi?.focus());
	}

	function kapat() {
		acik = false;
		iletisim?.close();
	}

	let zamanlayici: ReturnType<typeof setTimeout> | undefined;
	function aramaYap() {
		clearTimeout(zamanlayici);
		etkin = 0;
		const q = sorgu.trim();
		if (!q) {
			sonuclar = [];
			return;
		}
		zamanlayici = setTimeout(async () => {
			const no = ++istekNo;
			try {
				const yanit = await fetch(`/api/ara?q=${encodeURIComponent(q)}`);
				if (!yanit.ok || no !== istekNo) return;
				const veri = (await yanit.json()) as {
					dugumler: { id: string; baslik: string; altBaslik: string | null; tur: DugumTuru }[];
					izler: { id: string; baslik: string; durakSayisi: number }[];
				};
				sonuclar = [
					...veri.dugumler.map((d): Oge => ({
						tur: 'dugum',
						id: `d-${d.id}`,
						etiket: d.baslik,
						alt: d.altBaslik,
						dugumTuru: d.tur,
						href: `/dugumler/${d.id}`
					})),
					...veri.izler.map((i): Oge => ({
						tur: 'iz',
						id: `i-${i.id}`,
						etiket: i.baslik,
						alt: `${i.durakSayisi} durak`,
						href: `/izler/${i.id}`
					}))
				];
			} catch {
				// Ağ hatası: yalnızca eylemler kalır
			}
		}, 180);
	}

	function sec(oge: Oge | undefined) {
		if (!oge) return;
		kapat();
		goto(oge.href);
	}

	function tus(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			etkin = Math.min(etkin + 1, ogeler.length - 1);
		} else if (e.key === 'ArrowUp') {
			etkin = Math.max(etkin - 1, 0);
		} else if (e.key === 'Enter') {
			sec(ogeler[etkin]);
		} else return;
		e.preventDefault();
	}

	function genelTus(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (acik) kapat();
			else ac();
		}
	}
</script>

<svelte:window onkeydown={genelTus} />

<dialog
	bind:this={iletisim}
	class="palet"
	aria-label="Komut paleti"
	onclose={() => (acik = false)}
	onclick={(e) => {
		if (e.target === iletisim) kapat();
	}}
>
	<div class="kutu">
		<div class="giris">
			<Simge ad="ara" boyut={18} />
			<input
				bind:this={girdi}
				bind:value={sorgu}
				oninput={aramaYap}
				onkeydown={tus}
				role="combobox"
				aria-expanded="true"
				aria-controls="palet-liste"
				aria-activedescendant={ogeler[etkin] ? `palet-${ogeler[etkin].id}` : undefined}
				aria-autocomplete="list"
				placeholder="Düğüm, iz ya da eylem ara…"
				autocomplete="off"
			/>
			<kbd>Esc</kbd>
		</div>
		<ul id="palet-liste" role="listbox" aria-label="Sonuçlar">
			{#each ogeler as oge, i (oge.id)}
				<li
					id="palet-{oge.id}"
					role="option"
					aria-selected={i === etkin}
					class:etkin={i === etkin}
					onmousemove={() => (etkin = i)}
					onclick={() => sec(oge)}
					onkeydown={() => {}}
				>
					{#if oge.tur === 'dugum'}
						<TurSekli tur={oge.dugumTuru} boyut={12} />
					{:else if oge.tur === 'iz'}
						<Simge ad="iz" boyut={16} />
					{:else}
						<Simge ad={oge.simge} boyut={16} />
					{/if}
					<span class="etiket">{oge.etiket}</span>
					{#if oge.tur !== 'eylem' && oge.alt}<span class="alt">{oge.alt}</span>{/if}
					{#if oge.tur === 'eylem'}<span class="alt">Eylem</span>{/if}
				</li>
			{:else}
				<li class="bos" role="presentation">Sonuç yok</li>
			{/each}
		</ul>
		<p class="ipucu">↑ ↓ gezin · Enter aç · Ctrl+K kapat</p>
	</div>
</dialog>

<style>
	.palet {
		padding: 0;
		border: 0;
		background: transparent;
		width: min(36rem, calc(100vw - 2rem));
		margin: 12vh auto auto;
	}
	.palet::backdrop {
		background: color-mix(in srgb, var(--metin) 35%, transparent);
	}
	.kutu {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		color: var(--metin);
		box-shadow: var(--golge-2);
		overflow: hidden;
	}
	.giris {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-3) var(--a-4);
		border-bottom: 1px solid var(--cizgi);
		color: var(--metin-soluk);
	}
	.giris input {
		flex: 1;
		border: 0;
		background: transparent;
		font-size: var(--boyut-md);
		color: var(--metin);
		outline: none;
		box-shadow: none;
		padding: var(--a-1) 0;
	}
	kbd {
		font-family: var(--yazi-kod);
		font-size: var(--boyut-xs);
		padding: 0 var(--a-1);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-sm);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: var(--a-1);
		max-height: 50vh;
		overflow-y: auto;
	}
	li {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-2) var(--a-3);
		border-radius: var(--yaricap);
		cursor: pointer;
	}
	li.etkin {
		background: var(--vurgu-zemin);
	}
	.etiket {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 550;
	}
	.alt {
		flex: none;
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
	.bos {
		color: var(--metin-soluk);
		cursor: default;
	}
	.ipucu {
		margin: 0;
		padding: var(--a-2) var(--a-4);
		border-top: 1px solid var(--cizgi);
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
</style>
