// Yerel varlık çıkarma: anlatılan bir anıdan kişi, yer ve yıl önerileri. Dışarıya hiçbir şey
// gönderilmez (Claude API bilerek kullanılmıyor; kullanıcı kararı). Türkçe özel adların
// kesme işaretiyle aldığı ekler, akrabalık sözcükleri ve yer sonekleri ipucu olarak kullanılır.
// Kesin değildir: öneriler kullanıcıya onaya sunulur. Birim testleri: varliklar.test.ts
import { sadelestir } from './metin';
import type { DugumTuru } from './sabitler';

export type MevcutDugum = { id: string; baslik: string; tur: DugumTuru };
export type YeniVarlik = { ad: string; tur: 'kisi' | 'yer'; kanit: string };
export type VarlikSonucu = {
	/** Haritada zaten olan ve metinde geçen düğümler */
	eslesenler: MevcutDugum[];
	/** Haritada olmayan aday adlar */
	yeniler: YeniVarlik[];
	yillar: number[];
};

const BUYUK = 'A-ZÇĞİÖŞÜÂÎÛ';
const HARF = 'a-zA-ZçğıöşüÇĞİÖŞÜâîûÂÎÛ';
const KESME = `['’]`;

/** Bir adın önünde ya da ardında gelince kişi olduğunu gösteren sözcükler */
const AKRABALIK = new Set([
	'amca',
	'teyze',
	'dayı',
	'hala',
	'nine',
	'dede',
	'anneanne',
	'babaanne',
	'abla',
	'ağabey',
	'abi',
	'enişte',
	'yenge',
	'hoca',
	'hocam',
	'bey',
	'hanım',
	'usta',
	'efendi',
	'baba',
	'ana',
	'dadı'
]);

/** Adın son sözcüğü bunlardan biriyse yerdir */
const YER_SOZCUKLERI = [
	'sokağı',
	'sokak',
	'caddesi',
	'mahallesi',
	'köyü',
	'sahili',
	'parkı',
	'camii',
	'okulu',
	'lisesi',
	'üniversitesi',
	'hastanesi',
	'çarşısı',
	'köprüsü',
	'meydanı',
	'istasyonu',
	'adası',
	'gölü',
	'dağı',
	'koyu',
	'vapuru',
	'iskelesi',
	'sineması',
	'kahvesi',
	'pasajı',
	'hanı',
	'yalısı',
	'evi'
];

/** Cümle başında büyük harfle gelen ama ad olmayan sık sözcükler ve takvim adları */
const ELENECEK = new Set(
	[
		'bir',
		've',
		'ama',
		'sonra',
		'o',
		'bu',
		'şu',
		'ben',
		'biz',
		'sen',
		'siz',
		'onlar',
		'her',
		'hep',
		'çok',
		'en',
		'daha',
		'ne',
		'neden',
		'nasıl',
		'çünkü',
		'yani',
		'işte',
		'evet',
		'hayır',
		'belki',
		'şimdi',
		'artık',
		'orada',
		'burada',
		'oraya',
		'buraya',
		'ocak',
		'şubat',
		'mart',
		'nisan',
		'mayıs',
		'haziran',
		'temmuz',
		'ağustos',
		'eylül',
		'ekim',
		'kasım',
		'aralık',
		'pazartesi',
		'salı',
		'çarşamba',
		'perşembe',
		'cuma',
		'cumartesi',
		'pazar',
		'bayram',
		'ramazan',
		'allah',
		'tanrı'
	].map((s) => s.toLocaleLowerCase('tr'))
);

/** Kesme işaretinden sonraki ek: yer bildiren (-de, -den, -e) ve kişi bildiren (-nin, -i, -le) */
const YER_EKI = /^(y?[ae]|n?[dt][ae]n?|[dt][ae]ki|n?[dt][ae]ydi)$/i;
const KISI_EKI = /^(n?[ıiuü]n|y?[ıiuü]|y?l[ae]|cığım|ciğim|gil|giller|ler|lar)$/i;

/** Cümle başında ada yapışmış, ekli sıradan sözcük ("Bayramlarda", "Akşamları", "Gidince") */
const EKLI_SOZCUK =
	/^[a-zçğıöşü]{3,}(da|de|ta|te|dan|den|tan|ten|lar|ler|ları|leri|ken|ınca|ince|unca|ünce|dı|di|du|dü|tı|ti|tu|tü|mış|miş|muş|müş)$/;

/** "teyzenin", "amcamın" gibi ekli akrabalık sözcüğünün kökü */
function akrabalikKoku(sozcuk: string): string | null {
	const k = sozcuk.toLocaleLowerCase('tr');
	let enUzun: string | null = null;
	for (const a of AKRABALIK)
		if (k.startsWith(a) && (!enUzun || a.length > enUzun.length)) enUzun = a;
	return enUzun;
}

function kucuk(s: string) {
	return s.toLocaleLowerCase('tr');
}

type Aday = { ad: string; ek: string | null; sonraki: string | null; cumleBasi: boolean };

/** Büyük harfle başlayan ardışık sözcük öbeklerini (ve kesme ekini) bulur */
function adaylar(metin: string): Aday[] {
	const sonuc: Aday[] = [];
	const desen = new RegExp(
		`[${BUYUK}][${HARF}]*(?:\\s+[${BUYUK}][${HARF}]*)*(?:${KESME}([${HARF}]+))?`,
		'gu'
	);
	for (const m of metin.matchAll(desen)) {
		const tam = m[0];
		const ek = m[1] ?? null;
		const ad = ek ? tam.slice(0, tam.length - ek.length - 1) : tam;
		const once = metin.slice(0, m.index).trimEnd();
		const cumleBasi = once === '' || /[.!?:;"“”\n]$/.test(once);
		const sonrakiEsles = /^\s+([a-zçğıöşü]+)/u.exec(metin.slice(m.index! + tam.length));
		sonuc.push({ ad, ek, sonraki: sonrakiEsles?.[1] ?? null, cumleBasi });
	}
	return sonuc;
}

function yerSozcuguyleBiter(ad: string) {
	const son = kucuk(ad.split(/\s+/).at(-1)!);
	return YER_SOZCUKLERI.includes(son);
}

function akrabalikIcerir(ad: string) {
	return ad.split(/\s+/).some((s) => AKRABALIK.has(kucuk(s)));
}

export function varlikCikar(metin: string, mevcut: MevcutDugum[]): VarlikSonucu {
	const sade = sadelestir(metin);
	const eslesenler = mevcut.filter((d) => {
		const b = sadelestir(d.baslik);
		if (b.length < 3) return false;
		const kacis = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`(^|[^a-z0-9])${kacis}(?=[^a-z0-9]|$)`).test(sade);
	});
	const bilinen = new Set(eslesenler.map((d) => sadelestir(d.baslik)));

	const yeniler = new Map<string, YeniVarlik>();
	const ortaCumleAdlari = new Set(
		adaylar(metin)
			.filter((a) => !a.cumleBasi)
			.map((a) => sadelestir(a.ad))
	);
	for (const a of adaylar(metin)) {
		let ad = a.ad.trim();
		// "Ayşe teyze" gibi küçük harfli akrabalık sözcüğü ada eklenir
		let akraba = akrabalikIcerir(ad);
		const kok = !akraba && !a.ek && a.sonraki ? akrabalikKoku(a.sonraki) : null;
		if (kok) {
			ad = `${ad} ${kok}`;
			akraba = true;
		}
		const sozcukler = ad.split(/\s+/);
		// Cümle başındaki ekli sözcük ad değildir ("Bayramlarda Fatma nine" → "Fatma nine")
		if (
			a.cumleBasi &&
			sozcukler.length > 1 &&
			!ortaCumleAdlari.has(sadelestir(sozcukler[0])) &&
			EKLI_SOZCUK.test(kucuk(sozcukler[0]))
		)
			sozcukler.shift();
		// Cümle başındaki tek sözcük yalnızca ek, akrabalık ya da metnin başka yerinde de büyük harfle
		// geçiyorsa ad sayılır ("Sonra eve döndük" elenir)
		if (
			a.cumleBasi &&
			!a.ek &&
			!akraba &&
			sozcukler.length === 1 &&
			!ortaCumleAdlari.has(sadelestir(ad))
		)
			continue;
		// Cümle başındaki elenecek sözcüğü öbekten at ("Sonra Kadıköy" → "Kadıköy")
		while (sozcukler.length > 1 && ELENECEK.has(kucuk(sozcukler[0]))) sozcukler.shift();
		ad = sozcukler.join(' ');
		if (sozcukler.length === 1 && ELENECEK.has(kucuk(ad))) continue;
		if (ad.length < 2) continue;
		const anahtar = sadelestir(ad);
		if (bilinen.has(anahtar) || yeniler.has(anahtar)) continue;

		let tur: 'kisi' | 'yer';
		let kanit: string;
		if (akraba) {
			tur = 'kisi';
			kanit = 'akrabalık / hitap sözcüğü';
		} else if (yerSozcuguyleBiter(ad)) {
			tur = 'yer';
			kanit = 'yer adı soneki';
		} else if (a.ek && YER_EKI.test(a.ek)) {
			tur = 'yer';
			kanit = `“'${a.ek}” eki`;
		} else if (a.ek && KISI_EKI.test(a.ek)) {
			tur = 'kisi';
			kanit = `“'${a.ek}” eki`;
		} else {
			tur = 'kisi';
			kanit = 'büyük harfle yazılmış ad';
		}
		yeniler.set(anahtar, { ad, tur, kanit });
	}

	const yillar = [
		...new Set(
			[...metin.matchAll(/(?<![\d])(1[89]\d{2}|20\d{2})(?![\d])/g)].map((m) => Number(m[1]))
		)
	].sort((x, y) => x - y);

	return { eslesenler, yeniler: [...yeniler.values()], yillar };
}
