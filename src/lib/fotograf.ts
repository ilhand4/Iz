// "Bir zamanlar burası": eski ve yeni fotoğraflar. Sabitler ve etiketler (sunucu ve arayüz ortak).
import type { DugumTuru } from './sabitler';

/** Fotoğraf eklenebilen düğüm türleri */
export const FOTOGRAFLI_TURLER: readonly DugumTuru[] = ['yer', 'ani'];
export const DUGUM_BASINA_FOTO = 12;
export const EN_BUYUK_FOTO_MB = 15;

export const FOTO_DONEMLERI = ['eski', 'yeni'] as const;
export type FotoDonemi = (typeof FOTO_DONEMLERI)[number];
export const FOTO_DONEMI_ETIKETI: Record<FotoDonemi, string> = { eski: 'Eski', yeni: 'Yeni' };

export const FOTO_HAKLARI = ['kendi', 'aile', 'izinli', 'kamu'] as const;
export type FotoHakki = (typeof FOTO_HAKLARI)[number];
export const FOTO_HAKKI_ETIKETI: Record<FotoHakki, string> = {
	kendi: 'Kendim çektim',
	aile: 'Aile arşivimden',
	izinli: 'Sahibinin izniyle ya da açık lisanslı',
	kamu: 'Telif süresi dolmuş (kamu malı)'
};
/** Bu beyanlarda kaynağın yazılması zorunludur (kimin izni, hangi lisans, hangi arşiv) */
export const KAYNAK_GEREKEN_HAKLAR: readonly FotoHakki[] = ['izinli', 'kamu'];

export function fotoDonemiMi(x: unknown): x is FotoDonemi {
	return typeof x === 'string' && (FOTO_DONEMLERI as readonly string[]).includes(x);
}
export function fotoHakkiMi(x: unknown): x is FotoHakki {
	return typeof x === 'string' && (FOTO_HAKLARI as readonly string[]).includes(x);
}

/** Karşılaştırma için çift: en eski "eski" fotoğraf ile en yeni "yeni" fotoğraf */
export function karsilastirmaCifti<T extends { donem: string; yil: number | null }>(
	fotolar: T[]
): { eski: T; yeni: T } | null {
	const eskiler = fotolar.filter((f) => f.donem === 'eski');
	const yeniler = fotolar.filter((f) => f.donem === 'yeni');
	if (!eskiler.length || !yeniler.length) return null;
	const yila = (f: T, bos: number) => f.yil ?? bos;
	const eski = [...eskiler].sort((a, b) => yila(a, 9999) - yila(b, 9999))[0];
	const yeni = [...yeniler].sort((a, b) => yila(b, -1) - yila(a, -1))[0];
	return { eski, yeni };
}
