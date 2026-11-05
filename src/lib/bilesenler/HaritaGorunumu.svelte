<script lang="ts">
	// Yerlerin haritası (MapLibre + OpenFreeMap). İşaretçiler HTML düğmesidir: klavyeyle
	// odaklanabilir, ekran okuyucuda adıyla okunur. Haritanın erişilebilir eşdeğeri sayfadaki yer listesidir.
	import { onMount } from 'svelte';
	import type { Map as HaritaNesnesi, Marker } from 'maplibre-gl';
	import { SEKIL_YOLU } from './TurSekli.svelte';
	import {
		koyuMu,
		maplibreYukle,
		renkOku,
		stilAdresi,
		temaDegisinceCagir
	} from '#lib/haritaYukle.ts';
	import { sinirlar, type CizgiOzelligi, type Yer } from '#lib/konumlar.ts';

	type Props = {
		yerler: Yer[];
		cizgiler?: CizgiOzelligi[];
		secili?: string | null;
		onsec?: (anahtar: string) => void;
	};
	let { yerler, cizgiler = [], secili = null, onsec }: Props = $props();

	let kap: HTMLDivElement;
	let harita: HaritaNesnesi | null = null;
	let isaretciler: { anahtar: string; isaretci: Marker; oge: HTMLButtonElement }[] = [];
	let durum = $state<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

	function isaretciOgesi(yer: Yer) {
		const oge = document.createElement('button');
		oge.type = 'button';
		oge.className = 'isaretci';
		oge.dataset.tur = yer.dugumler[0].tur;
		const sayi = yer.dugumler.length;
		oge.setAttribute('aria-label', `${yer.ad}: ${sayi} düğüm`);
		oge.title = yer.ad;
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 16 16');
		svg.setAttribute('aria-hidden', 'true');
		const yol = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		yol.setAttribute('d', SEKIL_YOLU[yer.dugumler[0].tur]);
		svg.append(yol);
		oge.append(svg);
		if (sayi > 1) {
			const rozet = document.createElement('span');
			rozet.className = 'sayi';
			rozet.textContent = sayi > 99 ? '99+' : String(sayi);
			rozet.setAttribute('aria-hidden', 'true');
			oge.append(rozet);
		}
		oge.addEventListener('click', () => onsec?.(yer.anahtar));
		return oge;
	}

	function cizgileriEkle() {
		if (!harita || !cizgiler.length) return;
		if (harita.getSource('baglar')) return;
		harita.addSource('baglar', {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: cizgiler }
		});
		harita.addLayer({
			id: 'baglar',
			type: 'line',
			source: 'baglar',
			paint: {
				'line-color': renkOku(kap, '--vurgu'),
				'line-width': 1.5,
				'line-opacity': 0.6,
				'line-dasharray': [2, 2]
			}
		});
	}

	function sigdir(animasyon = false) {
		const s = sinirlar(yerler);
		if (!harita || !s) return;
		if (yerler.length === 1) {
			harita.jumpTo({ center: [yerler[0].boylam, yerler[0].enlem], zoom: 12 });
			return;
		}
		harita.fitBounds(s, { padding: 48, maxZoom: 13, animate: animasyon });
	}

	onMount(() => {
		let iptal = false;
		let temaTemizle = () => {};
		(async () => {
			try {
				const ml = await maplibreYukle();
				if (iptal) return;
				harita = new ml.Map({
					container: kap,
					style: stilAdresi(koyuMu()),
					center: [29, 41],
					zoom: 3,
					attributionControl: { compact: true },
					cooperativeGestures: matchMedia('(pointer: coarse)').matches
				});
				harita.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
				harita.on('style.load', cizgileriEkle);
				harita.once('load', () => (durum = 'hazir'));
				harita.on('error', (e) => {
					// Tek bir karonun gelmemesi haritayı bozmaz; yalnızca stil yüklenemezse hata göster
					if (!harita?.isStyleLoaded() && durum === 'yukleniyor') durum = 'hata';
					console.warn('Harita:', e.error?.message);
				});
				for (const yer of yerler) {
					const oge = isaretciOgesi(yer);
					const isaretci = new ml.Marker({ element: oge })
						.setLngLat([yer.boylam, yer.enlem])
						.addTo(harita);
					isaretciler.push({ anahtar: yer.anahtar, isaretci, oge });
				}
				const odak = yerler.find((y) => y.anahtar === secili);
				if (odak) harita.jumpTo({ center: [odak.boylam, odak.enlem], zoom: 13 });
				else sigdir();
				temaTemizle = temaDegisinceCagir((koyu) => harita?.setStyle(stilAdresi(koyu)));
			} catch (e) {
				console.warn('Harita açılamadı:', e);
				durum = 'hata';
			}
		})();
		return () => {
			iptal = true;
			temaTemizle();
			harita?.remove();
			harita = null;
			isaretciler = [];
		};
	});

	// Seçim değişince işaretçiyi vurgula ve oraya uç
	$effect(() => {
		const s = secili;
		for (const i of isaretciler) i.oge.setAttribute('aria-pressed', String(i.anahtar === s));
		const yer = yerler.find((y) => y.anahtar === s);
		if (harita && yer) {
			const z = Math.max(harita.getZoom(), 12);
			harita.flyTo({
				center: [yer.boylam, yer.enlem],
				zoom: z,
				essential: true,
				duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800
			});
		}
	});

	export function tumunuGoster() {
		sigdir(true);
	}
</script>

<div class="harita-kabi">
	<div
		class="harita"
		bind:this={kap}
		role="region"
		aria-label="Yerlerin haritası; yerler aşağıdaki listede de var"
	></div>
	{#if durum === 'yukleniyor'}
		<p class="durum" role="status">Harita yükleniyor…</p>
	{:else if durum === 'hata'}
		<p class="durum hata" role="alert">
			Harita yüklenemedi (bağlantı ya da tarayıcının WebGL desteği). Yerlerin aşağıdaki listede.
		</p>
	{/if}
</div>

<style>
	.harita-kabi {
		position: relative;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		overflow: hidden;
		background: var(--yuzey-2);
	}
	.harita {
		height: clamp(22rem, calc(100dvh - 20rem), 44rem);
		width: 100%;
	}
	.durum {
		position: absolute;
		inset: auto var(--a-3) var(--a-3);
		margin: 0;
		padding: var(--a-2) var(--a-3);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
		font-size: var(--boyut-sm);
	}
	.durum.hata {
		color: var(--hata);
	}
	.harita-kabi :global(.isaretci) {
		position: relative;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 2px solid var(--yuzey);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
		cursor: pointer;
	}
	.harita-kabi :global(.isaretci svg) {
		width: 1.2rem;
		height: 1.2rem;
	}
	.harita-kabi :global(.isaretci path) {
		fill: var(--renk);
		stroke: var(--renk);
		stroke-width: 1.6;
		stroke-linejoin: round;
	}
	.harita-kabi :global(.isaretci[aria-pressed='true']) {
		border-color: var(--vurgu);
		box-shadow:
			0 0 0 3px var(--vurgu-zemin),
			0 1px 6px rgb(0 0 0 / 0.4);
		z-index: 2;
	}
	.harita-kabi :global(.isaretci:focus-visible) {
		outline: 3px solid var(--vurgu);
		outline-offset: 2px;
	}
	.harita-kabi :global(.isaretci .sayi) {
		position: absolute;
		top: -0.45rem;
		right: -0.55rem;
		min-width: 1.15rem;
		padding: 0 0.25rem;
		border-radius: var(--yaricap-tam);
		background: var(--metin);
		color: var(--zemin);
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1.15rem;
	}
	.harita-kabi :global(.isaretci[data-tur='eser']) {
		--renk: var(--tur-eser);
	}
	.harita-kabi :global(.isaretci[data-tur='kisi']) {
		--renk: var(--tur-kisi);
	}
	.harita-kabi :global(.isaretci[data-tur='yer']) {
		--renk: var(--tur-yer);
	}
	.harita-kabi :global(.isaretci[data-tur='karar']) {
		--renk: var(--tur-karar);
	}
	.harita-kabi :global(.isaretci[data-tur='ani']) {
		--renk: var(--tur-ani);
	}
	.harita-kabi :global(.maplibregl-ctrl-attrib) {
		font-size: 0.7rem;
	}
</style>
