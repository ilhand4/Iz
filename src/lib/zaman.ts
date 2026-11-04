// Zaman çizgisi: düğümleri tarih hassasiyetine (yıl / ay / gün) saygı göstererek gruplar.
// Saf fonksiyon; birim testleri zaman.test.ts'de.
import type { DugumTuru, EserTuru, Gizlilik, TarihHassasiyeti } from './sabitler';

export type ZamanGirdisi = {
	id: string;
	tur: DugumTuru;
	eserTuru: EserTuru | null;
	baslik: string;
	altBaslik: string | null;
	gorselUrl: string | null;
	gizlilik: Gizlilik;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
};

export type ZamanOgesi = ZamanGirdisi & {
	/** Bu düğümün götürdüğü düğümler (zaman çizgisinde gezinmek için) */
	gidenler: { id: string; baslik: string }[];
};

export type AyGrubu = { ay: number; ogeler: ZamanOgesi[] };
export type YilGrubu = {
	yil: number;
	/** Yalnızca yılı bilinenler */
	yilBoyunca: ZamanOgesi[];
	aylar: AyGrubu[];
	sayi: number;
};
export type Yogunluk = { yil: number; sayi: number };

export type ZamanCizgisi = {
	yillar: YilGrubu[];
	tarihsiz: ZamanOgesi[];
	/** Yıllara göre düğüm sayısı (boş yıllar dahil; aralık çok genişse yalnızca dolu yıllar) */
	yogunluk: Yogunluk[];
};

const HASSASIYET_SIRASI: Record<TarihHassasiyeti, number> = { yil: 0, ay: 1, gun: 2 };
/** Boş yılları da göstermek için en geniş aralık */
export const EN_GENIS_ARALIK = 120;

/** Aynı tarihte, daha belirsiz olan (ör. "Mayıs 1998") daha kesin olandan ("12 Mayıs 1998") önce gelir */
function karsilastir(a: ZamanGirdisi, b: ZamanGirdisi): number {
	const t = (a.tarih ?? '').localeCompare(b.tarih ?? '');
	if (t !== 0) return t;
	const h =
		HASSASIYET_SIRASI[a.tarihHassasiyeti ?? 'gun'] - HASSASIYET_SIRASI[b.tarihHassasiyeti ?? 'gun'];
	if (h !== 0) return h;
	return a.baslik.localeCompare(b.baslik, 'tr');
}

export function zamanCizgisiKur(
	dugumler: ZamanGirdisi[],
	baglar: { kaynakId: string; hedefId: string }[],
	sira: 'eski' | 'yeni' = 'eski'
): ZamanCizgisi {
	const basliklar = new Map(dugumler.map((d) => [d.id, d.baslik]));
	const gidenler = new Map<string, { id: string; baslik: string }[]>();
	for (const b of baglar) {
		const hedef = basliklar.get(b.hedefId);
		if (hedef === undefined || !basliklar.has(b.kaynakId)) continue;
		const liste = gidenler.get(b.kaynakId) ?? [];
		liste.push({ id: b.hedefId, baslik: hedef });
		gidenler.set(b.kaynakId, liste);
	}
	const oge = (d: ZamanGirdisi): ZamanOgesi => ({ ...d, gidenler: gidenler.get(d.id) ?? [] });

	const tarihli = dugumler.filter((d) => d.tarih && d.tarihHassasiyeti).sort(karsilastir);
	const tarihsiz = dugumler
		.filter((d) => !d.tarih || !d.tarihHassasiyeti)
		.sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'))
		.map(oge);

	const yilHaritasi = new Map<number, YilGrubu>();
	for (const d of tarihli) {
		const yil = Number(d.tarih!.slice(0, 4));
		const grup = yilHaritasi.get(yil) ?? { yil, yilBoyunca: [], aylar: [], sayi: 0 };
		grup.sayi++;
		if (d.tarihHassasiyeti === 'yil') {
			grup.yilBoyunca.push(oge(d));
		} else {
			const ay = Number(d.tarih!.slice(5, 7));
			let ayGrubu = grup.aylar.find((a) => a.ay === ay);
			if (!ayGrubu) {
				ayGrubu = { ay, ogeler: [] };
				grup.aylar.push(ayGrubu);
			}
			ayGrubu.ogeler.push(oge(d));
		}
		yilHaritasi.set(yil, grup);
	}

	let yillar = [...yilHaritasi.values()].sort((a, b) => a.yil - b.yil);
	if (sira === 'yeni') {
		yillar = yillar.reverse().map((y) => ({
			...y,
			yilBoyunca: [...y.yilBoyunca].reverse(),
			aylar: [...y.aylar].reverse().map((a) => ({ ...a, ogeler: [...a.ogeler].reverse() }))
		}));
	}

	return { yillar, tarihsiz, yogunluk: yogunlukKur(yilHaritasi) };
}

function yogunlukKur(yilHaritasi: Map<number, YilGrubu>): Yogunluk[] {
	const doluYillar = [...yilHaritasi.keys()].sort((a, b) => a - b);
	if (!doluYillar.length) return [];
	const ilk = doluYillar[0];
	const son = doluYillar[doluYillar.length - 1];
	if (son - ilk > EN_GENIS_ARALIK) {
		return doluYillar.map((yil) => ({ yil, sayi: yilHaritasi.get(yil)!.sayi }));
	}
	const sonuc: Yogunluk[] = [];
	for (let yil = ilk; yil <= son; yil++) sonuc.push({ yil, sayi: yilHaritasi.get(yil)?.sayi ?? 0 });
	return sonuc;
}
