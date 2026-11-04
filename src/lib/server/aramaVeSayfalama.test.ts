// Yazım hatasına dayanıklı arama (pg_trgm) ve imleç tabanlı sayfalama (PGlite üzerinde).
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, izler, kullanicilar } = await import('./db/schema.ts');
const veri = await import('./dugumler.ts');
const izModulu = await import('./izler.ts');
const { imlecOku } = await import('./imlec.ts');

let ali: string;

beforeAll(async () => {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	ali = k.id;
	await db.insert(dugumler).values(
		[
			['Kürk Mantolu Madonna', 'Sabahattin Ali'],
			['Tutunamayanlar', 'Oğuz Atay'],
			['İstanbul Hatırası', 'Ahmet Ümit'],
			['Işık Ustası', null],
			['Berlin', 'Almanya']
		].map(([baslik, altBaslik]) => ({
			sahipId: ali,
			tur: 'ani' as const,
			baslik: baslik!,
			altBaslik
		}))
	);
});

const ara = async (q: string) => (await veri.dugumleriListele(ali, { q })).map((d) => d.baslik);

describe('arama', () => {
	it('Türkçe karakterlerden ve büyük/küçük harften bağımsız bulur', async () => {
		expect(await ara('kurk')).toEqual(['Kürk Mantolu Madonna']);
		expect(await ara('ISTANBUL')).toEqual(['İstanbul Hatırası']);
		expect(await ara('isik')).toEqual(['Işık Ustası']);
		expect(await ara('oguz')).toEqual(['Tutunamayanlar']);
	});

	it('sözcük sırası önemsiz; yazım hatasını tolere eder', async () => {
		expect(await ara('madonna kürk')).toEqual(['Kürk Mantolu Madonna']);
		expect(await ara('tutnamayanlar')).toEqual(['Tutunamayanlar']);
		expect(await ara('brlin')).toEqual(['Berlin']);
	});

	it('alakasız sorgu bir şey döndürmez; birebir eşleşme benzerden önce gelir', async () => {
		expect(await ara('zzzz')).toEqual([]);
		await db.insert(dugumler).values({ sahipId: ali, tur: 'ani', baslik: 'Berlinale anısı' });
		const sonuc = await ara('berlin');
		expect(sonuc[0]).toBe('Berlin');
		expect(sonuc).toContain('Berlinale anısı');
	});

	it('üretilmiş sütun Türkçe büyük harfleri doğru sadeleştirir', async () => {
		const [s] = await db
			.execute<{ m: string }>(
				sql`select arama_metni as m from dugumler where baslik = 'Işık Ustası'`
			)
			.then((r) => veri.satirlar<{ m: string }>(r));
		expect(s.m).toBe('isik ustasi ');
	});

	it('iz araması başlık ve açıklamada çalışır', async () => {
		await db.insert(izler).values([
			{ sahipId: ali, baslik: 'Oğuz Atay yılları', aciklama: 'Bir paragraftan kulübe' },
			{ sahipId: ali, baslik: 'Berlin yolu', aciklama: null }
		]);
		const bul = async (q: string) =>
			(await izModulu.izleriListele(ali, { q })).map((i) => i.baslik);
		expect(await bul('oguz')).toEqual(['Oğuz Atay yılları']);
		expect(await bul('kulube')).toEqual(['Oğuz Atay yılları']);
		expect(await bul('berln')).toEqual(['Berlin yolu']);
	});
});

describe('sayfalama', () => {
	it('sayfalar boşluksuz ve tekrarsız ilerler; aynı anda oluşturulanlar da kaybolmaz', async () => {
		const [k] = await db
			.insert(kullanicilar)
			.values({ kullaniciAdi: 'banu', eposta: 'banu@iz.test', ad: 'Banu', sifreOzeti: 'x' })
			.returning({ id: kullanicilar.id });
		// 25 düğüm, hepsi aynı zaman damgasıyla (tek INSERT): sıralama kimlikle ayrışmalı
		await db.insert(dugumler).values(
			Array.from({ length: 25 }, (_, i) => ({
				sahipId: k.id,
				tur: 'ani' as const,
				baslik: `D${i}`
			}))
		);

		const gorulen: string[] = [];
		let imlec = null;
		let sayfaSayisi = 0;
		do {
			const sayfa = await veri.dugumSayfasi(k.id, {}, imlec, 10);
			gorulen.push(...sayfa.liste.map((d) => d.id));
			imlec = imlecOku(sayfa.sonraki);
			sayfaSayisi++;
		} while (imlec);
		expect(sayfaSayisi).toBe(3);
		expect(gorulen).toHaveLength(25);
		expect(new Set(gorulen).size).toBe(25);
	});

	it('tam sayfa sınırında boş bir son sayfa üretmez', async () => {
		const [k] = await db
			.insert(kullanicilar)
			.values({ kullaniciAdi: 'cem', eposta: 'cem@iz.test', ad: 'Cem', sifreOzeti: 'x' })
			.returning({ id: kullanicilar.id });
		await db.insert(dugumler).values(
			Array.from({ length: 10 }, (_, i) => ({
				sahipId: k.id,
				tur: 'ani' as const,
				baslik: `C${i}`
			}))
		);
		const sayfa = await veri.dugumSayfasi(k.id, {}, null, 10);
		expect(sayfa.liste).toHaveLength(10);
		expect(sayfa.sonraki).toBeNull();
	});

	it('iz sayfaları da imleçle ilerler', async () => {
		const [k] = await db
			.insert(kullanicilar)
			.values({ kullaniciAdi: 'deniz', eposta: 'deniz@iz.test', ad: 'D', sifreOzeti: 'x' })
			.returning({ id: kullanicilar.id });
		await db
			.insert(izler)
			.values(Array.from({ length: 7 }, (_, i) => ({ sahipId: k.id, baslik: `İz ${i}` })));
		const ilk = await izModulu.izSayfasi(k.id, '', null, 5);
		const ikinci = await izModulu.izSayfasi(k.id, '', imlecOku(ilk.sonraki), 5);
		expect(ilk.liste).toHaveLength(5);
		expect(ikinci.liste).toHaveLength(2);
		expect(ikinci.sonraki).toBeNull();
		const hepsi = [...ilk.liste, ...ikinci.liste].map((i) => i.id);
		expect(new Set(hepsi).size).toBe(7);
	});
});
