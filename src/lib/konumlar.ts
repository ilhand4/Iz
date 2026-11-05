// Harita görünümünün saf mantığı (birim testleri: konumlar.test.ts).
// Aynı noktadaki düğümler tek işaretçide toplanır; bağlar iki ucu da konumlu ise çizgi olur.
import type { DugumTuru } from './sabitler';

export type KonumluDugum = {
	id: string;
	baslik: string;
	tur: DugumTuru;
	enlem: number;
	boylam: number;
	yerAdi: string | null;
};

export type Yer = {
	/** Yuvarlanmış koordinattan sabit anahtar */
	anahtar: string;
	enlem: number;
	boylam: number;
	/** Gruptaki ilk yer adı (yoksa ilk düğümün başlığı) */
	ad: string;
	dugumler: KonumluDugum[];
};

/** ~1 m: bu hassasiyette aynı olan noktalar aynı yer sayılır */
const HANE = 5;

export function yerAnahtari(enlem: number, boylam: number) {
	return `${enlem.toFixed(HANE)},${boylam.toFixed(HANE)}`;
}

/** Düğümleri noktalarına göre toplar; kalabalık yerler önce, eşitse ada göre */
export function yerlereGrupla(dugumler: KonumluDugum[]): Yer[] {
	const harita = new Map<string, Yer>();
	for (const d of dugumler) {
		const anahtar = yerAnahtari(d.enlem, d.boylam);
		const yer = harita.get(anahtar);
		if (yer) {
			yer.dugumler.push(d);
			if (!yer.ad && d.yerAdi) yer.ad = d.yerAdi;
		} else {
			harita.set(anahtar, {
				anahtar,
				enlem: d.enlem,
				boylam: d.boylam,
				ad: d.yerAdi ?? '',
				dugumler: [d]
			});
		}
	}
	const yerler = [...harita.values()];
	for (const y of yerler) {
		// "yer" türündeki düğüm varsa yerin adı odur
		const yerDugumu = y.dugumler.find((d) => d.tur === 'yer');
		y.ad = yerDugumu?.baslik ?? (y.ad || y.dugumler[0].baslik);
		y.dugumler.sort((a, b) => Number(b.tur === 'yer') - Number(a.tur === 'yer'));
	}
	return yerler.sort(
		(a, b) => b.dugumler.length - a.dugumler.length || a.ad.localeCompare(b.ad, 'tr')
	);
}

/** [güneybatı, kuzeydoğu] olarak [boylam, enlem] çiftleri; nokta yoksa null */
export function sinirlar(
	noktalar: { enlem: number; boylam: number }[]
): [[number, number], [number, number]] | null {
	if (!noktalar.length) return null;
	let [bat, guney, dogu, kuzey] = [180, 90, -180, -90];
	for (const n of noktalar) {
		bat = Math.min(bat, n.boylam);
		dogu = Math.max(dogu, n.boylam);
		guney = Math.min(guney, n.enlem);
		kuzey = Math.max(kuzey, n.enlem);
	}
	return [
		[bat, guney],
		[dogu, kuzey]
	];
}

export type CizgiOzelligi = {
	type: 'Feature';
	properties: { tur: string };
	geometry: { type: 'LineString'; coordinates: [number, number][] };
};

/**
 * İki ucu da konumlu bağlar için GeoJSON çizgileri. Aynı noktadaki iki düğüm arasındaki bağ
 * çizilmez; aynı iki yer arasındaki birden çok bağ tek çizgiye iner.
 */
export function bagCizgileri(
	baglar: { kaynakId: string; hedefId: string; tur: string | null }[],
	dugumler: KonumluDugum[]
): CizgiOzelligi[] {
	const konum = new Map(dugumler.map((d) => [d.id, d]));
	const gorulen = new Set<string>();
	const cizgiler: CizgiOzelligi[] = [];
	for (const b of baglar) {
		const k = konum.get(b.kaynakId);
		const h = konum.get(b.hedefId);
		if (!k || !h) continue;
		const ka = yerAnahtari(k.enlem, k.boylam);
		const ha = yerAnahtari(h.enlem, h.boylam);
		if (ka === ha) continue;
		const cift = ka < ha ? `${ka}|${ha}` : `${ha}|${ka}`;
		if (gorulen.has(cift)) continue;
		gorulen.add(cift);
		cizgiler.push({
			type: 'Feature',
			properties: { tur: b.tur ?? '' },
			geometry: {
				type: 'LineString',
				coordinates: [
					[k.boylam, k.enlem],
					[h.boylam, h.enlem]
				]
			}
		});
	}
	return cizgiler;
}

/** Koordinatı insan diliyle (6 hane, Türkçe ondalık değil: form alanlarıyla aynı biçim) */
export function koordinatYaz(sayi: number) {
	return (Math.round(sayi * 1e6) / 1e6).toString();
}

/** "350 m", "1,2 km" */
export function mesafeYaz(metre: number) {
	if (metre < 1000) return `${Math.round(metre / 10) * 10} m`;
	return `${(metre / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
}
