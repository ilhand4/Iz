// Aşama 3a (ilk parti): hesap ayarları, oturumlar, herkese açık profil ve veri taşıma.
// PGlite üzerinde gerçek migration'larla.
import { eq, inArray } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { baglar, dugumler, izAdimlari, izler, kullanicilar, oturumlar } =
	await import('./db/schema.ts');
const hesap = await import('./hesap.ts');
const { profilGetir, profilVerisi } = await import('./profil.ts');
const izModulu = await import('./izler.ts');
const { disaAktar, iceAktar } = await import('./disaIceAktar.ts');
const { iceAktarmaDogrula } = await import('./veriTasima.ts');
const { sifreOzetle, sifreDogrula } = await import('./sifre.ts');

const SIFRE = 'deneme-sifresi-1';
let ali: string, banu: string;
const d: Record<string, string> = {};

async function kullaniciEkle(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({
			kullaniciAdi: ad,
			eposta: `${ad}@iz.test`,
			ad: ad.toUpperCase(),
			sifreOzeti: await sifreOzetle(SIFRE)
		})
		.returning({ id: kullanicilar.id });
	return k.id;
}

async function dugum(
	sahipId: string,
	baslik: string,
	gizlilik: 'ozel' | 'herkes',
	ek: Partial<typeof dugumler.$inferInsert> = {}
) {
	const [x] = await db
		.insert(dugumler)
		.values({ sahipId, tur: 'ani', baslik, gizlilik, ...ek })
		.returning({ id: dugumler.id });
	return x.id;
}

beforeAll(async () => {
	ali = await kullaniciEkle('ali');
	banu = await kullaniciEkle('banu');
	d.acik1 = await dugum(ali, 'Açık bir', 'herkes');
	d.gizli = await dugum(ali, 'GİZLİ GÜNLÜK', 'ozel');
	d.acik2 = await dugum(ali, 'Açık iki', 'herkes', {
		tur: 'eser',
		eserTuru: 'kitap',
		disKaynak: 'openlibrary',
		disKimlik: 'OL1W'
	});
	await db.insert(baglar).values([
		{ sahipId: ali, kaynakId: d.acik1, hedefId: d.gizli, not: 'gizli not' },
		{ sahipId: ali, kaynakId: d.gizli, hedefId: d.acik2 },
		{ sahipId: ali, kaynakId: d.acik1, hedefId: d.acik2, not: 'açık not' }
	]);
	const [iz] = await db
		.insert(izler)
		.values({ sahipId: ali, baslik: 'Açık iz', gizlilik: 'herkes' })
		.returning({ id: izler.id });
	await db.insert(izAdimlari).values([
		{ izId: iz.id, dugumId: d.acik1, sira: 1 },
		{ izId: iz.id, dugumId: d.gizli, sira: 2, not: 'özel anı' },
		{ izId: iz.id, dugumId: d.acik2, sira: 3 }
	]);
	await db.insert(izler).values({ sahipId: ali, baslik: 'Özel iz', gizlilik: 'ozel' });
	d.iz = iz.id;
});

describe('herkese açık profil', () => {
	it('özel düğümleri, onlara değen bağları ve özel izleri hiç içermez', async () => {
		const profil = await profilGetir('ali');
		expect(profil).toMatchObject({ kullaniciAdi: 'ali', aramaMotorlari: false });
		const veri = await profilVerisi(ali);
		expect(veri.dugumler.map((x) => x.baslik).sort()).toEqual(['Açık bir', 'Açık iki']);
		expect(veri.ag.baglar.map((b) => b.not)).toEqual(['açık not']);
		expect(veri.izler.map((i) => i.baslik)).toEqual(['Açık iz']);
		expect(JSON.stringify(veri)).not.toContain('GİZLİ');
		expect(JSON.stringify(veri)).not.toContain('gizli not');
	});

	it('gölge düğüm yalnızca anonim şekil; gizliden geçen yol tek dolaylı bağ olur', async () => {
		const [g] = await db
			.insert(dugumler)
			.values({ sahipId: ali, tur: 'kisi', baslik: 'GÖLGEDEKİ KİŞİ', gizlilik: 'golge' })
			.returning({ id: dugumler.id });
		const [ara] = await db
			.insert(dugumler)
			.values({ sahipId: ali, tur: 'yer', baslik: 'GİZLİ ARA DURAK', gizlilik: 'ozel' })
			.returning({ id: dugumler.id });
		await db.insert(baglar).values([
			{ sahipId: ali, kaynakId: d.acik2, hedefId: g.id, not: 'gölgeye not' },
			{ sahipId: ali, kaynakId: g.id, hedefId: ara.id },
			{ sahipId: ali, kaynakId: ara.id, hedefId: d.acik1 }
		]);
		const ilk = await profilVerisi(ali);
		const metin = JSON.stringify(ilk);
		expect(metin).not.toContain('GÖLGEDEKİ');
		expect(metin).not.toContain('GİZLİ ARA');
		expect(metin).not.toContain('gölgeye not');
		expect(metin).not.toContain(g.id);
		expect(metin).not.toContain(ara.id);
		const golge = ilk.ag.dugumler.find((x) => x.golge)!;
		expect(golge).toMatchObject({ tur: 'kisi', baslik: '' });
		expect(ilk.ag.baglar.filter((b) => b.dolayli).map((b) => [b.kaynakId, b.hedefId])).toEqual([
			[golge.id, d.acik1]
		]);
		// Anonim kimlik her istekte değişir (izlenemez)
		const ikinci = await profilVerisi(ali);
		expect(ikinci.ag.dugumler.find((x) => x.golge)!.id).not.toBe(golge.id);
		// Gölge düğümün sayfası başkasına kapalı
		const veriModulu = await import('./dugumler.ts');
		expect(await veriModulu.dugumGetir(g.id, banu)).toBeNull();
		// Sonraki testlerin verisini etkilemesin (bağlar zincirleme silinir)
		await db.delete(dugumler).where(inArray(dugumler.id, [g.id, ara.id]));
	});

	it('iz önizlemesi başkasına özel durak başlığını göstermez ama sayıyı doğru verir', async () => {
		const [baskasina] = await izModulu.izleriListele(ali, { izleyenId: banu });
		expect(baskasina.durakSayisi).toBe(3);
		expect(baskasina.duraklar.map((x) => x.baslik)).toEqual(['Açık bir', 'Açık iki']);
		const sahibine = await izModulu.izleriListele(ali);
		expect(sahibine.map((i) => i.baslik).sort()).toEqual(['Açık iz', 'Özel iz']);
		expect(sahibine.find((i) => i.baslik === 'Açık iz')!.duraklar).toHaveLength(3);
	});

	it('düğümün geçtiği izler önizlemeli ve izleyene göre süzülür', async () => {
		expect((await izModulu.dugumunIzleri(d.acik1, banu)).map((i) => i.baslik)).toEqual(['Açık iz']);
		expect(await izModulu.dugumunIzleri(d.gizli, null)).toHaveLength(1);
		const [ozet] = await izModulu.dugumunIzleri(d.gizli, null);
		expect(JSON.stringify(ozet)).not.toContain('GİZLİ');
	});

	it('olmayan kullanıcı adı null döner', async () => {
		expect(await profilGetir('yok_boyle')).toBeNull();
	});
});

describe('hesap ayarları', () => {
	it('profil güncellenir', async () => {
		await hesap.profilGuncelle(ali, { ad: 'Ali Veli', hakkinda: 'Okur', aramaMotorlari: true });
		expect(await hesap.hesapGetir(ali)).toMatchObject({
			ad: 'Ali Veli',
			hakkinda: 'Okur',
			aramaMotorlari: true
		});
	});

	it('e-posta değişimi şifre ister ve başkasının adresini almaz', async () => {
		expect(await hesap.epostaDegistir(ali, 'yanlis-sifre-1', 'yeni@iz.test')).toBe('yanlis');
		expect(await hesap.epostaDegistir(ali, SIFRE, 'banu@iz.test')).toBe('kullaniliyor');
		expect(await hesap.epostaDegistir(ali, SIFRE, 'ali.yeni@iz.test')).toBe('tamam');
		expect((await hesap.hesapGetir(ali))?.eposta).toBe('ali.yeni@iz.test');
	});

	it('şifre değişince diğer oturumlar kapanır, mevcut oturum kalır', async () => {
		const gelecek = new Date(Date.now() + 86_400_000);
		await db.insert(oturumlar).values([
			{ id: 'a'.repeat(64), kullaniciId: ali, bitis: gelecek, cihaz: 'Edge · Windows' },
			{ id: 'b'.repeat(64), kullaniciId: ali, bitis: gelecek, cihaz: 'Safari · iPhone' },
			{ id: 'c'.repeat(64), kullaniciId: banu, bitis: gelecek }
		]);
		const liste = await hesap.oturumlariListele(ali, 'a'.repeat(64));
		expect(liste.map((o) => [o.cihaz, o.mevcut])).toEqual([
			['Edge · Windows', true],
			['Safari · iPhone', false]
		]);
		expect(liste[0].id).toHaveLength(16);

		expect(await hesap.sifreDegistir(ali, 'yanlis-sifre-1', 'yeni-sifre-12', 'a'.repeat(64))).toBe(
			'yanlis'
		);
		expect(await hesap.sifreDegistir(ali, SIFRE, 'yeni-sifre-12', 'a'.repeat(64))).toBe('tamam');
		const kalan = await db.select({ id: oturumlar.id }).from(oturumlar);
		expect(kalan.map((o) => o.id[0]).sort()).toEqual(['a', 'c']);
		const [k] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, ali));
		expect(await sifreDogrula(k.sifreOzeti, 'yeni-sifre-12')).toBe(true);
	});

	it('oturum kapatma yalnızca kendi oturumlarında çalışır', async () => {
		expect(await hesap.oturumuKapat(ali, 'c'.repeat(16))).toBe(false);
		expect(await hesap.oturumuKapat(ali, 'zz')).toBe(false);
		const gelecek = new Date(Date.now() + 86_400_000);
		await db.insert(oturumlar).values({ id: 'd'.repeat(64), kullaniciId: ali, bitis: gelecek });
		expect(await hesap.oturumuKapat(ali, 'd'.repeat(16))).toBe(true);
		expect(await hesap.digerOturumlariKapat(ali, 'a'.repeat(64))).toBe(0);
	});
});

describe('veri taşıma', () => {
	it('dışa aktarılan veri başka bir hesaba aynı yapıyla içe aktarılır', async () => {
		const disari = await disaAktar(ali);
		expect(disari.dugumler).toHaveLength(3);
		expect(disari.baglar).toHaveLength(3);
		expect(disari.izler.map((i) => [i.baslik, i.duraklar.length])).toEqual([
			['Açık iz', 3],
			['Özel iz', 0]
		]);

		// JSON'a yazılıp okunmuş gibi
		const sonuc = iceAktarmaDogrula(JSON.parse(JSON.stringify(disari)));
		if (!sonuc.tamam) throw new Error(sonuc.hata);
		// Banu'nun haritasında aynı Open Library eseri zaten var: birleşmeli
		await dugum(banu, 'Banu’nun kopyası', 'ozel', {
			tur: 'eser',
			eserTuru: 'kitap',
			disKaynak: 'openlibrary',
			disKimlik: 'OL1W'
		});
		const rapor = await iceAktar(banu, sonuc);
		expect(rapor).toEqual({ dugum: 2, birlesen: 1, bag: 3, iz: 2, atlanan: 0 });

		const banununki = await disaAktar(banu);
		expect(banununki.dugumler.map((x) => x.baslik).sort()).toEqual([
			'Açık bir',
			'Banu’nun kopyası',
			'GİZLİ GÜNLÜK'
		]);
		// Kimlikler yeni: Ali'nin kimliklerinden hiçbiri Banu'da yok
		const aliKimlikleri = new Set(disari.dugumler.map((x) => x.id));
		expect(banununki.dugumler.some((x) => aliKimlikleri.has(x.id))).toBe(false);
		expect(banununki.izler.find((i) => i.baslik === 'Açık iz')!.duraklar).toHaveLength(3);
	});

	it('aynı dosya içinde yinelenen dış eser tek düğüme iner', async () => {
		const id1 = '11111111-1111-4111-8111-111111111111';
		const id2 = '22222222-2222-4222-8222-222222222222';
		const id3 = '33333333-3333-4333-8333-333333333333';
		const eser = (id: string) => ({
			id,
			tur: 'eser',
			eserTuru: 'film',
			baslik: 'Dune',
			disKaynak: 'tmdb',
			disKimlik: 'movie/438631'
		});
		const sonuc = iceAktarmaDogrula({
			bicim: 'iz-disa-aktarma',
			surum: 1,
			dugumler: [eser(id1), eser(id2), { id: id3, tur: 'kisi', baslik: 'Deniz' }],
			baglar: [
				{ kaynakId: id3, hedefId: id1 },
				{ kaynakId: id3, hedefId: id2 }
			],
			izler: []
		});
		if (!sonuc.tamam) throw new Error(sonuc.hata);
		const yeni = await kullaniciEkle('cem');
		const rapor = await iceAktar(yeni, sonuc);
		expect(rapor).toMatchObject({ dugum: 2, birlesen: 1, bag: 1 });
	});
});
