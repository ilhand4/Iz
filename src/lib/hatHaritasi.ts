// Hat haritası (metro görünümü): izler hat, düğümler durak; birden fazla izin geçtiği düğümler
// aktarma istasyonu. Yatay eksen zaman: tarihli duraklar tarihlerine göre, tarihsizler hattaki
// komşularının arasına yerleşir. Sıra tabanlı aralık kullanılır (okunurluk için eşit adım).
// Saf fonksiyon; birim testleri hatHaritasi.test.ts'de.
import type { DugumTuru } from './sabitler';

export type HatGirdisi = {
	id: string;
	baslik: string;
	duraklar: { id: string; baslik: string; tur: DugumTuru; tarih: string | null }[];
};

export type Istasyon = {
	id: string;
	baslik: string;
	tur: DugumTuru;
	x: number;
	y: number;
	aktarma: boolean;
	hatlar: number[];
};

export type HatCizimi = {
	istasyonlar: Istasyon[];
	hatlar: {
		id: string;
		baslik: string;
		sira: number;
		noktalar: { id: string; x: number; y: number }[];
	}[];
	yillar: { yil: number; x: number }[];
	genislik: number;
	yukseklik: number;
};

export const HAT_ARALIGI = { x: 120, y: 90, kenar: 80, ust: 110 };

/** "1998-05-12" → 1998.36 gibi sürekli bir zaman değeri */
function zamanDegeri(tarih: string): number {
	const [y, a, g] = tarih.split('-').map(Number);
	return y + ((a - 1) * 31 + (g - 1)) / 372;
}

export function hatHaritasiKur(hatlar: HatGirdisi[]): HatCizimi {
	const dolu = hatlar.filter((h) => h.duraklar.length > 0);
	const bilgi = new Map<
		string,
		{ baslik: string; tur: DugumTuru; zaman: number | null; hatlar: Set<number>; ilk: number }
	>();
	let sayac = 0;
	dolu.forEach((h, hi) => {
		for (const d of h.duraklar) {
			const b = bilgi.get(d.id);
			if (b) b.hatlar.add(hi);
			else
				bilgi.set(d.id, {
					baslik: d.baslik,
					tur: d.tur,
					zaman: d.tarih ? zamanDegeri(d.tarih) : null,
					hatlar: new Set([hi]),
					ilk: sayac++
				});
		}
	});

	// Tarihsiz duraklara, ilk geçtikleri hattaki tarihli komşularından tahmini zaman
	const tumZamanlar = [...bilgi.values()]
		.map((b) => b.zaman)
		.filter((z): z is number => z !== null);
	const enErken = tumZamanlar.length ? Math.min(...tumZamanlar) : 0;
	for (const h of dolu) {
		const z = h.duraklar.map((d) => bilgi.get(d.id)!.zaman);
		h.duraklar.forEach((d, i) => {
			const b = bilgi.get(d.id)!;
			if (b.zaman !== null) return;
			let once: number | null = null;
			for (let j = i - 1; j >= 0 && once === null; j--) once = z[j];
			let sonra: number | null = null;
			for (let j = i + 1; j < z.length && sonra === null; j++) sonra = z[j];
			// Hattın içindeki sırayı korumak için küçük bir kaydırma
			const kaydir = i * 1e-4;
			b.zaman =
				once !== null && sonra !== null
					? (once + sonra) / 2 + kaydir
					: once !== null
						? once + 0.01 + kaydir
						: sonra !== null
							? sonra - 0.01 + kaydir
							: enErken - 1 + kaydir;
			z[i] = b.zaman;
		});
	}

	const sirali = [...bilgi.entries()].sort(
		(a, b) => a[1].zaman! - b[1].zaman! || a[1].ilk - b[1].ilk
	);
	const { x: AX, y: AY, kenar, ust } = HAT_ARALIGI;
	const istasyonlar: Istasyon[] = sirali.map(([id, b], i) => {
		const seritler = [...b.hatlar];
		return {
			id,
			baslik: b.baslik,
			tur: b.tur,
			x: kenar + i * AX,
			y: ust + (seritler.reduce((t, s) => t + s, 0) / seritler.length) * AY,
			aktarma: seritler.length > 1,
			hatlar: seritler
		};
	});
	const konum = new Map(istasyonlar.map((s) => [s.id, s]));

	// Yıl işaretleri: her yılın ilk tarihli durağı
	const yillar: { yil: number; x: number }[] = [];
	for (const [id, b] of sirali) {
		const d = dolu.flatMap((h) => h.duraklar).find((x) => x.id === id);
		const yil = d?.tarih ? Number(d.tarih.slice(0, 4)) : null;
		if (yil !== null && !yillar.some((y) => y.yil === yil)) {
			yillar.push({ yil, x: konum.get(id)!.x });
		}
		void b;
	}

	return {
		istasyonlar,
		hatlar: dolu.map((h, i) => ({
			id: h.id,
			baslik: h.baslik,
			sira: i,
			noktalar: h.duraklar.map((d) => {
				const s = konum.get(d.id)!;
				return { id: d.id, x: s.x, y: s.y };
			})
		})),
		yillar,
		genislik: kenar * 2 + Math.max(0, istasyonlar.length - 1) * AX,
		yukseklik: ust + Math.max(0, dolu.length - 1) * AY + 70
	};
}
