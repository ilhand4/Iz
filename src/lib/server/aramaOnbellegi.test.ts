// Eser araması: bellek önbelleği boşalsa bile veritabanı önbelleği dış servise ikinci kez gitmez.
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { eserAramaOnbellegi } = await import('./db/schema.ts');
const { aramaOnbellegi } = await import('./aramaOnbellegi.ts');
const eserArama = await import('./eserArama.ts');

const yanit = {
	docs: [{ key: '/works/OL1W', title: 'Tutunamayanlar', author_name: ['Oğuz Atay'] }]
};

beforeAll(() => {
	eserArama.kaliciOnbellekKur(aramaOnbellegi);
});

describe('eser araması önbelleği', () => {
	it('sonuç veritabanına yazılır ve yeni süreçte oradan okunur', async () => {
		const sahte = vi.fn(async () => new Response(JSON.stringify(yanit), { status: 200 }));
		vi.stubGlobal('fetch', sahte);

		const ilk = await eserArama.kitapAra('  Tutunamayanlar ');
		expect(ilk.map((s) => s.baslik)).toEqual(['Tutunamayanlar']);
		expect(sahte).toHaveBeenCalledTimes(1);

		const satirlar = await db.select().from(eserAramaOnbellegi);
		expect(satirlar.map((s) => s.anahtar)).toEqual(['kitap:tutunamayanlar']);

		// Bellek önbelleğini atlamak için büyük/küçük harf farklı aynı sorgu (anahtar sadeleşir)
		// ve bellek kaydını silmek yerine doğrudan katmandan okuma
		expect(await aramaOnbellegi.oku('kitap:tutunamayanlar')).toEqual(ilk);
		await eserArama.kitapAra('TUTUNAMAYANLAR');
		expect(sahte).toHaveBeenCalledTimes(1);
		vi.unstubAllGlobals();
	});

	it('süresi dolan kayıt okunmaz', async () => {
		await db.update(eserAramaOnbellegi).set({ zaman: new Date(Date.now() - 25 * 3600_000) });
		expect(await aramaOnbellegi.oku('kitap:tutunamayanlar')).toBeNull();
	});

	it('veritabanı katmanı hata verirse arama yine dış servisten yapılır', async () => {
		eserArama.kaliciOnbellekKur({
			oku: () => Promise.reject(new Error('bağlantı yok')),
			yaz: () => Promise.reject(new Error('bağlantı yok'))
		});
		const sahte = vi.fn(async () => new Response(JSON.stringify(yanit), { status: 200 }));
		vi.stubGlobal('fetch', sahte);
		expect(await eserArama.kitapAra('başka bir sorgu')).toHaveLength(1);
		expect(sahte).toHaveBeenCalledTimes(1);
		vi.unstubAllGlobals();
		eserArama.kaliciOnbellekKur(null);
	});
});
