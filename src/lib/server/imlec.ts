// İmleç tabanlı sayfalama: "bu kayıttan sonrakiler" (OFFSET yok; yeni kayıt eklense de kayma olmaz).
// İmleç, sıralama anahtarının (zaman damgası + kimlik) base64url kodlanmış hâlidir. Zaman, PostgreSQL'in
// metin biçimiyle taşınır ki mikro saniyeler kaybolmasın (JS Date milisaniyeye yuvarlar).

export type Imlec = { zaman: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// "2026-11-04 17:19:03.123456+03" gibi
const ZAMAN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)$/;

export function imlecYaz(imlec: Imlec): string {
	return Buffer.from(`${imlec.zaman}|${imlec.id}`, 'utf8').toString('base64url');
}

export function imlecOku(deger: string | null | undefined): Imlec | null {
	if (!deger || deger.length > 200) return null;
	const metin = Buffer.from(deger, 'base64url').toString('utf8');
	const [zaman, id, fazla] = metin.split('|');
	if (fazla !== undefined || !zaman || !id || !ZAMAN.test(zaman) || !UUID.test(id)) return null;
	return { zaman, id };
}
