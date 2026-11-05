// Harita verisi ve PostGIS yakınlık sorgusu (PGlite + PostGIS eklentisi üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { baglar, dugumler, kullanicilar } = await import('./db/schema.ts');
const k = await import('./konumlar.ts');

let ali: string;
let ayse: string;
const id: Record<string, string> = {};

beforeAll(async () => {
	const kisiler = await db
		.insert(kullanicilar)
		.values([
			{ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' },
			{ kullaniciAdi: 'ayse', eposta: 'ayse@iz.test', ad: 'Ayşe', sifreOzeti: 'x' }
		])
		.returning({ id: kullanicilar.id });
	[ali, ayse] = kisiler.map((x) => x.id);
	const satirlar = await db
		.insert(dugumler)
		.values([
			{ sahipId: ali, tur: 'yer', baslik: 'Moda Sahili', enlem: 40.9806, boylam: 29.0256 },
			// Moda'ya ~600 m
			{ sahipId: ali, tur: 'ani', baslik: 'Kitap kulübü', enlem: 40.9857, boylam: 29.0284 },
			// Kadıköy iskelesi ~1,25 km
			{ sahipId: ali, tur: 'yer', baslik: 'Kadıköy İskelesi', enlem: 40.9918, boylam: 29.0229 },
			{ sahipId: ali, tur: 'yer', baslik: 'Kreuzberg', enlem: 52.4986, boylam: 13.4033 },
			{ sahipId: ali, tur: 'kisi', baslik: 'Konumsuz' },
			{ sahipId: ayse, tur: 'yer', baslik: 'Ayşe’nin yeri', enlem: 40.981, boylam: 29.026 }
		])
		.returning({ id: dugumler.id, baslik: dugumler.baslik });
	for (const s of satirlar) id[s.baslik] = s.id;
	await db.insert(baglar).values([
		{ sahipId: ali, kaynakId: id['Moda Sahili'], hedefId: id['Kreuzberg'] },
		{ sahipId: ali, kaynakId: id['Konumsuz'], hedefId: id['Moda Sahili'] }
	]);
});

describe('harita', () => {
	it('yalnızca kendi konumlu düğümlerini ve iki ucu konumlu bağları verir', async () => {
		const v = await k.haritaKonumlari(ali);
		expect(v.dugumler.map((d) => d.baslik).sort()).toEqual([
			'Kadıköy İskelesi',
			'Kitap kulübü',
			'Kreuzberg',
			'Moda Sahili'
		]);
		expect(v.baglar).toHaveLength(1);
		expect(v.konumsuz).toBe(1);
	});

	it('PostGIS konum sütunu enlem/boylamdan üretilir ve güncellenir', async () => {
		const yakin = await k.yakindakiler(ali, id['Moda Sahili'], 1000);
		expect(yakin.map((y) => y.baslik)).toEqual(['Kitap kulübü']);
		expect(yakin[0].mesafe).toBeGreaterThan(500);
		expect(yakin[0].mesafe).toBeLessThan(700);
		// Daha geniş yarıçapta iskele de girer; başkasının düğümü hiç girmez
		expect((await k.yakindakiler(ali, id['Moda Sahili'], 3000)).map((y) => y.baslik)).toEqual([
			'Kitap kulübü',
			'Kadıköy İskelesi'
		]);
		// Koordinat değişince nokta da değişir
		await db
			.update(dugumler)
			.set({ enlem: 52.4987, boylam: 13.4034 })
			.where(eq(dugumler.id, id['Kitap kulübü']));
		expect(await k.yakindakiler(ali, id['Moda Sahili'], 1000)).toEqual([]);
		expect((await k.yakindakiler(ali, id['Kreuzberg'])).map((y) => y.baslik)).toEqual([
			'Kitap kulübü'
		]);
		// Başkasının düğümü için hiçbir şey dönmez
		expect(await k.yakindakiler(ayse, id['Moda Sahili'])).toEqual([]);
	});
});
