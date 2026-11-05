// Karar Defteri: güven ↔ gerçekleşme kalibrasyonu. Saf fonksiyonlar (birim testleri
// kararDefteri.test.ts). "Kısmen" yarım gerçekleşme sayılır.

export const KARAR_SONUCLARI = ['gerceklesti', 'kismen', 'gerceklesmedi'] as const;
export type KararSonucu = (typeof KARAR_SONUCLARI)[number];
export const KARAR_SONUCU_ETIKETI: Record<KararSonucu, string> = {
	gerceklesti: 'Beklediğim gibi oldu',
	kismen: 'Kısmen',
	gerceklesmedi: 'Beklediğim gibi olmadı'
};
export function kararSonucuMu(d: unknown): d is KararSonucu {
	return typeof d === 'string' && (KARAR_SONUCLARI as readonly string[]).includes(d);
}

const DEGER: Record<KararSonucu, number> = { gerceklesti: 1, kismen: 0.5, gerceklesmedi: 0 };

export type SonuclanmisKarar = { guven: number; sonuc: KararSonucu };

export type KalibrasyonDilimi = {
	/** Dilimin alt ve üst sınırı (%), ör. 60–70 */
	alt: number;
	ust: number;
	sayi: number;
	/** Dilimdeki kararların ortalama güveni (%) */
	ortalamaGuven: number;
	/** Gerçekleşme oranı (%) */
	gerceklesme: number;
};

/**
 * Kararları güvenlerine göre 10'luk dilimlere ayırır (50 altı tek dilim: "yazı tura altı").
 * İyi kalibre biri için her dilimde gerçekleşme ≈ ortalama güven.
 */
export function kalibrasyon(kararlar: SonuclanmisKarar[]): KalibrasyonDilimi[] {
	const dilimler = new Map<number, SonuclanmisKarar[]>();
	for (const k of kararlar) {
		const g = Math.max(0, Math.min(100, k.guven));
		const alt = g < 50 ? 0 : Math.min(90, Math.floor(g / 10) * 10);
		dilimler.set(alt, [...(dilimler.get(alt) ?? []), k]);
	}
	return [...dilimler.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([alt, liste]) => ({
			alt,
			ust: alt === 0 ? 50 : alt + 10,
			sayi: liste.length,
			ortalamaGuven: Math.round(liste.reduce((t, k) => t + k.guven, 0) / liste.length),
			gerceklesme: Math.round((liste.reduce((t, k) => t + DEGER[k.sonuc], 0) / liste.length) * 100)
		}));
}

/** Brier puanı (0 kusursuz, 0,25 yazı tura): ortalama (güven − sonuç)² */
export function brierPuani(kararlar: SonuclanmisKarar[]): number | null {
	if (!kararlar.length) return null;
	const toplam = kararlar.reduce((t, k) => t + (k.guven / 100 - DEGER[k.sonuc]) ** 2, 0);
	return Math.round((toplam / kararlar.length) * 1000) / 1000;
}

/** Brier puanının insan diliyle yorumu */
export function brierYorumu(puan: number | null): string {
	if (puan === null) return 'Henüz sonuçlanmış karar yok.';
	if (puan <= 0.1) return 'Çok iyi kalibre: güvenin gerçekleşenle uyumlu.';
	if (puan <= 0.2) return 'İyi: tahminlerin yazı turadan belirgin biçimde iyi.';
	if (puan <= 0.25) return 'Yazı turaya yakın: güvenini gözden geçirebilirsin.';
	return 'Güvenin sonuçlardan sapıyor: belki fazla eminsin.';
}
