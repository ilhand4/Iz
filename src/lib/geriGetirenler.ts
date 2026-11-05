// Haritayı geriye doğru büyüten küçük sorular: bağ avı, günün sorusu, bugün geçmişte ve
// İz Yıllığı hesapları. Saf fonksiyonlar; birim testleri geriGetirenler.test.ts'de.
import { sadelestir } from './metin';
import type { DugumTuru } from './sabitler';

export type YalinDugum = {
	id: string;
	baslik: string;
	altBaslik: string | null;
	tur: DugumTuru;
	tarih: string | null;
	tarihHassasiyeti?: string | null;
};
export type YalinBag = { kaynakId: string; hedefId: string };

export type BagAviSorusu = {
	kaynak: YalinDugum;
	hedef: YalinDugum;
	/** Neden soruluyor: aynı yazar/sanatçı ya da hemen öncesi */
	gerekce: 'ayni-yapimci' | 'hemen-oncesi';
};

const ALTI_AY_MS = 183 * 24 * 60 * 60 * 1000;
const zaman = (t: string) => new Date(`${t}T00:00:00Z`).getTime();

/**
 * Bağ avı: gelen bağı olmayan bir düğüm için olası bir "buradan geldin" kaynağı önerir.
 * Önce aynı yazar/sanatçı (alt başlık), sonra kendinden en çok altı ay önceki düğüm.
 * Reddedilen çiftler ve var olan bağlar tekrar sorulmaz. Yeniden eskiye doğru tarar.
 */
export function bagAviAdayi(
	dugumler: YalinDugum[],
	baglar: YalinBag[],
	redler: YalinBag[]
): BagAviSorusu | null {
	const gelen = new Set(baglar.map((b) => b.hedefId));
	const var_ = new Set([...baglar, ...redler].map((b) => `${b.kaynakId}>${b.hedefId}`));
	const hedefler = dugumler
		.filter((d) => !gelen.has(d.id))
		.sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? ''));
	for (const hedef of hedefler) {
		const uygun = (k: YalinDugum) => k.id !== hedef.id && !var_.has(`${k.id}>${hedef.id}`);
		const oncesi = (k: YalinDugum) => !hedef.tarih || !k.tarih || k.tarih <= hedef.tarih;
		if (hedef.altBaslik) {
			const yapimci = sadelestir(hedef.altBaslik);
			const ayni = dugumler
				.filter((k) => uygun(k) && oncesi(k) && k.altBaslik && sadelestir(k.altBaslik) === yapimci)
				.sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? ''))[0];
			if (ayni) return { kaynak: ayni, hedef, gerekce: 'ayni-yapimci' };
		}
		if (hedef.tarih) {
			const h = zaman(hedef.tarih);
			const yakin = dugumler
				.filter(
					(k) => uygun(k) && k.tarih && zaman(k.tarih) < h && h - zaman(k.tarih) <= ALTI_AY_MS
				)
				.sort((a, b) => b.tarih!.localeCompare(a.tarih!))[0];
			if (yakin) return { kaynak: yakin, hedef, gerekce: 'hemen-oncesi' };
		}
	}
	return null;
}

/** Günün sorusu yalnızca pazartesi, çarşamba ve cuma (haftada birkaç kez, bunaltmadan) */
export function soruGunuMu(gun: Date): boolean {
	const g = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Istanbul',
		weekday: 'short'
	}).format(gun);
	return g === 'Mon' || g === 'Wed' || g === 'Fri';
}

/** Gün için sabit bir seçim (aynı gün hep aynı soru) */
export function gununSecimi<T>(adaylar: T[], gun: string): T | null {
	if (!adaylar.length) return null;
	let h = 2166136261;
	for (const c of gun) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return adaylar[(h >>> 0) % adaylar.length];
}

// ——— İz Yıllığı ———

export type Yillik = {
	yil: number;
	toplam: number;
	turler: Partial<Record<DugumTuru, number>>;
	/** Bu yılın düğümlerinden en çok yere götüren (yıl içi bağlar, dolaylı dahil) */
	enCokGoturen: (YalinDugum & { ulasilan: number }) | null;
	/** Yıl içindeki en uzun "götürdü" zinciri */
	enUzunZincir: YalinDugum[];
	/** Yıl içinde oluşan bağlantılı kümeler (en az 3 düğüm) */
	kumeler: YalinDugum[][];
	/** Önceki yılların düğümlerinden bu yıla uzanan bağ sayısı ("geçmişten gelenler") */
	gecmistenGelen: number;
};

export function yillikKur(yil: number, dugumler: YalinDugum[], baglar: YalinBag[]): Yillik {
	const bu = dugumler.filter((d) => d.tarih?.startsWith(`${yil}-`));
	const ids = new Set(bu.map((d) => d.id));
	const harita = new Map(dugumler.map((d) => [d.id, d]));
	const ic = baglar.filter((b) => ids.has(b.kaynakId) && ids.has(b.hedefId));
	const cikis = new Map<string, string[]>();
	for (const b of ic) cikis.set(b.kaynakId, [...(cikis.get(b.kaynakId) ?? []), b.hedefId]);

	const turler: Partial<Record<DugumTuru, number>> = {};
	for (const d of bu) turler[d.tur] = (turler[d.tur] ?? 0) + 1;

	// Ulaşılan sayısı (BFS)
	let enCok: (YalinDugum & { ulasilan: number }) | null = null;
	for (const d of bu) {
		const gorulen = new Set([d.id]);
		const kuyruk = [d.id];
		while (kuyruk.length) {
			for (const h of cikis.get(kuyruk.shift()!) ?? []) {
				if (!gorulen.has(h)) {
					gorulen.add(h);
					kuyruk.push(h);
				}
			}
		}
		const ulasilan = gorulen.size - 1;
		if (ulasilan > 0 && (!enCok || ulasilan > enCok.ulasilan)) enCok = { ...d, ulasilan };
	}

	// En uzun zincir: döngüye girmeyen en uzun yol (DFS, küçük haritalar için yeterli)
	let enUzun: string[] = [];
	const dfs = (id: string, yol: string[], ziyaret: Set<string>) => {
		if (yol.length > enUzun.length) enUzun = [...yol];
		if (yol.length >= 25) return;
		for (const h of cikis.get(id) ?? []) {
			if (ziyaret.has(h)) continue;
			ziyaret.add(h);
			yol.push(h);
			dfs(h, yol, ziyaret);
			yol.pop();
			ziyaret.delete(h);
		}
	};
	if (bu.length <= 300) for (const d of bu) dfs(d.id, [d.id], new Set([d.id]));

	// Kümeler: yönsüz bağlı bileşenler
	const komsu = new Map<string, string[]>();
	for (const b of ic) {
		komsu.set(b.kaynakId, [...(komsu.get(b.kaynakId) ?? []), b.hedefId]);
		komsu.set(b.hedefId, [...(komsu.get(b.hedefId) ?? []), b.kaynakId]);
	}
	const atanan = new Set<string>();
	const kumeler: YalinDugum[][] = [];
	for (const d of bu) {
		if (atanan.has(d.id)) continue;
		const kume: string[] = [];
		const yigin = [d.id];
		atanan.add(d.id);
		while (yigin.length) {
			const x = yigin.pop()!;
			kume.push(x);
			for (const k of komsu.get(x) ?? []) {
				if (!atanan.has(k)) {
					atanan.add(k);
					yigin.push(k);
				}
			}
		}
		if (kume.length >= 3) kumeler.push(kume.map((i) => harita.get(i)!));
	}
	kumeler.sort((a, b) => b.length - a.length);

	const gecmistenGelen = baglar.filter((b) => {
		const k = harita.get(b.kaynakId);
		return ids.has(b.hedefId) && k?.tarih && Number(k.tarih.slice(0, 4)) < yil;
	}).length;

	return {
		yil,
		toplam: bu.length,
		turler,
		enCokGoturen: enCok,
		enUzunZincir: enUzun.length > 1 ? enUzun.map((i) => harita.get(i)!) : [],
		kumeler: kumeler.slice(0, 5),
		gecmistenGelen
	};
}
