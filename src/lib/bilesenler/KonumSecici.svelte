<script lang="ts">
	// Düğüm formunda konumu haritadan seçme. Harita yalnızca istenince yüklenir; JavaScript yoksa
	// (ya da harita açılamazsa) enlem/boylam alanları elle doldurulmaya devam eder.
	import { onMount } from 'svelte';
	import type { Map as HaritaNesnesi, Marker } from 'maplibre-gl';
	import { koordinatYaz } from '#lib/konumlar.ts';
	import { koyuMu, maplibreYukle, stilAdresi, temaDegisinceCagir } from '#lib/haritaYukle.ts';
	import Simge from './Simge.svelte';

	type Props = { enlem: string; boylam: string };
	let { enlem = $bindable(), boylam = $bindable() }: Props = $props();

	let hazir = $state(false);
	let acik = $state(false);
	let hata = $state<string | null>(null);
	let kap: HTMLDivElement | undefined = $state();
	let harita: HaritaNesnesi | null = null;
	let isaretci: Marker | null = null;
	let temaTemizle = () => {};

	onMount(() => {
		hazir = true;
		return () => {
			temaTemizle();
			harita?.remove();
		};
	});

	function sayilar(): [number, number] | null {
		const e = Number(enlem.replace(',', '.'));
		const b = Number(boylam.replace(',', '.'));
		if (!enlem || !boylam || !Number.isFinite(e) || !Number.isFinite(b)) return null;
		if (Math.abs(e) > 90 || Math.abs(b) > 180) return null;
		return [b, e];
	}

	function yaz(boylamSayi: number, enlemSayi: number) {
		enlem = koordinatYaz(enlemSayi);
		boylam = koordinatYaz(boylamSayi);
	}

	async function ac() {
		acik = true;
		hata = null;
		if (harita) return;
		try {
			const ml = await maplibreYukle();
			if (!kap) return;
			const nokta = sayilar();
			harita = new ml.Map({
				container: kap,
				style: stilAdresi(koyuMu()),
				center: nokta ?? [28.98, 41.04],
				zoom: nokta ? 14 : 9,
				attributionControl: { compact: true }
			});
			harita.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
			isaretci = new ml.Marker({ draggable: true, color: '#b0432a' });
			if (nokta) isaretci.setLngLat(nokta).addTo(harita);
			isaretci.on('dragend', () => {
				const p = isaretci!.getLngLat();
				yaz(p.lng, p.lat);
			});
			harita.on('click', (e) => {
				isaretci!.setLngLat(e.lngLat).addTo(harita!);
				yaz(e.lngLat.lng, e.lngLat.lat);
			});
			temaTemizle = temaDegisinceCagir((koyu) => harita?.setStyle(stilAdresi(koyu)));
		} catch {
			hata = 'Harita açılamadı; koordinatları elle yazabilirsin.';
		}
	}

	// Alanlar elle değişince işaretçi de oraya gider
	$effect(() => {
		const nokta = sayilar();
		if (!harita || !isaretci) return;
		if (nokta) {
			const p = isaretci.getLngLat?.();
			if (!p || koordinatYaz(p.lng) !== boylam || koordinatYaz(p.lat) !== enlem) {
				isaretci.setLngLat(nokta).addTo(harita);
				harita.easeTo({ center: nokta, duration: 0 });
			}
		} else isaretci.remove();
	});

	function konumum() {
		hata = null;
		if (!('geolocation' in navigator)) {
			hata = 'Tarayıcın konum paylaşmayı desteklemiyor.';
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(p) => {
				yaz(p.coords.longitude, p.coords.latitude);
				harita?.jumpTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 15 });
			},
			() => (hata = 'Konumun alınamadı (izin verilmedi ya da bulunamadı).'),
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}
</script>

{#if hazir}
	<div class="konum-secici yigin">
		<div class="satir">
			{#if !acik}
				<button type="button" class="dugme dugme-kucuk" onclick={ac}>
					<Simge ad="harita" boyut={16} /> Haritadan seç
				</button>
			{:else}
				<button
					type="button"
					class="dugme dugme-kucuk dugme-hayalet"
					onclick={() => (acik = false)}
				>
					Haritayı kapat
				</button>
			{/if}
			<button type="button" class="dugme dugme-kucuk dugme-hayalet" onclick={konumum}>
				Şu anki konumum
			</button>
			{#if enlem || boylam}
				<button
					type="button"
					class="dugme dugme-kucuk dugme-hayalet"
					onclick={() => {
						enlem = '';
						boylam = '';
					}}>Konumu temizle</button
				>
			{/if}
		</div>
		{#if hata}<p class="hata-metni" role="alert">{hata}</p>{/if}
		<div class="mini-harita" class:gizli={!acik}>
			<div
				bind:this={kap}
				class="harita"
				role="region"
				aria-label="Konum seçme haritası: tıkla ya da işaretçiyi sürükle"
			></div>
		</div>
		{#if acik}
			<p class="kucuk soluk">
				Haritaya tıkla ya da işaretçiyi sürükle; koordinatlar alanlara yazılır.
			</p>
		{/if}
	</div>
{/if}

<style>
	.konum-secici p {
		margin: 0;
	}
	.mini-harita {
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		overflow: hidden;
		background: var(--yuzey-2);
	}
	.mini-harita.gizli {
		display: none;
	}
	.harita {
		height: 18rem;
		width: 100%;
	}
	.mini-harita :global(.maplibregl-canvas) {
		cursor: crosshair;
	}
</style>
