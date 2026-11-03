<script lang="ts" module>
	import type cytoscape from 'cytoscape';
	import type { DugumTuru } from '#lib/sabitler.ts';

	/** Ağdaki şekiller; TurSekli.svelte'deki SVG şekilleriyle aynı görsel dil */
	const CYTOSCAPE_SEKLI: Record<DugumTuru, cytoscape.Css.NodeShape> = {
		eser: 'round-rectangle',
		kisi: 'ellipse',
		yer: 'round-triangle',
		karar: 'round-diamond',
		ani: 'round-pentagon'
	};

	// Uzantı yalnızca bir kez kaydedilmeli (sayfalar arası gidip gelince yeniden kaydedilmesin)
	let fcoseKayitli = false;

	/** Bunun altındaki yakınlıkta etiketler okunmaz hâle gelir */
	const EN_AZ_OKUNUR_YAKINLIK = 0.6;
</script>

<script lang="ts">
	// Ağ görünümü: düğümler ve "götürdü" bağları, Cytoscape.js ile tuvalde çizilir.
	// Cytoscape yalnızca bu sayfada ve tarayıcıda, dinamik içe aktarmayla yüklenir.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { kisalt } from '#lib/metin.ts';
	import {
		DUGUM_TURLERI,
		DUGUM_TURU_COGUL,
		type EserTuru,
		type TarihHassasiyeti
	} from '#lib/sabitler.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import DugumSecici from './DugumSecici.svelte';
	import Simge from './Simge.svelte';
	import TurRozeti from './TurRozeti.svelte';
	import TurSekli from './TurSekli.svelte';

	type AgDugumu = {
		id: string;
		tur: DugumTuru;
		eserTuru: EserTuru | null;
		baslik: string;
		altBaslik: string | null;
		tarih: string | null;
		tarihHassasiyeti: TarihHassasiyeti | null;
	};
	type AgBagi = { id: string; kaynakId: string; hedefId: string; not: string | null };
	type Props = { dugumler: AgDugumu[]; baglar: AgBagi[]; odakId?: string | null };

	let { dugumler, baglar, odakId = null }: Props = $props();

	let tuval: HTMLDivElement;
	let cy: cytoscape.Core | null = null;
	let hazir = $state(false);
	let hata = $state(false);
	let seciliId = $state<string | null>(null);
	let gizliTurler = $state<DugumTuru[]>([]);

	const dugumHaritasi = $derived(new Map(dugumler.map((d) => [d.id, d])));
	const secili = $derived(seciliId ? (dugumHaritasi.get(seciliId) ?? null) : null);
	const gidenler = $derived(
		seciliId
			? baglar
					.filter((b) => b.kaynakId === seciliId)
					.map((b) => ({ bag: b, dugum: dugumHaritasi.get(b.hedefId)! }))
					.filter((x) => x.dugum)
			: []
	);
	const gelenler = $derived(
		seciliId
			? baglar
					.filter((b) => b.hedefId === seciliId)
					.map((b) => ({ bag: b, dugum: dugumHaritasi.get(b.kaynakId)! }))
					.filter((x) => x.dugum)
			: []
	);
	const turSayilari = $derived(
		dugumler.reduce(
			(s, d) => ((s[d.tur] = (s[d.tur] ?? 0) + 1), s),
			{} as Partial<Record<DugumTuru, number>>
		)
	);

	const azHareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ——— Renkler: CSS değişkenlerinden (açık/koyu temaya göre) çözülür ———

	type Renkler = Record<
		'zemin' | 'yuzey' | 'metin' | 'soluk' | 'cizgi' | 'vurgu' | DugumTuru,
		string
	>;

	function renkleriOku(kap: HTMLElement): Renkler {
		// light-dark() değerleri ancak bir öğeye uygulanınca gerçek renge dönüşür
		const prob = document.createElement('span');
		prob.style.display = 'none';
		kap.appendChild(prob);
		const oku = (degisken: string) => {
			prob.style.color = `var(${degisken})`;
			return getComputedStyle(prob).color;
		};
		const renkler: Renkler = {
			// Etiket halesi sahnenin zeminiyle (kart yüzeyi) aynı renkte olmalı
			zemin: oku('--yuzey'),
			yuzey: oku('--yuzey'),
			metin: oku('--metin'),
			soluk: oku('--metin-soluk'),
			cizgi: oku('--cizgi-guclu'),
			vurgu: oku('--vurgu'),
			eser: oku('--tur-eser'),
			kisi: oku('--tur-kisi'),
			yer: oku('--tur-yer'),
			karar: oku('--tur-karar'),
			ani: oku('--tur-ani')
		};
		prob.remove();
		return renkler;
	}

	function stilKur(r: Renkler): cytoscape.StylesheetJson {
		const yazi = '"Inter Variable", system-ui, sans-serif';
		return [
			{
				selector: 'node',
				style: {
					'background-color': r.cizgi,
					width: 'mapData(derece, 0, 6, 22, 48)',
					height: 'mapData(derece, 0, 6, 22, 48)',
					'border-width': 2.5,
					'border-color': r.yuzey,
					label: 'data(etiket)',
					'font-family': yazi,
					'font-size': 14,
					'font-weight': 600,
					color: r.metin,
					'text-valign': 'bottom',
					'text-halign': 'center',
					'text-margin-y': 5,
					'text-wrap': 'ellipsis',
					'text-max-width': '150px',
					'text-outline-color': r.zemin,
					'text-outline-width': 2.5,
					'min-zoomed-font-size': 7,
					'overlay-opacity': 0,
					'transition-property': 'opacity',
					'transition-duration': 160
				}
			},
			...DUGUM_TURLERI.map((tur) => ({
				selector: `node[tur = "${tur}"]`,
				style: { 'background-color': r[tur], shape: CYTOSCAPE_SEKLI[tur] }
			})),
			{
				selector: 'edge',
				style: {
					width: 1.6,
					'line-color': r.cizgi,
					'target-arrow-color': r.cizgi,
					'target-arrow-shape': 'triangle',
					'arrow-scale': 0.95,
					'curve-style': 'bezier',
					'line-style': 'dashed',
					'line-dash-pattern': [6, 4],
					'overlay-opacity': 0,
					'transition-property': 'opacity',
					'transition-duration': 160
				}
			},
			{
				selector: 'node.secili',
				style: { 'border-color': r.vurgu, 'border-width': 4, 'font-size': 15, 'z-index': 10 }
			},
			{
				selector: 'edge.vurgulu',
				style: {
					width: 2.4,
					'line-color': r.vurgu,
					'target-arrow-color': r.vurgu,
					'line-style': 'solid',
					label: 'data(not)',
					'font-family': yazi,
					'font-size': 11,
					'font-style': 'italic',
					color: r.soluk,
					'text-rotation': 'autorotate',
					'text-background-color': r.zemin,
					'text-background-opacity': 0.92,
					'text-background-padding': '2px',
					'z-index': 9
				}
			},
			{ selector: '.soluk', style: { opacity: 0.13 } },
			{ selector: '.gizli', style: { display: 'none' } }
		];
	}

	function yerlesim(animasyon: boolean) {
		// fcose seçenekleri Cytoscape'in kendi tiplerinde yok
		return {
			name: 'fcose',
			quality: 'proof',
			randomize: true,
			animate: animasyon && !azHareket(),
			animationDuration: 550,
			fit: true,
			padding: 40,
			nodeDimensionsIncludeLabels: true,
			idealEdgeLength: 80,
			nodeRepulsion: 5500,
			edgeElasticity: 0.45,
			gravity: 0.35,
			numIter: 2500,
			packComponents: true,
			tilingPaddingVertical: 32,
			tilingPaddingHorizontal: 32
		} as unknown as cytoscape.LayoutOptions;
	}

	function elemanlar(): cytoscape.ElementDefinition[] {
		const derece = new Map<string, number>();
		for (const b of baglar) {
			derece.set(b.kaynakId, (derece.get(b.kaynakId) ?? 0) + 1);
			derece.set(b.hedefId, (derece.get(b.hedefId) ?? 0) + 1);
		}
		return [
			...dugumler.map((d) => ({
				group: 'nodes' as const,
				data: { id: d.id, tur: d.tur, etiket: kisalt(d.baslik, 30), derece: derece.get(d.id) ?? 0 }
			})),
			...baglar
				.filter((b) => dugumHaritasi.has(b.kaynakId) && dugumHaritasi.has(b.hedefId))
				.map((b) => ({
					group: 'edges' as const,
					data: { id: b.id, source: b.kaynakId, target: b.hedefId, not: b.not ? kisalt(b.not, 42) : '' }
				}))
		];
	}

	// ——— Seçim ve odak ———

	function vurgula(id: string | null) {
		const ag = cy;
		if (!ag) return;
		ag.batch(() => {
			ag.elements().removeClass('soluk vurgulu secili');
			if (!id) return;
			const dugum = ag.getElementById(id);
			if (dugum.empty()) return;
			const komsuluk = dugum.closedNeighborhood();
			ag.elements().not(komsuluk).addClass('soluk');
			komsuluk.edges().addClass('vurgulu');
			dugum.addClass('secili');
		});
	}

	function sec(id: string | null) {
		seciliId = id;
		vurgula(id);
	}

	function odakla(id: string) {
		const ag = cy;
		const dugum = dugumHaritasi.get(id);
		if (!ag || !dugum) return;
		if (gizliTurler.includes(dugum.tur)) gizliTurler = gizliTurler.filter((t) => t !== dugum.tur);
		sec(id);
		// Düğümü komşularıyla birlikte, panelin kapatmadığı alana sığdır: geniş ekranda panel
		// sağda (20rem), dar ekranda alttan açılan sayfa olarak alanın yaklaşık %58'ini kaplar
		const genis = matchMedia('(min-width: 48rem)').matches;
		const alan = {
			genislik: ag.width() - (genis ? 20 * 16 + 24 : 0),
			yukseklik: genis ? ag.height() : ag.height() * 0.42
		};
		const kutu = ag
			.getElementById(id)
			.closedNeighborhood()
			.nodes()
			.boundingBox({ includeLabels: true });
		const bosluk = 64;
		const yakinlik = Math.min(
			1.4,
			Math.max(0.4, (alan.genislik - bosluk) / kutu.w),
			Math.max(0.4, (alan.yukseklik - bosluk) / kutu.h)
		);
		const merkez = { x: kutu.x1 + kutu.w / 2, y: kutu.y1 + kutu.h / 2 };
		ag.animate({
			zoom: yakinlik,
			pan: {
				x: alan.genislik / 2 - yakinlik * merkez.x,
				y: alan.yukseklik / 2 - yakinlik * merkez.y
			},
			duration: azHareket() ? 0 : 380
		});
	}

	// ——— Denetimler ———

	function yakinlas(kat: number) {
		const ag = cy;
		if (!ag) return;
		ag.animate({
			zoom: {
				level: Math.min(Math.max(ag.zoom() * kat, ag.minZoom()), ag.maxZoom()),
				renderedPosition: { x: ag.width() / 2, y: ag.height() / 2 }
			},
			duration: azHareket() ? 0 : 160
		});
	}

	function sigdir() {
		const ag = cy;
		if (!ag) return;
		ag.animate({ fit: { eles: ag.elements(':visible'), padding: 56 }, duration: azHareket() ? 0 : 300 });
	}

	function yenidenYerlestir() {
		cy?.elements(':visible').layout(yerlesim(true)).run();
	}

	function turDegistir(tur: DugumTuru) {
		gizliTurler = gizliTurler.includes(tur)
			? gizliTurler.filter((t) => t !== tur)
			: [...gizliTurler, tur];
	}

	function tusaBasildi(e: KeyboardEvent) {
		if (e.key === '+' || e.key === '=') yakinlas(1.25);
		else if (e.key === '-') yakinlas(0.8);
		else if (e.key === '0') sigdir();
		else if (e.key === 'Escape') sec(null);
		else return;
		e.preventDefault();
	}

	// Tür süzgeci
	$effect(() => {
		const gizli = new Set(gizliTurler);
		const ag = cy;
		if (!hazir || !ag) return;
		ag.batch(() => {
			ag.nodes().forEach((n) => {
				n.toggleClass('gizli', gizli.has(n.data('tur')));
			});
		});
		if (seciliId) {
			const tur = dugumHaritasi.get(seciliId)?.tur;
			if (tur && gizli.has(tur)) sec(null);
		}
	});

	onMount(() => {
		let iptal = false;
		const temizlik: (() => void)[] = [];

		(async () => {
			try {
				const [{ default: cytoscape }, { default: fcose }] = await Promise.all([
					import('cytoscape'),
					import('cytoscape-fcose')
				]);
				// Etiketler doğru yazı tipiyle çizilsin (en fazla 1,5 sn bekle)
				await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
				if (iptal) return;
				if (!fcoseKayitli) {
					cytoscape.use(fcose);
					fcoseKayitli = true;
				}

				const ag = cytoscape({
					container: tuval,
					elements: elemanlar(),
					style: stilKur(renkleriOku(tuval)),
					layout: { name: 'preset' },
					minZoom: 0.15,
					maxZoom: 3,
					boxSelectionEnabled: false
				});
				cy = ag;

				// Dar ekranda panel alttan açılıp düğümü örtebilir: dokunulan düğümü görünür alana getir
				ag.on('tap', 'node', (e) => {
					const id = e.target.id();
					if (matchMedia('(min-width: 48rem)').matches) sec(id);
					else odakla(id);
				});
				ag.on('tap', (e) => {
					if (e.target === ag) sec(null);
				});
				ag.on('dbltap', 'node', (e) => goto(`/dugumler/${e.target.id()}`));
				ag.on('mouseover', 'node', () => (tuval.style.cursor = 'pointer'));
				ag.on('mouseout', 'node', () => (tuval.style.cursor = ''));

				ag.layout(yerlesim(false)).run();
				// Dar ekranda tüm ağı sığdırmak etiketleri okunmaz kılar: okunur yakınlıkta ortala,
				// gerisi sürükleyerek gezilir ("Tümünü sığdır" yine genel görünümü verir)
				if (ag.zoom() < EN_AZ_OKUNUR_YAKINLIK) {
					ag.zoom(EN_AZ_OKUNUR_YAKINLIK);
					ag.center();
				}
				hazir = true;
				if (odakId && dugumHaritasi.has(odakId)) odakla(odakId);

				// Tema değişince renkleri yeniden oku
				const yenidenBoya = () => ag.style().fromJson(stilKur(renkleriOku(tuval))).update();
				const gozlemci = new MutationObserver(yenidenBoya);
				gozlemci.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['data-theme']
				});
				const koyuSorgu = matchMedia('(prefers-color-scheme: dark)');
				koyuSorgu.addEventListener('change', yenidenBoya);
				const boyut = new ResizeObserver(() => ag.resize());
				boyut.observe(tuval);
				temizlik.push(
					() => gozlemci.disconnect(),
					() => koyuSorgu.removeEventListener('change', yenidenBoya),
					() => boyut.disconnect()
				);
			} catch (e) {
				console.error('Ağ görünümü başlatılamadı', e);
				hata = true;
			}
		})();

		return () => {
			iptal = true;
			for (const f of temizlik) f();
			cy?.destroy();
			cy = null;
		};
	});
</script>

<div class="ag-gorunumu">
	<div class="arac-cubugu">
		<div class="arama">
			<label class="gorunmez" for="ag-ara">Ağda düğüm bul</label>
			<DugumSecici
				id="ag-ara"
				secenekler={dugumler}
				onsec={(s) => odakla(s.id)}
				secinceTemizle
				yerTutucu="Ağda düğüm bul…"
			/>
		</div>
		<div class="suzgecler" role="group" aria-label="Türlere göre göster ya da gizle">
			{#each DUGUM_TURLERI as tur (tur)}
				{#if turSayilari[tur]}
					<button
						type="button"
						class="cip"
						aria-pressed={!gizliTurler.includes(tur)}
						onclick={() => turDegistir(tur)}
						title={gizliTurler.includes(tur) ? 'Göster' : 'Gizle'}
					>
						<TurSekli {tur} boyut={12} />
						{DUGUM_TURU_COGUL[tur]}
						<span class="sayi">{turSayilari[tur]}</span>
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<div class="sahne">
		<!-- Tuval klavyeyle odaklanır ve kendi kısayollarını dinler (+, −, 0, Esc) -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="tuval"
			bind:this={tuval}
			role="application"
			tabindex="0"
			aria-label="Bağlantı ağı: {dugumler.length} düğüm, {baglar.length} bağ"
			aria-describedby="ag-ipucu"
			onkeydown={tusaBasildi}
		></div>

		{#if !hazir}
			<div class="durum" aria-live="polite">
				{#if hata}
					Ağ çizilemedi. Sayfayı yenilemeyi dene; düğümlerine liste görünümünden de ulaşabilirsin.
				{:else}
					<span class="nokta-yukleniyor" aria-hidden="true"><i></i><i></i><i></i></span>
					Ağ çiziliyor…
				{/if}
			</div>
		{/if}

		<div class="kontroller" aria-label="Görünüm denetimleri" role="toolbar">
			<button type="button" onclick={() => yakinlas(1.25)} aria-label="Yakınlaştır" title="Yakınlaştır (+)">
				<Simge ad="ekle" boyut={18} />
			</button>
			<button type="button" onclick={() => yakinlas(0.8)} aria-label="Uzaklaştır" title="Uzaklaştır (−)">
				<Simge ad="eksi" boyut={18} />
			</button>
			<button type="button" onclick={sigdir} aria-label="Tümünü sığdır" title="Tümünü sığdır (0)">
				<Simge ad="sigdir" boyut={18} />
			</button>
			<button type="button" onclick={yenidenYerlestir} aria-label="Yeniden yerleştir" title="Yeniden yerleştir">
				<Simge ad="yenile" boyut={18} />
			</button>
		</div>

		{#if secili}
			<aside class="panel" aria-label="Seçili düğüm">
				<div class="panel-ust">
					<TurRozeti tur={secili.tur} eserTuru={secili.eserTuru} />
					<button type="button" class="kapat" onclick={() => sec(null)} aria-label="Paneli kapat">
						<Simge ad="kapat" boyut={18} />
					</button>
				</div>
				<h2><a href="/dugumler/{secili.id}">{secili.baslik}</a></h2>
				{#if secili.altBaslik}<p class="alt">{secili.altBaslik}</p>{/if}
				{#if secili.tarih}
					<p class="tarih">
						<Simge ad="takvim" boyut={14} />
						{tarihYaz(secili.tarih, secili.tarihHassasiyeti)}
					</p>
				{/if}

				{#if gidenler.length}
					<h3>Götürdükleri</h3>
					<ul>
						{#each gidenler as g (g.bag.id)}
							<li>
								<button type="button" onclick={() => odakla(g.dugum.id)}>
									<TurSekli tur={g.dugum.tur} boyut={11} />
									{g.dugum.baslik}
								</button>
								{#if g.bag.not}<small>“{g.bag.not}”</small>{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if gelenler.length}
					<h3>Getirenler</h3>
					<ul>
						{#each gelenler as g (g.bag.id)}
							<li>
								<button type="button" onclick={() => odakla(g.dugum.id)}>
									<TurSekli tur={g.dugum.tur} boyut={11} />
									{g.dugum.baslik}
								</button>
								{#if g.bag.not}<small>“{g.bag.not}”</small>{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if !gidenler.length && !gelenler.length}
					<p class="soluk kucuk">Bu düğümün henüz bir bağı yok.</p>
				{/if}

				<a class="dugme dugme-birincil dugme-kucuk tam" href="/dugumler/{secili.id}">
					Ayrıntılar <Simge ad="ok" boyut={16} />
				</a>
			</aside>
		{/if}
	</div>
	<p class="ipucu" id="ag-ipucu">
		Bir düğüme dokun: bağlarını vurgular. Çift tıkla: ayrıntısına git. Sürükle: yerini değiştir.
		Klavye: + / − yakınlaştır, 0 sığdır, Esc seçimi kaldır.
	</p>
</div>

<style>
	.ag-gorunumu {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.arac-cubugu {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-3);
		align-items: center;
	}
	.arama {
		flex: 1 1 16rem;
		max-width: 24rem;
	}
	.suzgecler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.cip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 2.25rem;
		padding: 0 var(--a-3);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
		color: var(--metin);
		font: inherit;
		font-size: var(--boyut-sm);
		font-weight: 550;
		cursor: pointer;
		transition:
			opacity var(--gecis),
			background var(--gecis);
	}
	.cip:hover {
		background: var(--yuzey-2);
	}
	.cip[aria-pressed='false'] {
		opacity: 0.5;
		text-decoration: line-through;
		text-decoration-color: var(--metin-soluk);
	}
	.sayi {
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
		font-variant-numeric: tabular-nums;
	}

	.sahne {
		position: relative;
		height: clamp(24rem, 68dvh, 50rem);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		overflow: hidden;
		background-color: var(--yuzey);
		/* Noktalı ızgara: haritaya "kâğıt" dokusu */
		background-image: radial-gradient(
			color-mix(in srgb, var(--metin) 11%, transparent) 1px,
			transparent 1.2px
		);
		background-size: 22px 22px;
	}
	.tuval {
		position: absolute;
		inset: 0;
	}
	.tuval:focus-visible {
		outline: 2px solid var(--vurgu);
		outline-offset: -2px;
	}
	.durum {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--a-3);
		padding: var(--a-5);
		text-align: center;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
		pointer-events: none;
	}
	.nokta-yukleniyor {
		display: flex;
		gap: 6px;
	}
	.nokta-yukleniyor i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--vurgu);
		animation: zipla 1s ease-in-out infinite;
	}
	.nokta-yukleniyor i:nth-child(2) {
		animation-delay: 0.15s;
	}
	.nokta-yukleniyor i:nth-child(3) {
		animation-delay: 0.3s;
	}
	@keyframes zipla {
		0%,
		100% {
			opacity: 0.25;
			transform: translateY(0);
		}
		50% {
			opacity: 1;
			transform: translateY(-4px);
		}
	}

	.kontroller {
		position: absolute;
		left: var(--a-3);
		bottom: var(--a-3);
		display: flex;
		flex-direction: column;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		box-shadow: var(--golge-2);
		overflow: hidden;
	}
	.kontroller button {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: 0;
		background: transparent;
		color: var(--metin);
		cursor: pointer;
	}
	.kontroller button + button {
		border-top: 1px solid var(--cizgi);
	}
	.kontroller button:hover {
		background: var(--yuzey-2);
	}

	.panel {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 58%;
		overflow-y: auto;
		padding: var(--a-4);
		background: var(--yuzey);
		border-top: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg) var(--yaricap-lg) 0 0;
		box-shadow: 0 -8px 24px rgb(0 0 0 / 0.12);
	}
	.panel-ust {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--a-2);
	}
	.kapat {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		margin: -0.5rem -0.5rem -0.5rem 0;
		border: 0;
		border-radius: var(--yaricap-tam);
		background: transparent;
		color: var(--metin-soluk);
		cursor: pointer;
	}
	.kapat:hover {
		background: var(--yuzey-2);
		color: var(--metin);
	}
	.panel h2 {
		font-size: var(--boyut-lg);
		margin: 0;
	}
	.panel h2 a {
		color: var(--metin);
		text-decoration: none;
	}
	.panel h2 a:hover {
		color: var(--vurgu);
	}
	.alt {
		margin: var(--a-1) 0 0;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.tarih {
		display: flex;
		align-items: center;
		gap: var(--a-1);
		margin: var(--a-2) 0 0;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.panel h3 {
		margin: var(--a-4) 0 var(--a-2);
		font-family: var(--yazi-govde);
		font-size: var(--boyut-xs);
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--metin-soluk);
	}
	.panel ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
	}
	.panel li button {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		padding: var(--a-1) 0;
		border: 0;
		background: none;
		color: var(--metin);
		font: inherit;
		font-weight: 550;
		text-align: left;
		cursor: pointer;
	}
	.panel li button:hover {
		color: var(--vurgu);
	}
	.panel li small {
		display: block;
		margin: 0 0 var(--a-1) 1.2rem;
		font-style: italic;
		color: var(--metin-soluk);
	}
	.tam {
		width: 100%;
		margin-top: var(--a-4);
	}
	.ipucu {
		margin: 0;
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}

	@media (min-width: 48rem) {
		.panel {
			left: auto;
			top: var(--a-3);
			right: var(--a-3);
			bottom: auto;
			width: 20rem;
			max-height: calc(100% - 2 * var(--a-3));
			border: 1px solid var(--cizgi);
			border-radius: var(--yaricap-lg);
			box-shadow: var(--golge-2);
		}
	}
</style>
