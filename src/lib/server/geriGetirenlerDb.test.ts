// İçe aktarma, bağ avı, günün sorusu, bugün geçmişte ve zenginleştirme (PGlite üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { alintilar, baglar, dugumler, kullanicilar } = await import('./db/schema.ts');
const g = await import('./geriGetirenlerDb.ts');

let ali: string;
const aday = (baslik: string, altBaslik: string | null, tarih: string | null, ek = {}) => ({
	eserTuru: 'kitap' as const,
	baslik,
	altBaslik,
	yil: null,
	tarih,
	tarihHassasiyeti: tarih ? ('gun' as const) : null,
	durum: 'bitti' as const,
	alintilar: [] as { metin: string; yer: string | null }[],
	...ek
});

beforeAll(async () => {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	ali = k.id;
});

describe('içe aktarma', () => {
	it('özel ekler, var olanla birleşir, alıntıları tekrarsız ekler', async () => {
		const ilk = await g.adaylariEkle(ali, [
			aday('Kürk Mantolu Madonna', 'Sabahattin Ali', '1998-08-01', {
				alintilar: [{ metin: 'Bir satır', yer: 's. 4' }]
			}),
			aday('Kuyucaklı Yusuf', 'Sabahattin Ali', '1999-01-10')
		]);
		expect(ilk).toEqual({ eklenen: 2, birlesen: 0, alinti: 1 });
		const ikinci = await g.adaylariEkle(ali, [
			aday('KÜRK MANTOLU MADONNA', 'sabahattin ali', null, {
				alintilar: [
					{ metin: 'Bir satır', yer: 's. 4' },
					{ metin: 'İkinci satır', yer: null }
				]
			})
		]);
		expect(ikinci).toEqual({ eklenen: 0, birlesen: 1, alinti: 1 });
		const hepsi = await db.select().from(dugumler).where(eq(dugumler.sahipId, ali));
		expect(hepsi.every((d) => d.gizlilik === 'ozel')).toBe(true);
		expect(await db.select().from(alintilar)).toHaveLength(2);
	});
});

describe('bağ avı', () => {
	it('aynı yazarı sorar; evet bağ kurar, hayır bir daha sormaz', async () => {
		const soru = (await g.bagAviSorusu(ali))!;
		expect([soru.kaynak.baslik, soru.hedef.baslik, soru.gerekce]).toEqual([
			'Kürk Mantolu Madonna',
			'Kuyucaklı Yusuf',
			'ayni-yapimci'
		]);
		expect(await g.bagAviCevapla(ali, soru.kaynak.id, soru.hedef.id, 'hayir', null)).toBe(true);
		const sonraki = await g.bagAviSorusu(ali);
		expect(sonraki?.kaynak.id === soru.kaynak.id && sonraki?.hedef.id === soru.hedef.id).toBe(
			false
		);
		expect(await g.bagAviCevapla(ali, soru.hedef.id, soru.kaynak.id, 'evet', 'ters yön')).toBe(
			true
		);
		expect(await db.select().from(baglar)).toHaveLength(1);
	});
});

describe('bugün geçmişte ve günün sorusu', () => {
	it('günü bilinen düğümlerin yıldönümünü bulur', async () => {
		const liste = await g.bugunGecmiste(ali, new Date('2026-08-01T09:00:00Z'));
		expect(liste.map((x) => [x.baslik, x.yilOnce])).toEqual([['Kürk Mantolu Madonna', 28]]);
		expect(await g.bugunGecmiste(ali, new Date('2026-08-02T09:00:00Z'))).toEqual([]);
	});

	it('soru günlerinde gelen bağı olmayan bir düğüm sorar', async () => {
		expect(await g.gununSorusu(ali, new Date('2026-11-03T09:00:00Z'))).toBeNull();
		const soru = await g.gununSorusu(ali, new Date('2026-11-02T09:00:00Z'));
		expect(soru?.baslik).toBe('Kuyucaklı Yusuf');
	});
});

describe('zenginleştirme ve yıllık', () => {
	it('yapımcıyı kişi olarak ekler ve bağlar; ikinci kez yeni kişi açmaz', async () => {
		const [eser] = await db
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(eq(dugumler.baslik, 'Kuyucaklı Yusuf'));
		expect(await g.yapimciDugumu(ali, 'Sabahattin Ali')).toBeNull();
		const kisi = await g.yapimciyiEkle(ali, eser.id, 'Eserin yapımcısı');
		expect(await g.yapimciDugumu(ali, 'sabahattin ali')).toBe(kisi);
		const [diger] = await db
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(eq(dugumler.baslik, 'Kürk Mantolu Madonna'));
		expect(await g.yapimciyiEkle(ali, diger.id, 'x')).toBe(kisi);
	});

	it('Wikidata yalnızca boş alanları doldurur', async () => {
		const [yer] = await db
			.insert(dugumler)
			.values({ sahipId: ali, tur: 'yer', baslik: 'Berlin', aciklama: 'Kendi notum' })
			.returning({ id: dugumler.id });
		const doldurulan = await g.wikidataUygula(ali, yer.id, {
			id: 'Q64',
			aciklama: 'Almanya’nın başkenti',
			enlem: 52.52,
			boylam: 13.4,
			dogumYili: null,
			olumYili: null
		});
		expect(doldurulan).toEqual(['kısa bilgi', 'konum']);
		const [d] = await db.select().from(dugumler).where(eq(dugumler.id, yer.id));
		expect(d).toMatchObject({ aciklama: 'Kendi notum', wikidata: 'Q64', enlem: 52.52 });
	});

	it('yıllık verisi yılları ve özeti verir', async () => {
		const { yillik, yillar } = await g.yillikVerisi(ali, 1999);
		expect(yillar).toEqual([1999, 1998]);
		expect(yillik.toplam).toBe(1);
		expect(yillik.gecmistenGelen).toBe(0);
	});
});
