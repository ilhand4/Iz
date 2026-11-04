// Haritanın karakterleri: graf üzerinde, insanın anlayacağı adlarla basit ölçüler.
// Saf fonksiyonlar; birim testleri analiz.test.ts'de.
import type { DugumTuru } from './sabitler';

export type AnalizDugumu = { id: string; baslik: string; tur: DugumTuru };
export type AnalizBagi = { kaynakId: string; hedefId: string };
export type Karakter = AnalizDugumu & { deger: number };

export type HaritaKarakterleri = {
	/** Hiçbir şeyin getirmediği ama bir yere götüren başlangıçlar; değer: açtığı kapı sayısı */
	kokler: Karakter[];
	/** Bağlar üzerinden en çok düğüme (dolaylı) ulaşanlar; değer: ulaşılan düğüm sayısı */
	kapiAcanlar: Karakter[];
	/** En az üç bağı olan ve farklı kümeleri birbirine bağlayanlar; değer: arasındalık */
	kavsaklar: Karakter[];
	/** Hiç bağı olmayan ve hiçbir izde durak olmayan düğümler */
	yetimler: AnalizDugumu[];
};

/** Bu düğüm sayısının üstünde pahalı ölçüler (erişim, arasındalık) hesaplanmaz */
export const ANALIZ_SINIRI = 2000;

function sirala(a: Karakter, b: Karakter) {
	return b.deger - a.deger || a.baslik.localeCompare(b.baslik, 'tr');
}

export function haritaKarakterleri(
	dugumler: AnalizDugumu[],
	baglar: AnalizBagi[],
	izdekiler: Set<string> = new Set(),
	{ enFazla = 3 } = {}
): HaritaKarakterleri {
	const cikis = new Map<string, string[]>();
	const giris = new Map<string, number>();
	const komsular = new Map<string, Set<string>>();
	for (const d of dugumler) {
		cikis.set(d.id, []);
		giris.set(d.id, 0);
		komsular.set(d.id, new Set());
	}
	for (const b of baglar) {
		if (!cikis.has(b.kaynakId) || !cikis.has(b.hedefId) || b.kaynakId === b.hedefId) continue;
		cikis.get(b.kaynakId)!.push(b.hedefId);
		giris.set(b.hedefId, giris.get(b.hedefId)! + 1);
		komsular.get(b.kaynakId)!.add(b.hedefId);
		komsular.get(b.hedefId)!.add(b.kaynakId);
	}

	const buyuk = dugumler.length > ANALIZ_SINIRI;
	const ulasilan = new Map<string, number>();
	for (const d of dugumler) {
		ulasilan.set(d.id, buyuk ? cikis.get(d.id)!.length : ulasilanSayisi(d.id, cikis));
	}

	const kokler = dugumler
		.filter((d) => giris.get(d.id) === 0 && cikis.get(d.id)!.length > 0)
		.map((d) => ({ ...d, deger: ulasilan.get(d.id)! }))
		.sort(sirala)
		.slice(0, enFazla);

	const kapiAcanlar = dugumler
		.map((d) => ({ ...d, deger: ulasilan.get(d.id)! }))
		.filter((k) => k.deger >= 2)
		.sort(sirala)
		.slice(0, enFazla);

	let kavsaklar: Karakter[] = [];
	if (!buyuk) {
		const ara = arasindalik(
			dugumler.map((d) => d.id),
			komsular
		);
		kavsaklar = dugumler
			.filter((d) => komsular.get(d.id)!.size >= 3 && (ara.get(d.id) ?? 0) > 0)
			.map((d) => ({ ...d, deger: Math.round(ara.get(d.id)! * 10) / 10 }))
			.sort(sirala)
			.slice(0, enFazla);
	}

	const yetimler = dugumler.filter((d) => komsular.get(d.id)!.size === 0 && !izdekiler.has(d.id));

	return { kokler, kapiAcanlar, kavsaklar, yetimler };
}

/** Bir düğümden bağlar boyunca ileri gidilerek ulaşılabilen düğüm sayısı (kendisi hariç) */
export function ulasilanSayisi(baslangic: string, cikis: Map<string, string[]>): number {
	const gorulen = new Set([baslangic]);
	const kuyruk = [baslangic];
	for (let i = 0; i < kuyruk.length; i++) {
		for (const sonraki of cikis.get(kuyruk[i]) ?? []) {
			if (!gorulen.has(sonraki)) {
				gorulen.add(sonraki);
				kuyruk.push(sonraki);
			}
		}
	}
	return gorulen.size - 1;
}

/**
 * Brandes algoritmasıyla yönsüz arasındalık merkeziliği: bir düğüm, diğer düğüm çiftleri
 * arasındaki en kısa yolların ne kadarının üzerinde? Yüksekse iki dünyayı birbirine bağlıyordur.
 */
export function arasindalik(idler: string[], komsular: Map<string, Set<string>>) {
	const merkezilik = new Map(idler.map((id) => [id, 0]));
	for (const s of idler) {
		const yigin: string[] = [];
		const onculler = new Map<string, string[]>(idler.map((id) => [id, []]));
		const yolSayisi = new Map<string, number>(idler.map((id) => [id, 0]));
		const uzaklik = new Map<string, number>(idler.map((id) => [id, -1]));
		yolSayisi.set(s, 1);
		uzaklik.set(s, 0);
		const kuyruk = [s];
		for (let i = 0; i < kuyruk.length; i++) {
			const v = kuyruk[i];
			yigin.push(v);
			for (const w of komsular.get(v) ?? []) {
				if (uzaklik.get(w)! < 0) {
					kuyruk.push(w);
					uzaklik.set(w, uzaklik.get(v)! + 1);
				}
				if (uzaklik.get(w) === uzaklik.get(v)! + 1) {
					yolSayisi.set(w, yolSayisi.get(w)! + yolSayisi.get(v)!);
					onculler.get(w)!.push(v);
				}
			}
		}
		const katki = new Map<string, number>(idler.map((id) => [id, 0]));
		while (yigin.length) {
			const w = yigin.pop()!;
			for (const v of onculler.get(w)!) {
				katki.set(v, katki.get(v)! + (yolSayisi.get(v)! / yolSayisi.get(w)!) * (1 + katki.get(w)!));
			}
			if (w !== s) merkezilik.set(w, merkezilik.get(w)! + katki.get(w)!);
		}
	}
	// Yönsüz grafta her çift iki kez sayılır
	for (const [id, deger] of merkezilik) merkezilik.set(id, deger / 2);
	return merkezilik;
}
