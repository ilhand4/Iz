// Wikidata ile kişi ve yer zenginleştirme. Ağ çağrısı sunucuda (8 sn zaman aşımı); dönüştürücü
// saftır (birim testli). Yalnızca boş alanlar doldurulur, kullanıcının yazdıkları ezilmez.

export type WikidataOzeti = {
	id: string;
	aciklama: string | null;
	enlem: number | null;
	boylam: number | null;
	dogumYili: number | null;
	olumYili: number | null;
};

type Iddia = { mainsnak?: { datavalue?: { value?: unknown } } };
type Varlik = {
	id?: string;
	descriptions?: Record<string, { value?: string }>;
	claims?: Record<string, Iddia[]>;
};

function iddiaDegeri(v: Varlik, ozellik: string): unknown {
	return v.claims?.[ozellik]?.[0]?.mainsnak?.datavalue?.value;
}

function yilAl(deger: unknown): number | null {
	const zaman = (deger as { time?: string } | undefined)?.time;
	const m = zaman ? /^([+-])0*(\d{1,4})-/.exec(zaman) : null;
	if (!m) return null;
	const y = Number(m[2]);
	return m[1] === '-' ? -y : y;
}

/** Wikidata varlığından açıklama (Türkçe, yoksa İngilizce), koordinat ve doğum/ölüm yılı */
export function wikidataOzeti(v: Varlik): WikidataOzeti | null {
	if (!v.id || !/^Q\d+$/.test(v.id)) return null;
	const koordinat = iddiaDegeri(v, 'P625') as { latitude?: number; longitude?: number } | undefined;
	const enlem = typeof koordinat?.latitude === 'number' ? koordinat.latitude : null;
	const boylam = typeof koordinat?.longitude === 'number' ? koordinat.longitude : null;
	const aciklama = v.descriptions?.tr?.value ?? v.descriptions?.en?.value ?? null;
	return {
		id: v.id,
		aciklama: aciklama ? aciklama.slice(0, 300) : null,
		enlem: enlem !== null && Math.abs(enlem) <= 90 ? enlem : null,
		boylam: boylam !== null && Math.abs(boylam) <= 180 ? boylam : null,
		dogumYili: yilAl(iddiaDegeri(v, 'P569')),
		olumYili: yilAl(iddiaDegeri(v, 'P570'))
	};
}

const API = 'https://www.wikidata.org/w/api.php';
const BASLIK = { 'User-Agent': 'Iz/0.1 (kisisel proje)', Accept: 'application/json' };

/** Ada göre ilk eşleşen varlığın özeti (bulunamazsa null; ağ hatasında da null) */
export async function wikidataAra(ad: string): Promise<WikidataOzeti | null> {
	try {
		const ara = new URL(API);
		ara.search = new URLSearchParams({
			action: 'wbsearchentities',
			search: ad.slice(0, 100),
			language: 'tr',
			uselang: 'tr',
			format: 'json',
			limit: '1',
			origin: '*'
		}).toString();
		const sonuc = (await (
			await fetch(ara, { headers: BASLIK, signal: AbortSignal.timeout(8000) })
		).json()) as { search?: { id?: string }[] };
		const id = sonuc.search?.[0]?.id;
		if (!id || !/^Q\d+$/.test(id)) return null;
		const getir = new URL(API);
		getir.search = new URLSearchParams({
			action: 'wbgetentities',
			ids: id,
			props: 'descriptions|claims',
			languages: 'tr|en',
			format: 'json',
			origin: '*'
		}).toString();
		const veri = (await (
			await fetch(getir, { headers: BASLIK, signal: AbortSignal.timeout(8000) })
		).json()) as { entities?: Record<string, Varlik> };
		const varlik = veri.entities?.[id];
		return varlik ? wikidataOzeti(varlik) : null;
	} catch {
		return null;
	}
}
