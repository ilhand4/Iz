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
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { bildirimler } from '#lib/bildirim.svelte.ts';
	import { kisalt } from '#lib/metin.ts';
	import {
		BAG_TURLERI,
		BAG_TURU_ACIKLAMASI,
		BAG_TURU_ETIKETI,
		type BagTuru,
		DUGUM_TURLERI,
		DUGUM_TURU_COGUL,
		type EserDurumu,
		type EserTuru,
		type TarihHassasiyeti
	} from '#lib/sabitler.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import { eksikKonumlariYerlestir, type Nokta } from '#lib/yerlesim.ts';
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
		durum?: EserDurumu | null;
		/** Kayıtlı konum (yoksa null) */
		x?: number | null;
		y?: number | null;
		/** Gölge düğüm: başkasının açık haritasında yalnızca tür şekli (başlık ve içerik yok) */
		golge?: boolean;
	};
	type AgBagi = {
		id: string;
		kaynakId: string;
		hedefId: string;
		not: string | null;
		/** Gizli düğümlerden geçen yolun tek bağa indirilmiş hâli */
		dolayli?: boolean;
		/** besler / celisir / cagristirir / sentezler */
		tur?: string | null;
	};
	type Props = {
		dugumler: AgDugumu[];
		baglar: AgBagi[];
		odakId?: string | null;
		/** Yerleşim sunucuya kaydedilsin mi? (başkasının profilinde hayır) */
		kaydet?: boolean;
		/** Görünüm (süzgeçler, odak) adrese yazılsın mı? Paylaşılabilir bağlantı için */
		adreseYaz?: boolean;
		/** Adresten gelen başlangıç süzgeçleri */
		baslangic?: { gizliTurler?: DugumTuru[]; bagSuzgeci?: BagTuru | null };
		/** Ağda iki dokunuşla bağ kurma (yalnızca kendi haritasında) */
		bagKurabilir?: boolean;
		/** Zaman sürgüsü: düğümler yaşandıkları tarihe göre belirir */
		zamanSurgusu?: boolean;
	};

	let {
		dugumler,
		baglar,
		odakId = null,
		kaydet = true,
		adreseYaz = false,
		baslangic = {},
		bagKurabilir = false,
		zamanSurgusu = false
	}: Props = $props();

	let tuval: HTMLDivElement;
	let cy: cytoscape.Core | null = null;
	let hazir = $state(false);
	let hata = $state(false);
	let seciliId = $state<string | null>(null);
	// Başlangıç değerleri yalnızca ilk açılışta adresten alınır
	let gizliTurler = $state<DugumTuru[]>(untrack(() => baslangic.gizliTurler ?? []));
	let bagSuzgeci = $state<BagTuru | null>(untrack(() => baslangic.bagSuzgeci ?? null));
	let yerelBaglar = $state<AgBagi[]>([]);
	const tumBaglar = $derived([...baglar, ...yerelBaglar]);
	const bagTurleri = $derived(BAG_TURLERI.filter((t) => tumBaglar.some((b) => b.tur === t)));

	const dugumHaritasi = $derived(new Map(dugumler.map((d) => [d.id, d])));
	const secili = $derived(seciliId ? (dugumHaritasi.get(seciliId) ?? null) : null);
	const gidenler = $derived(
		seciliId
			? tumBaglar
					.filter((b) => b.kaynakId === seciliId)
					.map((b) => ({ bag: b, dugum: dugumHaritasi.get(b.hedefId)! }))
					.filter((x) => x.dugum)
			: []
	);
	const gelenler = $derived(
		seciliId
			? tumBaglar
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
		'zemin' | 'yuzey' | 'metin' | 'soluk' | 'cizgi' | 'vurgu' | 'hata' | DugumTuru,
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
			ani: oku('--tur-ani'),
			hata: oku('--hata')
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
				// Merak edilen eser henüz yaşanmadı: içi boş, kesik kenarlı
				selector: 'node[durum = "merak"]',
				style: {
					'background-opacity': 0.18,
					'border-color': r.eser,
					'border-width': 2.5,
					'border-style': 'dashed'
				}
			},
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
			// Bağ türleri: renk ve çizgi biçemi asıl (renk körlüğü için çizgi de farklı)
			{
				selector: 'edge[tur = "besler"]',
				style: {
					'line-color': r.yer,
					'target-arrow-color': r.yer,
					'line-style': 'solid',
					width: 2.2
				}
			},
			{
				selector: 'edge[tur = "celisir"]',
				style: {
					'line-color': r.hata,
					'target-arrow-color': r.hata,
					'target-arrow-shape': 'tee',
					'line-style': 'dashed',
					'line-dash-pattern': [10, 5]
				}
			},
			{
				selector: 'edge[tur = "cagristirir"]',
				style: { 'line-color': r.ani, 'target-arrow-color': r.ani, 'line-style': 'dotted' }
			},
			{
				selector: 'edge[tur = "sentezler"]',
				style: {
					'line-color': r.karar,
					'target-arrow-color': r.karar,
					'line-style': 'solid',
					width: 3.2
				}
			},
			{ selector: 'edge.suzulen', style: { opacity: 0.07 } },
			{ selector: 'node.gelecek', style: { display: 'none' } },
			{
				selector: 'node.bag-kaynagi',
				style: { 'border-color': r.vurgu, 'border-width': 5, 'border-style': 'double' }
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
			{
				// Gölge düğüm: buzlu cam görünümü, kesikli kontur, etiket yok
				selector: 'node[golge = 1]',
				style: {
					'background-opacity': 0.12,
					'border-style': 'dashed',
					'border-width': 2,
					'border-color': r.soluk,
					label: ''
				}
			},
			{
				// Dolaylı bağ: aradaki gizli düğümler gösterilmez
				selector: 'edge[dolayli = 1]',
				style: {
					'line-style': 'dotted',
					'line-dash-pattern': [2, 5],
					'target-arrow-shape': 'triangle-backcurve',
					opacity: 0.7
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
			// Bağ türü fiziği ikincil: çelişen uzağa, sentezlenen yakına
			idealEdgeLength: (e: cytoscape.EdgeSingular) =>
				({ besler: 70, celisir: 150, cagristirir: 110, sentezler: 55 })[e.data('tur') as BagTuru] ??
				80,
			nodeRepulsion: 5500,
			edgeElasticity: (e: cytoscape.EdgeSingular) => (e.data('tur') === 'celisir' ? 0.2 : 0.45),
			gravity: 0.35,
			numIter: 2500,
			packComponents: true,
			tilingPaddingVertical: 32,
			tilingPaddingHorizontal: 32
		} as unknown as cytoscape.LayoutOptions;
	}

	function elemanlar(konumlar: Map<string, Nokta> | null): cytoscape.ElementDefinition[] {
		// Fonksiyon içinde bir kez kullanılan geçici sayaç; tepkisel olması gerekmiyor
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const derece = new Map<string, number>();
		for (const b of baglar) {
			derece.set(b.kaynakId, (derece.get(b.kaynakId) ?? 0) + 1);
			derece.set(b.hedefId, (derece.get(b.hedefId) ?? 0) + 1);
		}
		return [
			...dugumler.map((d) => ({
				group: 'nodes' as const,
				data: {
					id: d.id,
					tur: d.tur,
					durum: d.durum ?? '',
					etiket: d.golge ? '' : kisalt(d.baslik, 30),
					golge: d.golge ? 1 : 0,
					derece: derece.get(d.id) ?? 0
				},
				position: konumlar?.get(d.id)
			})),
			...baglar
				.filter((b) => dugumHaritasi.has(b.kaynakId) && dugumHaritasi.has(b.hedefId))
				.map((b) => ({
					group: 'edges' as const,
					data: {
						id: b.id,
						source: b.kaynakId,
						target: b.hedefId,
						not: b.not ? kisalt(b.not, 42) : '',
						dolayli: b.dolayli ? 1 : 0,
						tur: b.tur ?? ''
					}
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
		ag.animate({
			fit: { eles: ag.elements(':visible'), padding: 56 },
			duration: azHareket() ? 0 : 300
		});
	}

	// ——— Kalıcı konumlar: sürükleme ve yeniden yerleştirme sunucuya kaydedilir ———

	let kayitHatasiGosterildi = false;
	async function konumlariKaydet(idler: Iterable<string>) {
		const ag = cy;
		if (!ag || !kaydet) return;
		const konumlar = [...idler]
			.map((id) => ag.getElementById(id))
			.filter((n) => n.nonempty())
			.map((n) => {
				const p = n.position();
				return { id: n.id(), x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
			});
		if (!konumlar.length) return;
		try {
			const yanit = await fetch('/api/ag/konumlar', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ konumlar })
			});
			if (!yanit.ok) throw new Error(String(yanit.status));
		} catch {
			// Kaydedilemese de ağ çalışmaya devam eder; uyarı bir kez gösterilir
			if (!kayitHatasiGosterildi) {
				kayitHatasiGosterildi = true;
				bildirimler.goster({
					mesaj: 'Yerleşim kaydedilemedi; bir sonraki açılışta değişebilir.',
					tur: 'hata'
				});
			}
		}
	}

	// Sürüklenen düğümler kısa bir beklemeden sonra topluca kaydedilir
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- tepkisel olması gerekmeyen kuyruk
	const surukleKuyrugu = new Set<string>();
	let surukleZamanlayici: ReturnType<typeof setTimeout> | undefined;
	function surukleKaydet(id: string) {
		surukleKuyrugu.add(id);
		clearTimeout(surukleZamanlayici);
		surukleZamanlayici = setTimeout(() => {
			const idler = [...surukleKuyrugu];
			surukleKuyrugu.clear();
			konumlariKaydet(idler);
		}, 600);
	}

	function konumlariAl(): Map<string, Nokta> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- geçici anlık görüntü
		const m = new Map<string, Nokta>();
		cy?.nodes().forEach((n) => {
			m.set(n.id(), { ...n.position() });
		});
		return m;
	}

	function konumlaraDon(eski: Map<string, Nokta>) {
		const ag = cy;
		if (!ag) return;
		ag.nodes().forEach((n) => {
			const p = eski.get(n.id());
			if (!p) return;
			if (azHareket()) n.position(p);
			else n.animate({ position: p, duration: 450 });
		});
		konumlariKaydet(eski.keys());
	}

	function yenidenYerlestir() {
		const ag = cy;
		if (!ag) return;
		const eski = konumlariAl();
		const yerlesimIsi = ag.elements(':visible').layout(yerlesim(true));
		yerlesimIsi.one('layoutstop', () => {
			konumlariKaydet(ag.nodes(':visible').map((n) => n.id()));
			bildirimler.goster({
				mesaj: 'Ağ yeniden yerleştirildi.',
				geriAl: { fn: () => konumlaraDon(eski) }
			});
		});
		yerlesimIsi.run();
	}

	function turDegistir(tur: DugumTuru) {
		gizliTurler = gizliTurler.includes(tur)
			? gizliTurler.filter((t) => t !== tur)
			: [...gizliTurler, tur];
	}

	/** Yön tuşlarıyla seçiliden o yöndeki en yakın açıdaki komşuya geçer */
	function komsuyaGec(yon: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown') {
		const ag = cy;
		if (!ag) return;
		const gorunurler = ag.nodes(':visible');
		if (!gorunurler.length) return;
		if (!seciliId) {
			odakla(gorunurler[0].id());
			return;
		}
		const merkez = ag.getElementById(seciliId);
		const p = merkez.position();
		const hedefAci = { ArrowRight: 0, ArrowDown: 90, ArrowLeft: 180, ArrowUp: -90 }[yon];
		let enIyi: { id: string; fark: number; uzaklik: number } | null = null;
		merkez.neighborhood('node:visible').forEach((n) => {
			const q = n.position();
			const aci = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
			let fark = Math.abs(aci - hedefAci) % 360;
			if (fark > 180) fark = 360 - fark;
			const uzaklik = Math.hypot(q.x - p.x, q.y - p.y);
			if (fark <= 80 && (!enIyi || fark + uzaklik / 50 < enIyi.fark + enIyi.uzaklik / 50)) {
				enIyi = { id: n.id(), fark, uzaklik };
			}
		});
		if (enIyi) odakla((enIyi as { id: string }).id);
	}

	function tusaBasildi(e: KeyboardEvent) {
		if (e.key === '+' || e.key === '=') yakinlas(1.25);
		else if (e.key === '-') yakinlas(0.8);
		else if (e.key === '0') sigdir();
		else if (e.key === 'Escape') {
			if (bagKipi) bagKipiniKapat();
			else sec(null);
		} else if (e.key === 'Enter' && seciliId && !dugumHaritasi.get(seciliId)?.golge) {
			goto(`/dugumler/${seciliId}`);
		} else if (
			e.key === 'ArrowRight' ||
			e.key === 'ArrowLeft' ||
			e.key === 'ArrowUp' ||
			e.key === 'ArrowDown'
		) {
			komsuyaGec(e.key);
		} else return;
		e.preventDefault();
	}

	// ——— Bağ kur kipi: önce kaynağa, sonra hedefe dokun ———
	let bagKipi = $state(false);
	let bagKaynagi = $state<string | null>(null);

	function bagKipiniKapat() {
		bagKipi = false;
		if (bagKaynagi) cy?.getElementById(bagKaynagi).removeClass('bag-kaynagi');
		bagKaynagi = null;
	}

	async function bagKipiDokunus(id: string) {
		const ag = cy;
		if (!ag) return;
		if (!bagKaynagi) {
			bagKaynagi = id;
			ag.getElementById(id).addClass('bag-kaynagi');
			return;
		}
		if (bagKaynagi === id) {
			bagKipiniKapat();
			return;
		}
		const kaynakId = bagKaynagi;
		bagKipiniKapat();
		try {
			const yanit = await fetch('/api/baglar', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ kaynakId, hedefId: id })
			});
			const veri = await yanit.json().catch(() => ({}));
			if (!yanit.ok) throw new Error(veri.hata ?? 'Bağ kurulamadı.');
			const yeni: AgBagi = { id: veri.id, kaynakId, hedefId: id, not: null, tur: null };
			yerelBaglar = [...yerelBaglar, yeni];
			ag.add({
				group: 'edges',
				data: { id: yeni.id, source: kaynakId, target: id, not: '', dolayli: 0, tur: '' }
			});
			const k = dugumHaritasi.get(kaynakId)?.baslik ?? '';
			const h = dugumHaritasi.get(id)?.baslik ?? '';
			bildirimler.goster({
				mesaj: `“${k}” → “${h}” bağı kuruldu.`,
				baglanti: { href: `/dugumler/${kaynakId}`, metin: 'Not ekle' }
			});
		} catch (e) {
			bildirimler.goster({ mesaj: (e as Error).message, tur: 'hata' });
		}
	}

	// ——— Zaman sürgüsü ———
	const yillar = $derived(
		dugumler
			.map((d) => (d.tarih ? Number(d.tarih.slice(0, 4)) : null))
			.filter((y): y is number => y !== null)
	);
	const enErkenYil = $derived(yillar.length ? Math.min(...yillar) : null);
	const enGecYil = $derived(yillar.length ? Math.max(...yillar) : null);
	let zamanYili = $state<number | null>(null);
	let oynuyor = $state(false);
	let oynatmaZamanlayici: ReturnType<typeof setInterval> | undefined;

	function oynat() {
		if (enErkenYil === null || enGecYil === null) return;
		if (oynuyor) {
			oynuyor = false;
			clearInterval(oynatmaZamanlayici);
			return;
		}
		oynuyor = true;
		if (zamanYili === null || zamanYili >= enGecYil) zamanYili = enErkenYil;
		oynatmaZamanlayici = setInterval(() => {
			if (zamanYili === null || enGecYil === null || zamanYili >= enGecYil) {
				oynuyor = false;
				clearInterval(oynatmaZamanlayici);
				return;
			}
			zamanYili += 1;
		}, 450);
	}

	$effect(() => {
		const yil = zamanYili;
		const ag = cy;
		if (!hazir || !ag) return;
		ag.batch(() => {
			ag.nodes().forEach((n) => {
				const d = dugumHaritasi.get(n.id());
				const dYil = d?.tarih ? Number(d.tarih.slice(0, 4)) : null;
				// Tarihsiz düğümler başta (her zaman) görünür
				n.toggleClass('gelecek', yil !== null && dYil !== null && dYil > yil);
			});
		});
	});

	// Bağ türü süzgeci
	$effect(() => {
		const suzgec = bagSuzgeci;
		const ag = cy;
		if (!hazir || !ag) return;
		ag.batch(() => {
			ag.edges().forEach((e) => {
				e.toggleClass('suzulen', !!suzgec && e.data('tur') !== suzgec);
			});
		});
	});

	// Görünüm adrese yazılır (paylaşılabilir bağlantı); sayfa yeniden yüklenmez
	let adresZamanlayici: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		if (!adreseYaz || !hazir) return;
		const gizli = gizliTurler.join(',');
		const bag = bagSuzgeci;
		const odak = seciliId && !dugumHaritasi.get(seciliId)?.golge ? seciliId : null;
		clearTimeout(adresZamanlayici);
		adresZamanlayici = setTimeout(() => {
			const u = new URL(page.url.href);
			const ayarla = (ad: string, deger: string | null) =>
				deger ? u.searchParams.set(ad, deger) : u.searchParams.delete(ad);
			ayarla('gizli', gizli || null);
			ayarla('bag', bag);
			ayarla('odak', odak);
			if (u.href !== page.url.href) goto(u, { replace: true, shallow: true });
		}, 300);
	});

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

				// Kayıtlı konumlar varsa harita aynen kurulur; yeni düğümler komşularının yanına konur.
				// Hiç kayıtlı konum yoksa (ilk açılış) yerleşim baştan hesaplanır ve kaydedilir.
				const yerlesik = eksikKonumlariYerlestir(
					dugumler.map((d) => ({ id: d.id, x: d.x ?? null, y: d.y ?? null })),
					baglar
				);
				const ag = cytoscape({
					container: tuval,
					elements: elemanlar(yerlesik?.konumlar ?? null),
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
					if (bagKipi) {
						bagKipiDokunus(id);
						return;
					}
					if (matchMedia('(min-width: 48rem)').matches) sec(id);
					else odakla(id);
				});
				ag.on('tap', (e) => {
					if (e.target === ag) sec(null);
				});
				ag.on('dbltap', 'node', (e) => {
					if (!e.target.data('golge')) goto(`/dugumler/${e.target.id()}`);
				});
				ag.on('mouseover', 'node', () => (tuval.style.cursor = 'pointer'));
				ag.on('mouseout', 'node', () => (tuval.style.cursor = ''));
				ag.on('dragfree', 'node', (e) => surukleKaydet(e.target.id()));

				if (yerlesik) {
					ag.fit(undefined, 40);
					if (yerlesik.yeniler.length) konumlariKaydet(yerlesik.yeniler);
				} else {
					ag.layout(yerlesim(false)).run();
					konumlariKaydet(dugumler.map((d) => d.id));
				}
				// Dar ekranda tüm ağı sığdırmak etiketleri okunmaz kılar: okunur yakınlıkta ortala,
				// gerisi sürükleyerek gezilir ("Tümünü sığdır" yine genel görünümü verir)
				if (ag.zoom() < EN_AZ_OKUNUR_YAKINLIK) {
					ag.zoom(EN_AZ_OKUNUR_YAKINLIK);
					ag.center();
				}
				hazir = true;
				if (odakId && dugumHaritasi.has(odakId)) odakla(odakId);

				// Tema değişince renkleri yeniden oku
				const yenidenBoya = () =>
					ag
						.style()
						.fromJson(stilKur(renkleriOku(tuval)))
						.update();
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
			clearInterval(oynatmaZamanlayici);
			clearTimeout(surukleZamanlayici);
			if (surukleKuyrugu.size) konumlariKaydet([...surukleKuyrugu]);
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
		{#if bagKurabilir}
			<button
				type="button"
				class="cip bag-kur"
				aria-pressed={bagKipi}
				onclick={() => (bagKipi ? bagKipiniKapat() : (bagKipi = true))}
			>
				<Simge ad="baglanti" boyut={14} />
				{bagKipi ? (bagKaynagi ? 'Şimdi hedefe dokun' : 'Kaynağa dokun') : 'Bağ kur'}
			</button>
		{/if}
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

	{#if bagTurleri.length || (zamanSurgusu && enErkenYil !== null && enGecYil !== null && enGecYil > enErkenYil)}
		<div class="ikinci-cubuk">
			{#if bagTurleri.length}
				<div class="bag-lejanti" role="group" aria-label="Bağ türleri: yalnızca birini göster">
					{#each bagTurleri as t (t)}
						<button
							type="button"
							class="lejant"
							data-bag={t}
							aria-pressed={bagSuzgeci === t}
							title={BAG_TURU_ACIKLAMASI[t]}
							onclick={() => (bagSuzgeci = bagSuzgeci === t ? null : t)}
						>
							<span class="cizgi" aria-hidden="true"></span>
							{BAG_TURU_ETIKETI[t]}
						</button>
					{/each}
				</div>
			{/if}
			{#if zamanSurgusu && enErkenYil !== null && enGecYil !== null && enGecYil > enErkenYil}
				<div class="zaman">
					<button
						type="button"
						class="cip"
						onclick={oynat}
						aria-label={oynuyor ? 'Duraklat' : 'Ağın zamanla büyümesini oynat'}
					>
						{oynuyor ? '❚❚' : '▶'}
					</button>
					<label for="zaman-surgusu" class="kucuk">
						{zamanYili === null ? 'Tüm zamanlar' : `${zamanYili} sonuna kadar`}
					</label>
					<input
						id="zaman-surgusu"
						type="range"
						min={enErkenYil}
						max={enGecYil}
						step="1"
						value={zamanYili ?? enGecYil}
						oninput={(e) => {
							const v = Number(e.currentTarget.value);
							zamanYili = v >= (enGecYil ?? v) ? null : v;
						}}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<div class="sahne">
		<!-- Tuval klavyeyle odaklanır ve kendi kısayollarını dinler (+, −, 0, Esc) -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="tuval"
			bind:this={tuval}
			role="application"
			tabindex="0"
			aria-label="Bağlantı ağı: {dugumler.length} düğüm, {tumBaglar.length} bağ"
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
			<button
				type="button"
				onclick={() => yakinlas(1.25)}
				aria-label="Yakınlaştır"
				title="Yakınlaştır (+)"
			>
				<Simge ad="ekle" boyut={18} />
			</button>
			<button
				type="button"
				onclick={() => yakinlas(0.8)}
				aria-label="Uzaklaştır"
				title="Uzaklaştır (−)"
			>
				<Simge ad="eksi" boyut={18} />
			</button>
			<button type="button" onclick={sigdir} aria-label="Tümünü sığdır" title="Tümünü sığdır (0)">
				<Simge ad="sigdir" boyut={18} />
			</button>
			<button
				type="button"
				onclick={yenidenYerlestir}
				aria-label="Yeniden yerleştir"
				title="Yeniden yerleştir"
			>
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
				{#if secili.golge}
					<h2>Gölge düğüm</h2>
					<p class="alt">Sahibi bu düğümün yalnızca bağlantılarını paylaşıyor; içeriği gizli.</p>
				{:else}
					<h2><a href="/dugumler/{secili.id}">{secili.baslik}</a></h2>
				{/if}
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

				{#if !secili.golge}
					<a class="dugme dugme-birincil dugme-kucuk tam" href="/dugumler/{secili.id}">
						Ayrıntılar <Simge ad="ok" boyut={16} />
					</a>
				{/if}
			</aside>
		{/if}
	</div>
	<p class="gorunmez" aria-live="polite">
		{secili ? `${secili.golge ? 'Gölge düğüm' : secili.baslik} seçildi` : ''}
	</p>
	<p class="ipucu" id="ag-ipucu">
		Bir düğüme dokun: bağlarını vurgular. Çift tıkla ya da Enter: ayrıntısına git. Yön tuşları:
		komşu düğüme geç.
		{kaydet
			? 'Sürükle: yerini değiştir (yerleşim kaydedilir). Kesik kenarlılar merak listendekiler.'
			: 'Kesik kenarlılar henüz merak edilenler.'}
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
	.ikinci-cubuk {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2) var(--a-5);
		align-items: center;
	}
	.bag-lejanti {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.lejant {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		min-height: 2rem;
		padding: 0 var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
		color: var(--metin);
		font: inherit;
		font-size: var(--boyut-xs);
		font-weight: 600;
		cursor: pointer;
	}
	.lejant[aria-pressed='true'] {
		border-color: var(--metin);
		box-shadow: inset 0 0 0 1px var(--metin);
	}
	.lejant .cizgi {
		width: 1.6rem;
		border-top: 3px solid var(--bag-renk);
	}
	.lejant[data-bag='besler'] {
		--bag-renk: var(--tur-yer);
	}
	.lejant[data-bag='celisir'] {
		--bag-renk: var(--hata);
	}
	.lejant[data-bag='celisir'] .cizgi {
		border-top-style: dashed;
	}
	.lejant[data-bag='cagristirir'] {
		--bag-renk: var(--tur-ani);
	}
	.lejant[data-bag='cagristirir'] .cizgi {
		border-top-style: dotted;
	}
	.lejant[data-bag='sentezler'] {
		--bag-renk: var(--tur-karar);
	}
	.lejant[data-bag='sentezler'] .cizgi {
		border-top-width: 4px;
	}
	.zaman {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		flex: 1 1 16rem;
		max-width: 28rem;
	}
	.zaman label {
		flex: none;
		min-width: 8rem;
		font-variant-numeric: tabular-nums;
	}
	.zaman input {
		flex: 1;
		accent-color: var(--vurgu);
	}
	.bag-kur[aria-pressed='true'] {
		background: var(--vurgu);
		border-color: var(--vurgu);
		color: var(--vurgu-uzeri);
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
