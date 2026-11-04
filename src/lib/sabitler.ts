// Sunucu ve tarayıcı tarafında ortak kullanılan sabitler ve Türkçe etiketler.

export const DUGUM_TURLERI = ['eser', 'kisi', 'yer', 'karar', 'ani'] as const;
export const ESER_TURLERI = ['kitap', 'film', 'dizi', 'muzik', 'oyun', 'podcast'] as const;
/** ozel: yalnızca sahibi; grup: sahiple en az bir ortak grubu olanlar; herkes: herkese açık */
export const GIZLILIK_DUZEYLERI = ['ozel', 'grup', 'herkes'] as const;
export const TARIH_HASSASIYETLERI = ['gun', 'ay', 'yil'] as const;
/** Yalnızca eserler için: merak listesi ve okuma/izleme durumu */
export const ESER_DURUMLARI = ['merak', 'suruyor', 'bitti', 'yarim'] as const;

export type DugumTuru = (typeof DUGUM_TURLERI)[number];
export type EserTuru = (typeof ESER_TURLERI)[number];
export type Gizlilik = (typeof GIZLILIK_DUZEYLERI)[number];
export type TarihHassasiyeti = (typeof TARIH_HASSASIYETLERI)[number];
export type EserDurumu = (typeof ESER_DURUMLARI)[number];

/** Durum etiketleri eser türüne göre fiil alır: "Okuyorum", "İzledim", "Dinliyorum"… */
const FIILLER: Record<EserTuru, { suruyor: string; bitti: string }> = {
	kitap: { suruyor: 'Okuyorum', bitti: 'Okudum' },
	film: { suruyor: 'İzliyorum', bitti: 'İzledim' },
	dizi: { suruyor: 'İzliyorum', bitti: 'İzledim' },
	muzik: { suruyor: 'Dinliyorum', bitti: 'Dinledim' },
	oyun: { suruyor: 'Oynuyorum', bitti: 'Oynadım' },
	podcast: { suruyor: 'Dinliyorum', bitti: 'Dinledim' }
};

export function durumEtiketi(durum: EserDurumu, eserTuru: EserTuru | null): string {
	if (durum === 'merak') return 'Merak ediyorum';
	if (durum === 'yarim') return 'Yarım bıraktım';
	const fiil = eserTuru ? FIILLER[eserTuru] : null;
	if (durum === 'suruyor') return fiil?.suruyor ?? 'Sürüyor';
	return fiil?.bitti ?? 'Bitti';
}

export function eserDurumuMu(deger: unknown): deger is EserDurumu {
	return typeof deger === 'string' && (ESER_DURUMLARI as readonly string[]).includes(deger);
}

/** Çöp kutusundaki öğeler bu kadar gün sonra kalıcı olarak silinir */
export const COP_KUTUSU_GUN = 30;

export const DUGUM_TURU_ETIKETI: Record<DugumTuru, string> = {
	eser: 'Eser',
	kisi: 'Kişi',
	yer: 'Yer',
	karar: 'Karar',
	ani: 'Anı'
};

export const DUGUM_TURU_COGUL: Record<DugumTuru, string> = {
	eser: 'Eserler',
	kisi: 'Kişiler',
	yer: 'Yerler',
	karar: 'Kararlar',
	ani: 'Anılar'
};

export const ESER_TURU_ETIKETI: Record<EserTuru, string> = {
	kitap: 'Kitap',
	film: 'Film',
	dizi: 'Dizi',
	muzik: 'Müzik',
	oyun: 'Oyun',
	podcast: 'Podcast'
};

export const GIZLILIK_ETIKETI: Record<Gizlilik, string> = {
	ozel: 'Özel',
	grup: 'Gruplarım',
	herkes: 'Herkese açık'
};

export const GIZLILIK_ACIKLAMASI: Record<Gizlilik, string> = {
	ozel: 'Yalnızca sen görürsün.',
	grup: 'Üye olduğun gruplardaki herkes görür (aile, arkadaşlar, kulüp…).',
	herkes: 'Bağlantıyı bilen herkes görebilir.'
};

export function dugumTuruMu(deger: unknown): deger is DugumTuru {
	return typeof deger === 'string' && (DUGUM_TURLERI as readonly string[]).includes(deger);
}

export function eserTuruMu(deger: unknown): deger is EserTuru {
	return typeof deger === 'string' && (ESER_TURLERI as readonly string[]).includes(deger);
}

export function gizlilikMi(deger: unknown): deger is Gizlilik {
	return typeof deger === 'string' && (GIZLILIK_DUZEYLERI as readonly string[]).includes(deger);
}
