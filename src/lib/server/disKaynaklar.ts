// Başka uygulamalardan içe aktarma: Goodreads ve Letterboxd dışa aktarma dosyaları (CSV),
// Spotify dinleme geçmişi (JSON) ve Kindle alıntıları (My Clippings.txt). Saf ayrıştırıcılar;
// hepsi ortak bir "aday eser" biçimine dönüşür. Birim testleri disKaynaklar.test.ts'de.
import type { EserDurumu, EserTuru, TarihHassasiyeti } from '../sabitler';

export type AdayEser = {
	eserTuru: EserTuru;
	baslik: string;
	altBaslik: string | null;
	yil: number | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
	durum: EserDurumu | null;
	alintilar: { metin: string; yer: string | null }[];
};

export const KAYNAKLAR = ['goodreads', 'letterboxd', 'spotify', 'kindle'] as const;
export type DisKaynak = (typeof KAYNAKLAR)[number];
export const KAYNAK_ADI: Record<DisKaynak, string> = {
	goodreads: 'Goodreads (CSV)',
	letterboxd: 'Letterboxd (CSV)',
	spotify: 'Spotify dinleme geçmişi (JSON)',
	kindle: 'Kindle alıntıları (My Clippings.txt)'
};
export const EN_FAZLA_ADAY = 2000;

/** Dosya başındaki bayt sırası işaretini (BOM, U+FEFF) atar */
const BOM = String.fromCharCode(0xfeff);
function bomAt(metin: string) {
	return metin.startsWith(BOM) ? metin.slice(1) : metin;
}

/** RFC 4180 CSV: tırnaklı alanlar, kaçırılmış tırnaklar ve alan içi satır sonları */
export function csvOku(metin: string): Record<string, string>[] {
	const satirlar: string[][] = [];
	let alan = '';
	let satir: string[] = [];
	let tirnak = false;
	const t = bomAt(metin);
	for (let i = 0; i < t.length; i++) {
		const c = t[i];
		if (tirnak) {
			if (c === '"' && t[i + 1] === '"') {
				alan += '"';
				i++;
			} else if (c === '"') tirnak = false;
			else alan += c;
		} else if (c === '"') tirnak = true;
		else if (c === ',') {
			satir.push(alan);
			alan = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && t[i + 1] === '\n') i++;
			satir.push(alan);
			alan = '';
			if (satir.some((x) => x !== '')) satirlar.push(satir);
			satir = [];
		} else alan += c;
	}
	if (alan !== '' || satir.length) {
		satir.push(alan);
		if (satir.some((x) => x !== '')) satirlar.push(satir);
	}
	const [baslik, ...govde] = satirlar;
	if (!baslik) return [];
	return govde.map((s) =>
		Object.fromEntries(baslik.map((b, i) => [b.trim(), (s[i] ?? '').trim()]))
	);
}

function kirp(s: string | undefined, n: number) {
	const t = (s ?? '').trim();
	return t ? t.slice(0, n) : null;
}

function yilAl(s: string | undefined): number | null {
	const y = Number.parseInt(s ?? '', 10);
	return Number.isInteger(y) && y > 0 && y < 3000 ? y : null;
}

/** "2021/03/14", "2021-03-14" → gün hassasiyetli tarih */
function gunAl(s: string | undefined): { tarih: string; tarihHassasiyeti: 'gun' } | null {
	const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec((s ?? '').trim());
	if (!m) return null;
	const tarih = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
	const d = new Date(`${tarih}T00:00:00Z`);
	if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tarih) return null;
	return { tarih, tarihHassasiyeti: 'gun' };
}

/** Goodreads: Title, Author, Year Published / Original Publication Year, Date Read, Exclusive Shelf */
export function goodreadsOku(metin: string): AdayEser[] {
	return csvOku(metin)
		.map((r): AdayEser | null => {
			const baslik = kirp(r['Title'], 200);
			if (!baslik) return null;
			const raf = (r['Exclusive Shelf'] ?? '').toLowerCase();
			const okundu = gunAl(r['Date Read']);
			return {
				eserTuru: 'kitap',
				baslik,
				altBaslik: kirp(r['Author'], 200),
				yil: yilAl(r['Original Publication Year']) ?? yilAl(r['Year Published']),
				tarih: okundu?.tarih ?? null,
				tarihHassasiyeti: okundu?.tarihHassasiyeti ?? null,
				durum: raf === 'to-read' ? 'merak' : raf === 'currently-reading' ? 'suruyor' : 'bitti',
				alintilar: []
			};
		})
		.filter((x): x is AdayEser => x !== null);
}

/** Letterboxd: watched.csv / diary.csv (Name, Year, Date / Watched Date), watchlist.csv */
export function letterboxdOku(metin: string, izlemeListesi = false): AdayEser[] {
	return csvOku(metin)
		.map((r): AdayEser | null => {
			const baslik = kirp(r['Name'], 200);
			if (!baslik) return null;
			const gun = gunAl(r['Watched Date'] || r['Date']);
			return {
				eserTuru: 'film',
				baslik,
				altBaslik: null,
				yil: yilAl(r['Year']),
				tarih: izlemeListesi ? null : (gun?.tarih ?? null),
				tarihHassasiyeti: izlemeListesi ? null : (gun?.tarihHassasiyeti ?? null),
				durum: izlemeListesi ? 'merak' : 'bitti',
				alintilar: []
			};
		})
		.filter((x): x is AdayEser => x !== null);
}

type SpotifyKaydi = {
	endTime?: string;
	ts?: string;
	artistName?: string;
	trackName?: string;
	master_metadata_album_artist_name?: string;
	master_metadata_track_name?: string;
	msPlayed?: number;
	ms_played?: number;
};

/**
 * Spotify: StreamingHistory*.json (kısa) ya da Streaming_History_Audio_*.json (genişletilmiş).
 * En çok dinlenen parçalar (en az 3 kez, 30 sn üstü dinleme) eser olarak, ilk dinlendiği ayla.
 */
export function spotifyOku(metin: string, enFazla = 50): AdayEser[] {
	let veri: unknown;
	try {
		veri = JSON.parse(metin);
	} catch {
		return [];
	}
	if (!Array.isArray(veri)) return [];
	const sayac = new Map<string, { sanatci: string; parca: string; sayi: number; ilk: string }>();
	for (const k of veri as SpotifyKaydi[]) {
		const sanatci = k.artistName ?? k.master_metadata_album_artist_name;
		const parca = k.trackName ?? k.master_metadata_track_name;
		const ms = k.msPlayed ?? k.ms_played ?? 0;
		const zaman = (k.endTime ?? k.ts ?? '').slice(0, 10);
		if (!sanatci || !parca || ms < 30_000) continue;
		const anahtar = `${sanatci}\u0000${parca}`;
		const o = sayac.get(anahtar);
		if (o) {
			o.sayi++;
			if (zaman && zaman < o.ilk) o.ilk = zaman;
		} else sayac.set(anahtar, { sanatci, parca, sayi: 1, ilk: zaman });
	}
	return [...sayac.values()]
		.filter((o) => o.sayi >= 3)
		.sort((a, b) => b.sayi - a.sayi)
		.slice(0, enFazla)
		.map((o) => {
			const gun = gunAl(o.ilk);
			return {
				eserTuru: 'muzik',
				baslik: o.parca.slice(0, 200),
				altBaslik: o.sanatci.slice(0, 200),
				yil: null,
				tarih: gun ? `${gun.tarih.slice(0, 7)}-01` : null,
				tarihHassasiyeti: gun ? 'ay' : null,
				durum: 'bitti',
				alintilar: []
			};
		});
}

/**
 * Kindle "My Clippings.txt": "==========" ile ayrılan kayıtlar; ilk satır "Başlık (Yazar)",
 * ikinci satır konum/tarih, sonra boş satır ve vurgulanan metin. Yalnızca vurgular alınır;
 * aynı kitabın alıntıları tek eserde toplanır.
 */
export function kindleOku(metin: string): AdayEser[] {
	const kitaplar = new Map<string, AdayEser>();
	for (const kayit of bomAt(metin).split(/\r?\n==========\r?\n?/)) {
		const satirlar = kayit.split(/\r?\n/).map((s) => s.trim());
		while (satirlar.length && !satirlar[0]) satirlar.shift();
		if (satirlar.length < 3) continue;
		const [ilk, bilgi, ...kalan] = satirlar;
		// Yer imleri ve notlar değil, yalnızca vurgular (İngilizce ve Türkçe Kindle)
		if (!/highlight|vurgu|surlignement|markierung/i.test(bilgi)) continue;
		const govde = kalan.join('\n').trim();
		if (!govde) continue;
		const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(bomAt(ilk));
		const baslik = (m ? m[1] : ilk).trim().slice(0, 200);
		const yazar = m ? m[2].trim().slice(0, 200) : null;
		if (!baslik) continue;
		const yer = /(?:page|sayfa|seite)\s*(\d+)/i.exec(bilgi)?.[1];
		const konum = /(?:location|konum|position)\s*([\d-]+)/i.exec(bilgi)?.[1];
		const anahtar = `${baslik}\u0000${yazar ?? ''}`;
		const kitap =
			kitaplar.get(anahtar) ??
			({
				eserTuru: 'kitap',
				baslik,
				altBaslik: yazar,
				yil: null,
				tarih: null,
				tarihHassasiyeti: null,
				durum: 'bitti',
				alintilar: []
			} satisfies AdayEser);
		if (!kitap.alintilar.some((a) => a.metin === govde)) {
			kitap.alintilar.push({
				metin: govde.slice(0, 2000),
				yer: yer ? `s. ${yer}` : konum ? `konum ${konum}` : null
			});
		}
		kitaplar.set(anahtar, kitap);
	}
	return [...kitaplar.values()];
}

/** Dosyayı kaynağına göre ayrıştırır; Letterboxd izleme listesi dosya adından anlaşılır */
export function kaynagiOku(kaynak: DisKaynak, metin: string, dosyaAdi = ''): AdayEser[] {
	const sonuc =
		kaynak === 'goodreads'
			? goodreadsOku(metin)
			: kaynak === 'letterboxd'
				? letterboxdOku(metin, /watchlist/i.test(dosyaAdi))
				: kaynak === 'spotify'
					? spotifyOku(metin)
					: kindleOku(metin);
	return sonuc.slice(0, EN_FAZLA_ADAY);
}
