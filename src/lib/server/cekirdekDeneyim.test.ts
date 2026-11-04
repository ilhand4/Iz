// Aşama 2.5 (çekirdek deneyim) veri katmanı: çöp kutusu, durum, getirenle kaydetme,
// ilk iz sihirbazı, açtığı kapılar ve kalıcı ağ konumları. PGlite üzerinde gerçek migration'larla.
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { agKonumlari, baglar, dugumler, kullanicilar } = await import('./db/schema.ts');
const veri = { ...(await import('./dugumler.ts')), ...(await import('./baglar.ts')) };
const izler = await import('./izler.ts');
const cop = await import('./copKutusu.ts');

let ali: string, banu: string;

async function kullaniciEkle(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'test' })
		.returning({ id: kullanicilar.id });
	return k.id;
}

const yeniVeri = (baslik: string, ek: Partial<Parameters<typeof veri.dugumOlustur>[1]> = {}) => ({
	tur: 'eser' as const,
	eserTuru: 'kitap' as const,
	baslik,
	altBaslik: null,
	aciklama: null,
	tarih: null,
	tarihHassasiyeti: null,
	yil: null,
	enlem: null,
	boylam: null,
	yerAdi: null,
	durum: null,
	gizlilik: 'ozel' as const,
	...ek
});

const yok = { kip: 'yok' } as const;

beforeAll(async () => {
	ali = await kullaniciEkle('ali');
	banu = await kullaniciEkle('banu');
});

describe('düğümü getireniyle kaydetme', () => {
	it('yeni düğüm, yeni getiren ve aralarındaki bağ tek işlemde yazılır', async () => {
		const sonuc = await veri.dugumVeGetireniKaydet(
			ali,
			{ kip: 'yeni', veri: yeniVeri('Tutunamayanlar', { durum: 'merak' }) },
			{ kip: 'yeni', tur: 'kisi', eserTuru: null, baslik: 'Selin Hoca' },
			'önerdi'
		);
		expect(sonuc).toMatchObject({ yeniMi: true, bagKuruldu: true });
		if (sonuc === 'yetkisiz') throw new Error();
		const { gelen } = await veri.dugumBaglari(sonuc.dugumId, ali);
		expect(gelen.map((b) => [b.dugum.baslik, b.not])).toEqual([['Selin Hoca', 'önerdi']]);
	});

	it('başkasının düğümü getiren seçilirse hiçbir şey yazılmaz', async () => {
		const [banununki] = await db
			.insert(dugumler)
			.values({ sahipId: banu, tur: 'kisi', baslik: 'Banu’nun kişisi' })
			.returning({ id: dugumler.id });
		const once = await db.select().from(dugumler).where(eq(dugumler.sahipId, ali));
		const sonuc = await veri.dugumVeGetireniKaydet(
			ali,
			{ kip: 'yeni', veri: yeniVeri('Sızma denemesi') },
			{ kip: 'mevcut', id: banununki.id },
			null
		);
		expect(sonuc).toBe('yetkisiz');
		const sonra = await db.select().from(dugumler).where(eq(dugumler.sahipId, ali));
		expect(sonra).toHaveLength(once.length);
	});

	it('aynı dış eser ikinci kez eklenince var olan düğüm kullanılır', async () => {
		const dis = { disKaynak: 'openlibrary', disKimlik: 'OL1W', gorselUrl: null };
		const ilk = await veri.dugumVeGetireniKaydet(
			ali,
			{ kip: 'yeni', veri: { ...yeniVeri('Saatleri Ayarlama Enstitüsü'), ...dis } },
			yok,
			null
		);
		const ikinci = await veri.dugumVeGetireniKaydet(
			ali,
			{ kip: 'yeni', veri: { ...yeniVeri('Saatleri Ayarlama Enstitüsü'), ...dis } },
			yok,
			null
		);
		if (ilk === 'yetkisiz' || ikinci === 'yetkisiz') throw new Error();
		expect(ikinci).toMatchObject({ dugumId: ilk.dugumId, yeniMi: false });
	});
});

describe('eser durumu ve merak listesi', () => {
	it('"bitti" denince tarih boşsa bu ay yazılır; eser olmayanda durum yok', async () => {
		const merak = await veri.merakListesi(ali);
		const tutunamayanlar = merak.find((m) => m.baslik === 'Tutunamayanlar')!;
		expect(tutunamayanlar.getiren?.baslik).toBe('Selin Hoca');

		const sonuc = await veri.durumGuncelle(tutunamayanlar.id, ali, 'bitti');
		expect(sonuc?.tarihEklendi).toMatch(/^\d{4}-\d{2}-01$/);
		expect((await veri.merakListesi(ali)).map((m) => m.baslik)).not.toContain('Tutunamayanlar');

		expect(await veri.durumGuncelle(tutunamayanlar.id, banu, 'merak')).toBeNull();
		const selin = tutunamayanlar.getiren!.id;
		expect(await veri.durumGuncelle(selin, ali, 'bitti')).toBeNull();
	});

	it('veritabanı eser olmayan düğümde durumu reddeder', async () => {
		await expect(
			db.insert(dugumler).values({ sahipId: ali, tur: 'kisi', baslik: 'x', durum: 'merak' })
		).rejects.toThrow();
	});
});

describe('çöp kutusu', () => {
	it('çöpe atılan düğüm her yerden kaybolur, bağları ve iz durağıyla geri gelir', async () => {
		const { izId, eserId } = await izler.ilkIzOlustur(ali, {
			eser: { eserTuru: 'film', baslik: 'Babylon Berlin', altBaslik: null },
			getiren: { tur: 'kisi', eserTuru: null, baslik: 'Deniz', not: 'izle dedi' },
			giden: { tur: 'eser', eserTuru: 'kitap', baslik: 'Berlin Alexanderplatz', not: null },
			izBaslik: 'Berlin izi'
		});
		expect((await izler.izGetir(izId, ali))!.duraklar).toHaveLength(3);

		expect(await veri.dugumuCopeAt(eserId, banu)).toBeNull();
		expect(await veri.dugumuCopeAt(eserId, ali)).toMatchObject({ baslik: 'Babylon Berlin' });
		expect(await veri.dugumGetir(eserId, ali)).toBeNull();
		expect((await veri.haritaVerisi(ali)).dugumler.map((d) => d.id)).not.toContain(eserId);
		expect((await izler.izGetir(izId, ali))!.duraklar).toHaveLength(2);
		// Silinen düğüme bağ kurulamaz
		const deniz = (await veri.dugumSecenekleri(ali)).find((s) => s.baslik === 'Deniz')!;
		expect(
			await veri.bagKur(ali, {
				kaynakId: deniz.id,
				hedefId: eserId,
				not: null,
				tarih: null,
				tarihHassasiyeti: null
			})
		).toBe('yetkisiz');

		const kutu = await cop.copKutusu(ali);
		expect(kutu.dugumler.map((d) => [d.baslik, d.kalanGun])).toEqual([['Babylon Berlin', 30]]);
		expect(await cop.copSayisi(ali)).toBe(1);
		expect(await cop.copOgesi(ali, 'dugum', eserId)).toMatchObject({ baslik: 'Babylon Berlin' });
		expect(await cop.copOgesi(banu, 'dugum', eserId)).toBeNull();

		expect(await cop.geriYukle(banu, 'dugum', eserId)).toEqual({ sonuc: 'bulunamadi' });
		expect(await cop.geriYukle(ali, 'dugum', eserId)).toEqual({
			sonuc: 'geri-yuklendi',
			baslik: 'Babylon Berlin'
		});
		expect((await izler.izGetir(izId, ali))!.duraklar).toHaveLength(3);
		expect((await veri.dugumBaglari(eserId, ali)).gelen).toHaveLength(1);
	});

	it('aynı dış eser yeniden eklendiyse geri yükleme çakışma bildirir', async () => {
		const dis = { disKaynak: 'tmdb', disKimlik: 'movie/42', gorselUrl: null };
		const ilk = (await veri.dugumOlustur(ali, { ...yeniVeri('Dune'), ...dis })).id;
		await veri.dugumuCopeAt(ilk, ali);
		// Çöpteki eser tekil dizini meşgul etmez: aynı eser yeniden eklenebilir
		const ikinci = (await veri.dugumOlustur(ali, { ...yeniVeri('Dune'), ...dis })).id;
		expect(ikinci).not.toBe(ilk);
		expect(await cop.geriYukle(ali, 'dugum', ilk)).toEqual({ sonuc: 'cakisma' });
		expect(await cop.kaliciSil(banu, 'dugum', ilk)).toBe(false);
		expect(await cop.kaliciSil(ali, 'dugum', ilk)).toBe(true);
	});

	it('süresi dolan öğeler temizlenir; boşaltma yalnızca sahibininkileri siler', async () => {
		const eski = (await veri.dugumOlustur(ali, yeniVeri('Eski'))).id;
		const yakin = (await veri.dugumOlustur(ali, yeniVeri('Yakın'))).id;
		const banununki = (await veri.dugumOlustur(banu, yeniVeri('Banu’nun'))).id;
		await db
			.update(dugumler)
			.set({ silinme: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) })
			.where(eq(dugumler.id, eski));
		await veri.dugumuCopeAt(yakin, ali);
		await veri.dugumuCopeAt(banununki, banu);

		await cop.suresiDolanlariTemizle(ali);
		expect((await cop.copKutusu(ali)).dugumler.map((d) => d.baslik)).toEqual(['Yakın']);

		await cop.copuBosalt(ali);
		expect(await cop.copSayisi(ali)).toBe(0);
		expect(await cop.copSayisi(banu)).toBe(1);
	});

	it('kalan gün yuvarlanarak hesaplanır', () => {
		const simdi = new Date('2026-06-30T12:00:00Z');
		expect(cop.kalanGun(simdi, simdi)).toBe(30);
		expect(cop.kalanGun(new Date('2026-06-01T12:00:00Z'), simdi)).toBe(1);
		expect(cop.kalanGun(new Date('2026-05-01T00:00:00Z'), simdi)).toBe(0);
	});
});

describe('izler: durak geri alma ve ilk iz', () => {
	it('çıkarılan durak aynı sıraya geri konur', async () => {
		const secenekler = await veri.dugumSecenekleri(ali);
		const [a, b, c] = secenekler;
		const iz = await izler.izOlustur(
			ali,
			{ baslik: 'Sıra', aciklama: null, gizlilik: 'ozel' },
			a.id
		);
		await izler.durakEkle(iz.id, ali, b.id, 'not b');
		await izler.durakEkle(iz.id, ali, c.id);
		const ortadaki = (await izler.izGetir(iz.id, ali))!.duraklar[1];
		const cikan = await izler.durakCikar(ortadaki.adimId, ali);
		expect(cikan).toMatchObject({ izId: iz.id, dugumId: b.id, not: 'not b', sira: 2 });
		expect(await izler.durakEkle(iz.id, ali, b.id, cikan!.not, cikan!.sira)).toBe('eklendi');
		const sonra = (await izler.izGetir(iz.id, ali))!.duraklar;
		expect(sonra.map((d) => ('dugum' in d ? d.dugum.id : null))).toEqual([a.id, b.id, c.id]);
		expect(sonra[1]).toMatchObject({ not: 'not b' });
	});

	it('ilk iz sihirbazı düğümleri özel, eseri "bitti" ve bağları sıralı kurar', async () => {
		const { izId, eserId } = await izler.ilkIzOlustur(ali, {
			eser: { eserTuru: 'muzik', baslik: 'Kind of Blue', altBaslik: 'Miles Davis' },
			getiren: null,
			giden: { tur: 'karar', eserTuru: null, baslik: 'Trompet derslerine başladım', not: null },
			izBaslik: 'Caz'
		});
		const iz = (await izler.izGetir(izId, ali))!;
		expect(iz.iz.gizlilik).toBe('ozel');
		expect(iz.duraklar.map((d) => ('dugum' in d ? d.dugum.baslik : null))).toEqual([
			'Kind of Blue',
			'Trompet derslerine başladım'
		]);
		expect(iz.duraklar[0]).toMatchObject({ sonrakineBag: expect.anything() });
		const eser = (await veri.dugumGetir(eserId, ali))!.dugum;
		expect(eser).toMatchObject({ durum: 'bitti', gizlilik: 'ozel' });
		expect(await izler.izdekiDugumler(ali)).toContain(eserId);
	});
});

describe('açtığı kapılar ve ağ konumları', () => {
	it('kapılar ileri yönde derinliğe göre sıralanır ve görünmeyenden geçmez', async () => {
		const x = (await veri.dugumOlustur(ali, yeniVeri('X', { gizlilik: 'herkes' }))).id;
		const y = (await veri.dugumOlustur(ali, yeniVeri('Y'))).id;
		const z = (await veri.dugumOlustur(ali, yeniVeri('Z', { gizlilik: 'herkes' }))).id;
		const bag = (k: string, h: string) => ({
			kaynakId: k,
			hedefId: h,
			not: null,
			tarih: null,
			tarihHassasiyeti: null
		});
		await veri.bagKur(ali, bag(x, y));
		await veri.bagKur(ali, bag(y, z));
		await veri.bagKur(ali, bag(z, x)); // döngü
		const kapilar = await veri.actigiKapilar(x, ali);
		expect(kapilar.map((k) => [k.baslik, k.derinlik])).toEqual([
			['Y', 1],
			['Z', 2]
		]);
		// Banu için Y görünmez: X'ten öteye geçemez
		expect(await veri.actigiKapilar(x, banu)).toEqual([]);
	});

	it('konumlar yalnızca sahibinin düğümlerine yazılır ve güncellenir', async () => {
		const benim = (await veri.dugumOlustur(ali, yeniVeri('Konumlu'))).id;
		const onunki = (await veri.dugumOlustur(banu, yeniVeri('Başkasının'))).id;
		expect(
			await veri.konumlariKaydet(ali, [
				{ id: benim, x: 10, y: 20 },
				{ id: onunki, x: 1, y: 1 }
			])
		).toBe(1);
		await veri.konumlariKaydet(ali, [{ id: benim, x: 30, y: 40 }]);
		const satirlar = await db.select().from(agKonumlari);
		expect(satirlar.map((s) => [s.dugumId, s.x, s.y])).toEqual([[benim, 30, 40]]);
		const harita = await veri.haritaVerisi(ali);
		expect(harita.dugumler.find((d) => d.id === benim)).toMatchObject({ x: 30, y: 40 });
	});

	it('bağ silinince "geri al" için bilgisi döner', async () => {
		const [b] = await db.select().from(baglar).where(eq(baglar.sahipId, ali)).limit(1);
		const silinen = await veri.bagSil(b.id, ali);
		expect(silinen).toMatchObject({ kaynakId: b.kaynakId, hedefId: b.hedefId, not: b.not });
		expect(await veri.bagSil(b.id, ali)).toBeNull();
	});
});
