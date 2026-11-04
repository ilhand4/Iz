// Kanonik eser tetikleyicisi, kör kesişim ve keşif yolları (PGlite üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { baglar, dugumler, izAdimlari, izler, kanonikEserler, kullanicilar } =
	await import('./db/schema.ts');
const kesif = await import('./kesif.ts');

let ali: string, banu: string, cem: string;
const d: Record<string, string> = {};

async function kullanici(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	return k.id;
}

async function eser(
	sahipId: string,
	baslik: string,
	altBaslik: string | null,
	gizlilik: 'ozel' | 'herkes' = 'herkes',
	ek: Partial<typeof dugumler.$inferInsert> = {}
) {
	const [x] = await db
		.insert(dugumler)
		.values({ sahipId, tur: 'eser', eserTuru: 'kitap', baslik, altBaslik, gizlilik, ...ek })
		.returning({ id: dugumler.id });
	return x.id;
}

async function kanonigi(id: string) {
	const [x] = await db
		.select({ k: dugumler.kanonikEserId })
		.from(dugumler)
		.where(eq(dugumler.id, id));
	return x.k;
}

beforeAll(async () => {
	ali = await kullanici('ali');
	banu = await kullanici('banu');
	cem = await kullanici('cem');
	d.aliMadonna = await eser(ali, 'Kürk Mantolu Madonna', 'Sabahattin Ali', 'ozel');
	// Farklı yazım, aynı eser: parmak izi sadeleştirilmiş metinden
	d.banuMadonna = await eser(banu, 'KÜRK MANTOLU MADONNA', 'sabahattin ali');
	d.banuSeytan = await eser(banu, 'İçimizdeki Şeytan', 'Sabahattin Ali');
	d.banuGizli = await eser(banu, 'Gizli Kitap', null, 'ozel');
	d.cemMadonna = await eser(cem, 'Kürk Mantolu Madonna', 'Sabahattin Ali');
	d.cemSeytan = await eser(cem, 'İçimizdeki Şeytan', 'Sabahattin Ali');
	await db.insert(baglar).values([
		{ sahipId: banu, kaynakId: d.banuMadonna, hedefId: d.banuSeytan, not: 'yazarın başka kitabı' },
		{ sahipId: banu, kaynakId: d.banuMadonna, hedefId: d.banuGizli },
		{ sahipId: cem, kaynakId: d.cemMadonna, hedefId: d.cemSeytan }
	]);
	const [iz] = await db
		.insert(izler)
		.values({ sahipId: banu, baslik: 'Sabahattin Ali yazı', gizlilik: 'herkes' })
		.returning({ id: izler.id });
	await db.insert(izAdimlari).values([
		{ izId: iz.id, dugumId: d.banuMadonna, sira: 1 },
		{ izId: iz.id, dugumId: d.banuGizli, sira: 2 }
	]);
	await db.insert(izler).values({ sahipId: cem, baslik: 'Cem özel', gizlilik: 'ozel' });
});

describe('kanonik eser', () => {
	it('aynı eser farklı yazımla da tek kanonik kayda bağlanır', async () => {
		const k = await kanonigi(d.aliMadonna);
		expect(k).not.toBeNull();
		expect(await kanonigi(d.banuMadonna)).toBe(k);
		expect(await kanonigi(d.cemMadonna)).toBe(k);
		expect(await kanonigi(d.banuSeytan)).not.toBe(k);
	});

	it('dış kimlik parmak izinden önce gelir; tür değişince bağ kalkar', async () => {
		const x = await eser(ali, 'Dune', 'Frank Herbert', 'ozel', {
			disKaynak: 'openlibrary',
			disKimlik: 'OL893415W'
		});
		const [k] = await db
			.select()
			.from(kanonikEserler)
			.where(eq(kanonikEserler.id, (await kanonigi(x))!));
		expect(k.anahtar).toBe('openlibrary:OL893415W');
		await db.update(dugumler).set({ tur: 'ani', eserTuru: null }).where(eq(dugumler.id, x));
		expect(await kanonigi(x)).toBeNull();
	});

	it('başlık değişince yeni kanonik kayda geçer', async () => {
		const x = await eser(ali, 'Tutunamayanlar', 'Oğuz Atay', 'ozel');
		const ilk = await kanonigi(x);
		await db.update(dugumler).set({ baslik: 'Tehlikeli Oyunlar' }).where(eq(dugumler.id, x));
		expect(await kanonigi(x)).not.toBe(ilk);
	});
});

describe('kör kesişim ve keşif yolları', () => {
	it('yalnızca başkalarının herkese açık izleri gelir; özel durak başlığı sızmaz', async () => {
		const sonuc = await kesif.korKesisim(d.aliMadonna);
		expect(sonuc.map((i) => [i.baslik, i.sahip?.kullaniciAdi])).toEqual([
			['Sabahattin Ali yazı', 'banu']
		]);
		expect(JSON.stringify(sonuc)).not.toContain('Gizli Kitap');
		// Kendi izi kendisine "başkasının yolu" olarak önerilmez
		expect((await kesif.korKesisim(d.banuMadonna)).map((i) => i.baslik)).toEqual([]);
	});

	it('keşif yolları kişi sayısına göre; özel hedefler ve haritadakiler hariç', async () => {
		const oneriler = await kesif.kesifYollari(d.aliMadonna);
		expect(oneriler.map((o) => [o.baslik, o.kisi])).toEqual([['İçimizdeki Şeytan', 2]]);

		// Ali eseri haritasına eklerse artık önerilmez
		await eser(ali, 'İçimizdeki Şeytan', 'Sabahattin Ali', 'ozel');
		expect(await kesif.kesifYollari(d.aliMadonna)).toEqual([]);
	});

	it('kanonik kayıttan dış kimlik geri çıkarılır', async () => {
		const [k] = await db
			.select({ id: kanonikEserler.id })
			.from(kanonikEserler)
			.where(eq(kanonikEserler.anahtar, 'openlibrary:OL893415W'));
		expect(await kesif.kanonikGetir(k.id)).toMatchObject({
			disKaynak: 'openlibrary',
			disKimlik: 'OL893415W'
		});
	});
});
