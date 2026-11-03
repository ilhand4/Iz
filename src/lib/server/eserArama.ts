// Dış kaynaklardan eser arama: kitaplar Open Library, film/dizi TMDB.
// Ağ çağrıları sunucuda yapılır; TMDB anahtarı tarayıcıya hiç gitmez.
import type { EserTuru } from '../sabitler';

export type EserSonucu = {
	kaynak: 'openlibrary' | 'tmdb';
	disKimlik: string;
	eserTuru: EserTuru;
	baslik: string;
	altBaslik: string | null;
	yil: number | null;
	gorselUrl: string | null;
	ozet: string | null;
};

export const ARAMA_TURLERI = ['kitap', 'film', 'dizi'] as const;
export type AramaTuru = (typeof ARAMA_TURLERI)[number];

/** Kaydedilmesine izin verilen kapak görseli adresleri (CSP ile aynı liste) */
export const GORSEL_ONEKLERI = ['https://covers.openlibrary.org/', 'https://image.tmdb.org/'];

export function gorselGuvenliMi(url: string | null | undefined): boolean {
	return !!url && GORSEL_ONEKLERI.some((onek) => url.startsWith(onek)) && !/[\s"'<>]/.test(url);
}

/** Dış kimlik biçimleri: Open Library "OL123W", TMDB "movie/603" ya da "tv/1399" */
export function disKimlikGecerliMi(kaynak: string, kimlik: string): boolean {
	if (kaynak === 'openlibrary') return /^OL\d{1,12}W$/.test(kimlik);
	if (kaynak === 'tmdb') return /^(movie|tv)\/\d{1,10}$/.test(kimlik);
	return false;
}

function kirp(metin: unknown, uzunluk: number): string | null {
	if (typeof metin !== 'string') return null;
	const t = metin.trim();
	if (!t) return null;
	return t.length > uzunluk ? t.slice(0, uzunluk - 1) + '…' : t;
}

function yilAl(deger: unknown): number | null {
	if (typeof deger === 'number' && Number.isInteger(deger)) return deger;
	if (typeof deger === 'string' && /^\d{4}/.test(deger)) return Number(deger.slice(0, 4));
	return null;
}

// ——— Open Library ———

type OpenLibraryBelgesi = {
	key?: string;
	title?: string;
	author_name?: string[];
	first_publish_year?: number;
	cover_i?: number;
};

export function openLibrarySonucuCevir(belge: OpenLibraryBelgesi): EserSonucu | null {
	const kimlik = belge.key?.replace(/^\/works\//, '');
	const baslik = kirp(belge.title, 200);
	if (!kimlik || !baslik || !disKimlikGecerliMi('openlibrary', kimlik)) return null;
	return {
		kaynak: 'openlibrary',
		disKimlik: kimlik,
		eserTuru: 'kitap',
		baslik,
		altBaslik: kirp(belge.author_name?.slice(0, 3).join(', '), 200),
		yil: yilAl(belge.first_publish_year),
		gorselUrl: belge.cover_i ? `https://covers.openlibrary.org/b/id/${belge.cover_i}-M.jpg` : null,
		ozet: null
	};
}

// ——— TMDB ———

type TmdbOgesi = {
	id?: number;
	title?: string;
	name?: string;
	original_title?: string;
	original_name?: string;
	release_date?: string;
	first_air_date?: string;
	poster_path?: string | null;
	overview?: string;
};

export function tmdbSonucuCevir(oge: TmdbOgesi, tur: 'film' | 'dizi'): EserSonucu | null {
	if (!Number.isInteger(oge.id)) return null;
	const baslik = kirp(tur === 'film' ? oge.title : oge.name, 200);
	if (!baslik) return null;
	const ozgun = kirp(tur === 'film' ? oge.original_title : oge.original_name, 200);
	const poster =
		oge.poster_path && /^\/[\w.-]+$/.test(oge.poster_path)
			? `https://image.tmdb.org/t/p/w185${oge.poster_path}`
			: null;
	return {
		kaynak: 'tmdb',
		disKimlik: `${tur === 'film' ? 'movie' : 'tv'}/${oge.id}`,
		eserTuru: tur,
		baslik,
		altBaslik: ozgun && ozgun !== baslik ? ozgun : null,
		yil: yilAl(tur === 'film' ? oge.release_date : oge.first_air_date),
		gorselUrl: poster,
		ozet: kirp(oge.overview, 400)
	};
}

// ——— Ağ çağrıları ———

export class AramaHatasi extends Error {}

const ZAMAN_ASIMI_MS = 8000;
const onbellek = new Map<string, { zaman: number; sonuclar: EserSonucu[] }>();
const ONBELLEK_SURESI_MS = 10 * 60_000;

async function jsonGetir(url: string, basliklar: Record<string, string> = {}): Promise<unknown> {
	let yanit: Response;
	try {
		yanit = await fetch(url, {
			headers: { Accept: 'application/json', 'User-Agent': 'Iz/0.1 (kisisel proje)', ...basliklar },
			signal: AbortSignal.timeout(ZAMAN_ASIMI_MS)
		});
	} catch {
		throw new AramaHatasi('Arama hizmetine ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
	}
	if (yanit.status === 401) throw new AramaHatasi('TMDB anahtarı geçersiz görünüyor. .env dosyasını kontrol edin.');
	if (yanit.status === 429) throw new AramaHatasi('Arama hizmeti şu an yoğun. Biraz sonra tekrar deneyin.');
	if (!yanit.ok) throw new AramaHatasi(`Arama hizmeti hata verdi (${yanit.status}).`);
	return yanit.json();
}

async function onbellekli(anahtar: string, getir: () => Promise<EserSonucu[]>) {
	const kayit = onbellek.get(anahtar);
	if (kayit && Date.now() - kayit.zaman < ONBELLEK_SURESI_MS) return kayit.sonuclar;
	const sonuclar = await getir();
	if (onbellek.size > 500) onbellek.clear();
	onbellek.set(anahtar, { zaman: Date.now(), sonuclar });
	return sonuclar;
}

export function kitapAra(sorgu: string): Promise<EserSonucu[]> {
	return onbellekli(`kitap:${sorgu}`, async () => {
		const url = new URL('https://openlibrary.org/search.json');
		url.searchParams.set('q', sorgu);
		url.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i');
		url.searchParams.set('limit', '12');
		const veri = (await jsonGetir(url.href)) as { docs?: OpenLibraryBelgesi[] };
		return (veri.docs ?? []).map(openLibrarySonucuCevir).filter((s) => s !== null);
	});
}

export function tmdbAra(sorgu: string, tur: 'film' | 'dizi', anahtar: string): Promise<EserSonucu[]> {
	return onbellekli(`${tur}:${sorgu}`, async () => {
		const url = new URL(`https://api.themoviedb.org/3/search/${tur === 'film' ? 'movie' : 'tv'}`);
		url.searchParams.set('query', sorgu);
		url.searchParams.set('language', 'tr-TR');
		url.searchParams.set('include_adult', 'false');
		const basliklar: Record<string, string> = {};
		// v4 okuma jetonu (JWT) Authorization başlığıyla, v3 anahtarı adres parametresiyle gider
		if (anahtar.startsWith('eyJ')) basliklar.Authorization = `Bearer ${anahtar}`;
		else url.searchParams.set('api_key', anahtar);
		const veri = (await jsonGetir(url.href, basliklar)) as { results?: TmdbOgesi[] };
		return (veri.results ?? [])
			.slice(0, 12)
			.map((oge) => tmdbSonucuCevir(oge, tur))
			.filter((s) => s !== null);
	});
}
