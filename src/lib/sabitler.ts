// Sunucu ve tarayıcı tarafında ortak kullanılan sabitler ve Türkçe etiketler.

export const DUGUM_TURLERI = ['eser', 'kisi', 'yer', 'karar', 'ani'] as const;
export const ESER_TURLERI = ['kitap', 'film', 'dizi', 'muzik', 'oyun', 'podcast'] as const;
/** ozel: yalnızca sahibi; grup: aile/grup üyeleri (gruplar gelene kadar yalnızca sahibi); herkes: herkese açık */
export const GIZLILIK_DUZEYLERI = ['ozel', 'grup', 'herkes'] as const;
export const TARIH_HASSASIYETLERI = ['gun', 'ay', 'yil'] as const;

export type DugumTuru = (typeof DUGUM_TURLERI)[number];
export type EserTuru = (typeof ESER_TURLERI)[number];
export type Gizlilik = (typeof GIZLILIK_DUZEYLERI)[number];
export type TarihHassasiyeti = (typeof TARIH_HASSASIYETLERI)[number];

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
	grup: 'Aile / grup',
	herkes: 'Herkese açık'
};

export const GIZLILIK_ACIKLAMASI: Record<Gizlilik, string> = {
	ozel: 'Yalnızca sen görürsün.',
	grup: 'Aile ve grupların görür (gruplar yakında; şimdilik yalnızca sen).',
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
