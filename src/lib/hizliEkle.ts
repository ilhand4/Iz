// Hızlı ekle: tek satırlık Türkçe ifadeyi ayrıştırır. Sonuç bir öneridir; kullanıcı onay ekranında
// her parçayı düzeltebilir. Saf fonksiyon; birim testleri hizliEkle.test.ts'de.
//   "Tutunamayanlar, Selin Hoca önerdi"          → ana + getiren (kişi) + not "önerdi", durum merak
//   "Tutunamayanlar'ı okudum, Selin Hoca önerdi" → durum bitti, eser türü kitap
//   "Kuyucaklı Yusuf, Madonna'yı okurken"        → getiren bir eser
//   "Disco Elysium ← Kreuzberg'de ilk kış"       → ok işaretiyle de yazılabilir
import type { DugumTuru, EserDurumu, EserTuru } from './sabitler';

export type HizliCozum = {
	ana: string;
	getiren: string | null;
	/** "Nasıl getirdi?" notu (fiil ya da kalıp) */
	not: string | null;
	durum: EserDurumu | null;
	/** Fiilden tahmin edilen eser türü (okudum → kitap) */
	eserTuru: EserTuru | null;
	/** Kalıptan tahmin edilen getiren türü (önerdi → kişi, okurken → eser) */
	getirenTuru: DugumTuru | null;
};

// Şimdiki zamanda kökün son ünlüsü düşer (izle → izliyorum, oyna → oynuyorum); kökler buna göre kısa
const FIIL_TURU: [RegExp, EserTuru | null][] = [
	[/^oku/, 'kitap'],
	[/^(izl|seyr)/, 'film'],
	[/^dinl/, 'muzik'],
	[/^oyn/, 'oyun'],
	[/^bitir/, null]
];

function fiildenTur(fiil: string): EserTuru | null {
	const kucuk = fiil.toLocaleLowerCase('tr');
	return FIIL_TURU.find(([desen]) => desen.test(kucuk))?.[1] ?? null;
}

/** Ana metnin sonundaki durum fiilleri */
const DURUM_KALIPLARI: [RegExp, EserDurumu][] = [
	[/\s+(yarım bıraktım)$/iu, 'yarim'],
	[/\s+(okuyorum|izliyorum|seyrediyorum|dinliyorum|oynuyorum)$/iu, 'suruyor'],
	[
		/\s+(okuyacağım|izleyeceğim|dinleyeceğim|oynayacağım|okumak istiyorum|izlemek istiyorum|dinlemek istiyorum|merak ediyorum)$/iu,
		'merak'
	],
	[/\s+(okudum|izledim|seyrettim|dinledim|oynadım|bitirdim)$/iu, 'bitti']
];

/** Getiren kişi olduğunu düşündüren fiiller */
const ONERI_FIILLERI =
	'önerdi|tavsiye etti|öğütledi|söyledi|anlattı|hediye etti|ödünç verdi|verdi|okuttu|izletti|dinletti|gösterdi|tanıttı';
const KESIF_FIILLERI = 'duydum|öğrendim|gördüm|buldum|keşfettim|rastladım|denk geldim';

/** "Madonna'yı", "Tutunamayanlar'ı" → kesme işaretli belirtme ekini atar */
function belirtmeEkiniAt(metin: string): string {
	return metin.replace(/['’](?:y|n)?[ıiuü]$/u, '');
}

/** "Twitter'dan", "Selin'den", "kursta" → ayrılma / bulunma ekini atar */
function ayrilmaEkiniAt(metin: string, kesmesizDe: boolean): string {
	const kesmeli = metin.replace(/['’]n?[dt][ae]n?$/u, '');
	if (kesmeli !== metin || !kesmesizDe) return kesmeli;
	// Kesme işareti yoksa yalnızca "-ndan/-nden" (kitaplığından, evinden) güvenle atılabilir
	return metin.replace(/(?<=\S)n[dt][ae]n$/u, '');
}

function temizle(metin: string): string {
	return metin
		.trim()
		.replace(/^["“”'‘’«»]+|["“”'‘’«».!]+$/gu, '')
		.trim();
}

export function hizliCoz(girdi: string): HizliCozum {
	const metin = girdi.replace(/\s+/g, ' ').trim();
	let ana = metin;
	let kuyruk: string | null = null;
	let getirenOnce = false;

	// Oklar: "X ← Y" (Y getirdi), "Y → X" (Y götürdü)
	const geriOk = /\s*(?:←|<-)\s*/u;
	const ileriOk = /\s*(?:→|->)\s*/u;
	if (geriOk.test(metin)) {
		[ana, kuyruk] = metin.split(geriOk, 2);
	} else if (ileriOk.test(metin)) {
		const [sol, sag] = metin.split(ileriOk, 2);
		[ana, kuyruk, getirenOnce] = [sag, sol, true];
	} else {
		const ayirac = /\s*[,;]\s*|\s+[—–-]\s+/u.exec(metin);
		if (ayirac) {
			ana = metin.slice(0, ayirac.index);
			kuyruk = metin.slice(ayirac.index + ayirac[0].length);
		}
	}

	// Ana kısımdaki durum fiili
	let durum: EserDurumu | null = null;
	let eserTuru: EserTuru | null = null;
	for (const [desen, d] of DURUM_KALIPLARI) {
		const eslesme = desen.exec(ana);
		if (eslesme) {
			durum = d;
			eserTuru = fiildenTur(eslesme[1]);
			ana = belirtmeEkiniAt(ana.slice(0, eslesme.index));
			break;
		}
	}

	let getiren: string | null = null;
	let not: string | null = null;
	let getirenTuru: DugumTuru | null = null;
	const k = kuyruk?.trim() ?? '';
	if (k) {
		let m: RegExpExecArray | null;
		// Ok işaretinin solu da aynı kalıplarla okunur ("Deniz önerdi → Aylak Adam")
		if ((m = new RegExp(`^(.+?)\\s+(${ONERI_FIILLERI})$`, 'iu').exec(k))) {
			[getiren, not, getirenTuru] = [m[1], m[2], 'kisi'];
			if (!durum) durum = 'merak';
		} else if ((m = /^(.+?)['’]?(?:n[ıiuü]n|[ıiuü]n)\s+(önerisiyle|tavsiyesiyle)$/iu.exec(k))) {
			[getiren, not, getirenTuru] = [m[1], m[2], 'kisi'];
			if (!durum) durum = 'merak';
		} else if ((m = /^(.+?)\s+(sayesinde)$/iu.exec(k))) {
			[getiren, not] = [m[1], m[2]];
		} else if ((m = /^(.+?)\s+(okurken|izlerken|seyrederken|dinlerken|oynarken)$/iu.exec(k))) {
			[getiren, not, getirenTuru] = [belirtmeEkiniAt(m[1]), m[2], 'eser'];
		} else if ((m = new RegExp(`^(.+?)\\s+(${KESIF_FIILLERI})$`, 'iu').exec(k))) {
			[getiren, not] = [ayrilmaEkiniAt(m[1], true), m[2]];
		} else {
			// "Y → X" biçiminde Y bir düğüm adıdır; ek atılmaz
			getiren = getirenOnce ? k : ayrilmaEkiniAt(k, false);
		}
	}

	return {
		ana: temizle(ana),
		getiren: getiren ? temizle(getiren) || null : null,
		not: not ? not.toLocaleLowerCase('tr') : null,
		durum,
		eserTuru,
		getirenTuru
	};
}
