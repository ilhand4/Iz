// Çeviri Masası: telif kuralları ve çeviriler arası sözcük farkı (saf; birim testleri ceviri.test.ts).
// Kullanıcı kararı (Kasım 2026): "kısa alıntı + beyan". Her çeviri en çok 600 karakter, kaynağı
// (çevirmen) zorunlu ve bir dayanağı var; telifli (alıntı dayanaklı) çeviri içeren paragraf sayısı
// masa başına en çok 5. Masalar varsayılan olarak özel.
import { sadelestir } from './metin';

export const CEVIRI_EN_UZUN = 600;
export const OZGUN_EN_UZUN = 1500;
/** Alıntı dayanaklı çeviri içerebilecek en çok paragraf sayısı (masa başına) */
export const ALINTI_PARAGRAF_SINIRI = 5;
export const PARAGRAF_BASINA_CEVIRI = 8;

export const DAYANAKLAR = ['kamu', 'izinli', 'alinti'] as const;
export type Dayanak = (typeof DAYANAKLAR)[number];
export const DAYANAK_ETIKETI: Record<Dayanak, string> = {
	kamu: 'Telif süresi dolmuş',
	izinli: 'Hak sahibinin izniyle',
	alinti: 'İnceleme amaçlı kısa alıntı'
};
export function dayanakMi(x: unknown): x is Dayanak {
	return typeof x === 'string' && (DAYANAKLAR as readonly string[]).includes(x);
}

export type Parca = { metin: string; farkli: boolean };

const sozcukle = (metin: string) => metin.split(/(\s+)/).filter((p) => p !== '');

/**
 * `metin`i sözcüklerine böler ve `diger`de (aynı sırada) karşılığı olmayan sözcükleri "farklı"
 * işaretler. En uzun ortak alt dizi (LCS), Türkçe sadeleştirmeyle ve noktalamasız karşılaştırılır.
 * Boşluklar korunur ki metin aynen yeniden kurulabilsin.
 */
export function sozcukFarki(metin: string, diger: string): Parca[] {
	const a = sozcukle(metin);
	const b = sozcukle(diger).filter((p) => !/^\s+$/.test(p));
	const anahtar = (s: string) => sadelestir(s).replace(/[^\p{L}\p{N}]/gu, '');
	const ak = a.map((p) => (/^\s+$/.test(p) ? null : anahtar(p)));
	const bk = b.map(anahtar);
	const sozA = ak.map((k, i) => [k, i] as const).filter(([k]) => k !== null) as [string, number][];
	const n = sozA.length;
	const m = bk.length;
	// Çok uzun metinlerde (sınır 600 karakter olduğu için olmamalı) farkı hesaplama
	if (n * m > 250_000) return a.map((p) => ({ metin: p, farkli: false }));
	const t: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			t[i][j] = sozA[i][0] === bk[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
	const ortak = new Set<number>();
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (sozA[i][0] === bk[j]) {
			ortak.add(sozA[i][1]);
			i++;
			j++;
		} else if (t[i + 1][j] >= t[i][j + 1]) i++;
		else j++;
	}
	return a.map((p, k) => ({
		metin: p,
		farkli: ak[k] !== null && ak[k] !== '' && !ortak.has(k)
	}));
}

/** İki çevirinin sözcük düzeyinde benzerliği (0–1): masada "en farklı" çiftleri göstermek için */
export function benzerlik(a: string, b: string) {
	const p = sozcukFarki(a, b).filter((x) => !/^\s+$/.test(x.metin));
	if (!p.length) return 1;
	return p.filter((x) => !x.farkli).length / p.length;
}
