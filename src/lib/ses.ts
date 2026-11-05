// Sesli anılar: sabitler ve dosya türü tanıma (saf; birim testleri ses.test.ts).
import type { DugumTuru } from './sabitler';

/** Ses eklenebilen düğüm türleri: anı, yakının sesi (kişi), bir yerin hikâyesi */
export const SESLI_TURLER: readonly DugumTuru[] = ['ani', 'kisi', 'yer'];
export const EN_BUYUK_SES_MB = 25;
/** Yazıya dökülen en uzun süre (dakika); daha uzun kayıtların başı dökülür */
export const EN_UZUN_DAKIKA = 30;
export const DUGUM_BASINA_SES = 10;

export const SES_DURUMLARI = ['bekliyor', 'isleniyor', 'tamam', 'hata', 'kapali'] as const;
export type SesDurumu = (typeof SES_DURUMLARI)[number];
export const SES_DURUMU_ETIKETI: Record<SesDurumu, string> = {
	bekliyor: 'Yazıya dökülmeyi bekliyor',
	isleniyor: 'Yazıya dökülüyor…',
	tamam: 'Yazıya döküldü',
	hata: 'Yazıya dökülemedi',
	kapali: 'Yazıya dökme kapalı'
};

const UZANTI_MIME: Record<string, string> = {
	webm: 'audio/webm',
	ogg: 'audio/ogg',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	m4a: 'audio/mp4',
	flac: 'audio/flac'
};
export const sesMime = (uzanti: string) => UZANTI_MIME[uzanti] ?? 'application/octet-stream';

const ascii = (b: Uint8Array, bas: number, uzunluk: number) =>
	String.fromCharCode(...b.subarray(bas, bas + uzunluk));

/**
 * Dosyanın gerçek türü baytlarından anlaşılır (adı ve tarayıcının söylediği tür güvenilmez).
 * Tanınmayan biçim null.
 */
export function sesTuru(b: Uint8Array): string | null {
	if (b.length < 12) return null;
	if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
	if (ascii(b, 0, 4) === 'OggS') return 'ogg';
	if (ascii(b, 0, 4) === 'fLaC') return 'flac';
	if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE') return 'wav';
	if (ascii(b, 4, 4) === 'ftyp') return 'm4a';
	if (ascii(b, 0, 3) === 'ID3') return 'mp3';
	if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'mp3';
	return null;
}

/** "1:05", "12:30" */
export function sureYaz(saniye: number) {
	const dk = Math.floor(saniye / 60);
	const sn = Math.round(saniye % 60);
	return `${dk}:${String(sn).padStart(2, '0')}`;
}

/**
 * Whisper sessiz ya da müzikli bölümlerde altyazı jeneriklerinden öğrendiği kalıpları "duyar"
 * ("Altyazı M.K.", "İzlediğiniz için teşekkürler"). Bu cümleler metinden atılır.
 */
const HALUSINASYON =
	/^(alt ?yaz[ıi]\s*:?\s*[\p{Lu}.\s]{0,16}|[iİ]zlediğiniz için teşekkür.*|abone olmayı unutmayın.*|bir sonraki videoda görüşmek üzere.*|♪+)$/iu;

export function halusinasyonuAyikla(metin: string) {
	return metin
		.replace(/\[[^\]]*\]|\((?:müzik|alkış|gülüşmeler|sessizlik)[^)]*\)|♪/giu, ' ')
		.split(/(?<=[.!?…])\s+/)
		.map((c) => c.trim())
		.filter((c) => c && !HALUSINASYON.test(c))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}
