// Veri katmanı entegrasyon testleri: gerçek migration'larla kurulan bellek içi PostgreSQL (PGlite).
import { asc, eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, izAdimlari, kullanicilar } = await import('./db/schema.ts');
const veri = await import('./dugumler.ts');
const izler = await import('./izler.ts');

type Kimlik = string;
let ali: Kimlik, banu: Kimlik;
/** Ali'nin düğümleri: ozel1, acik (herkes), ozel2; Banu'nun: banuOzel, banuAcik */
const d: Record<'ozel1' | 'acik' | 'ozel2' | 'banuOzel' | 'banuAcik', Kimlik> = {} as never;

async function kullaniciEkle(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'test' })
		.returning({ id: kullanicilar.id });
	return k.id;
}

async function dugumEkle(sahipId: string, baslik: string, gizlilik: 'ozel' | 'herkes') {
	const [x] = await db
		.insert(dugumler)
		.values({ sahipId, tur: 'ani', baslik, gizlilik })
		.returning({ id: dugumler.id });
	return x.id;
}

const bag = (kaynakId: string, hedefId: string, not: string | null = null) => ({
	kaynakId,
	hedefId,
	not,
	tarih: null,
	tarihHassasiyeti: null
});

beforeAll(async () => {
	ali = await kullaniciEkle('ali');
	banu = await kullaniciEkle('banu');
	d.ozel1 = await dugumEkle(ali, 'Ali özel 1', 'ozel');
	d.acik = await dugumEkle(ali, 'Ali açık', 'herkes');
	d.ozel2 = await dugumEkle(ali, 'Ali özel 2', 'ozel');
	d.banuOzel = await dugumEkle(banu, 'Banu özel', 'ozel');
	d.banuAcik = await dugumEkle(banu, 'Banu açık', 'herkes');
});

describe('düğüm görünürlüğü ve yazma yetkisi', () => {
	it('sahibi özel düğümünü görür; başkası ve ziyaretçi göremez', async () => {
		expect(await veri.dugumGetir(d.ozel1, ali)).not.toBeNull();
		expect(await veri.dugumGetir(d.ozel1, banu)).toBeNull();
		expect(await veri.dugumGetir(d.ozel1, null)).toBeNull();
	});

	it('herkese açık düğümü herkes görür', async () => {
		expect((await veri.dugumGetir(d.acik, banu))?.dugum.baslik).toBe('Ali açık');
		expect(await veri.dugumGetir(d.acik, null)).not.toBeNull();
	});

	it('başkası düğümü güncelleyemez ve silemez', async () => {
		const degisiklik = {
			tur: 'ani' as const,
			eserTuru: null,
			baslik: 'ele geçirildi',
			altBaslik: null,
			aciklama: null,
			tarih: null,
			tarihHassasiyeti: null,
			yil: null,
			enlem: null,
			boylam: null,
			yerAdi: null,
			gizlilik: 'herkes' as const
		};
		expect(await veri.dugumGuncelle(d.acik, banu, degisiklik)).toBe(false);
		expect(await veri.dugumSil(d.acik, banu)).toBe(false);
		expect((await veri.dugumGetir(d.acik, ali))?.dugum.baslik).toBe('Ali açık');
	});

	it('harita verisi yalnızca kullanıcının kendi düğümlerini içerir', async () => {
		const { dugumler: liste } = await veri.haritaVerisi(banu);
		expect(liste.map((x) => x.baslik).sort()).toEqual(['Banu açık', 'Banu özel']);
	});
});

describe('bağlar', () => {
	it('yalnızca iki ucu da kendine ait düğümler arasında bağ kurulur', async () => {
		expect(await veri.bagKur(ali, bag(d.ozel1, d.banuAcik))).toBe('yetkisiz');
		expect(await veri.bagKur(banu, bag(d.ozel1, d.acik))).toBe('yetkisiz');
		expect(await veri.bagKur(ali, bag(d.ozel1, d.ozel1))).toBe('yetkisiz');
		expect(await veri.bagKur(ali, bag(d.ozel1, d.acik, 'rafta buldum'))).toBe('kuruldu');
		expect(await veri.bagKur(ali, bag(d.ozel1, d.acik))).toBe('zaten-var');
	});

	it('başkası bağ notunu değiştiremez ve bağı silemez', async () => {
		const { gelen } = await veri.dugumBaglari(d.acik, ali);
		const bagId = gelen[0].id;
		const bilgi = { not: 'değişti', tarih: null, tarihHassasiyeti: null };
		expect(await veri.bagGuncelle(bagId, banu, bilgi)).toBe(false);
		expect(await veri.bagSil(bagId, banu)).toBe(false);
		expect(await veri.bagGuncelle(bagId, ali, bilgi)).toBe(true);
		expect((await veri.dugumBaglari(d.acik, ali)).gelen[0].not).toBe('değişti');
	});

	it('karşı ucu görünmeyen bağ başkasına gösterilmez', async () => {
		expect((await veri.dugumBaglari(d.acik, ali)).gelen).toHaveLength(1);
		expect((await veri.dugumBaglari(d.acik, banu)).gelen).toHaveLength(0);
	});

	it('"geldiğin yol" döngüde takılmaz ve görünmeyen düğümlerden geçmez', async () => {
		// ozel1 → acik → ozel2 → ozel1 (döngü)
		await veri.bagKur(ali, bag(d.acik, d.ozel2));
		await veri.bagKur(ali, bag(d.ozel2, d.ozel1));
		const yol = await veri.geldigiYol(d.ozel1, ali);
		expect(yol.map((y) => [y.baslik, y.derinlik])).toEqual([
			['Ali özel 2', 1],
			['Ali açık', 2]
		]);
		expect(await veri.geldigiYol(d.acik, banu)).toEqual([]);
	});
});

describe('izler', () => {
	let izId: string;

	async function siralar() {
		const satirlar = await db
			.select({ dugumId: izAdimlari.dugumId, sira: izAdimlari.sira })
			.from(izAdimlari)
			.where(eq(izAdimlari.izId, izId))
			.orderBy(asc(izAdimlari.sira));
		return satirlar;
	}

	it('ilk durakla oluşturulur; durak eklemede sahiplik denetlenir', async () => {
		const iz = await izler.izOlustur(ali, { baslik: 'Test izi', aciklama: null, gizlilik: 'herkes' }, d.ozel1);
		izId = iz.id;
		expect(await izler.durakEkle(izId, ali, d.acik)).toBe('eklendi');
		expect(await izler.durakEkle(izId, ali, d.acik)).toBe('zaten-var');
		expect(await izler.durakEkle(izId, banu, d.banuAcik)).toBe('yetkisiz');
		expect(await izler.durakEkle(izId, ali, d.banuAcik)).toBe('yetkisiz');
		expect(await izler.durakEkle(izId, ali, d.ozel2)).toBe('eklendi');
		expect((await siralar()).map((s) => s.sira)).toEqual([1, 2, 3]);
	});

	it('sıralama tam ve tekrarsız bir liste ister', async () => {
		const ayrinti = (await izler.izGetir(izId, ali))!;
		const idler = ayrinti.duraklar.map((x) => x.adimId);
		expect(await izler.duraklariSirala(izId, ali, idler.slice(1))).toBe(false);
		expect(await izler.duraklariSirala(izId, ali, [idler[0], idler[0], idler[1]])).toBe(false);
		expect(await izler.duraklariSirala(izId, banu, [...idler].reverse())).toBe(false);
		expect(await izler.duraklariSirala(izId, ali, [...idler].reverse())).toBe(true);
		expect((await siralar()).map((s) => s.dugumId)).toEqual([d.ozel2, d.acik, d.ozel1]);
	});

	it('durak taşınır ve çıkarılınca sıra yeniden numaralanır', async () => {
		const ayrinti = (await izler.izGetir(izId, ali))!;
		const ilk = ayrinti.duraklar[0].adimId;
		expect(await izler.durakTasi(ilk, ali, 'asagi')).toBe(true);
		expect((await siralar()).map((s) => s.dugumId)).toEqual([d.acik, d.ozel2, d.ozel1]);
		expect(await izler.durakTasi(ilk, banu, 'asagi')).toBe(false);
		expect(await izler.durakCikar(ilk, ali)).toBe(true);
		expect(await siralar()).toEqual([
			{ dugumId: d.acik, sira: 1 },
			{ dugumId: d.ozel1, sira: 2 }
		]);
	});

	it('herkese açık izde başkası özel durakları "gizli" görür', async () => {
		const sahibine = (await izler.izGetir(izId, ali))!;
		expect(sahibine.gorunmeyenDurakSayisi).toBe(1);
		expect(sahibine.duraklar.every((x) => !izler.gizliMi(x))).toBe(true);
		// acik → ozel1 bağı yok; ozel1 → acik var ama ters yönde
		expect(sahibine.duraklar[0]).toMatchObject({ sonrakineBag: null });

		const baskasina = (await izler.izGetir(izId, banu))!;
		expect(baskasina.sahibiMi).toBe(false);
		expect(baskasina.gorunmeyenDurakSayisi).toBe(0);
		expect(baskasina.duraklar.map((x) => izler.gizliMi(x))).toEqual([false, true]);
		expect(JSON.stringify(baskasina)).not.toContain('Ali özel 1');
	});

	it('özel iz başkasına hiç görünmez; başkası düzenleyemez ya da silemez', async () => {
		const ozel = await izler.izOlustur(ali, { baslik: 'Gizli iz', aciklama: null, gizlilik: 'ozel' });
		expect(await izler.izGetir(ozel.id, banu)).toBeNull();
		expect(await izler.izGetir(ozel.id, null)).toBeNull();
		expect(await izler.izGuncelle(ozel.id, banu, { baslik: 'x', aciklama: null, gizlilik: 'herkes' })).toBe(false);
		expect(await izler.izSil(ozel.id, banu)).toBe(false);
		expect(await izler.izSil(ozel.id, ali)).toBe(true);
	});

	it('öneriler son duraktan giden ve izde olmayan düğümlerdir', async () => {
		// Son durak ozel1; ozel1 → acik bağı var ama acik zaten izde
		expect(await izler.sonrakiDurakOnerileri(izId, ali)).toEqual([]);
		await veri.bagKur(ali, bag(d.ozel1, d.ozel2, 'sonra bu'));
		const oneriler = await izler.sonrakiDurakOnerileri(izId, ali);
		expect(oneriler.map((o) => [o.baslik, o.not])).toEqual([['Ali özel 2', 'sonra bu']]);
		expect(await izler.sonrakiDurakOnerileri(izId, banu)).toEqual([]);
	});

	it('düğüm sayfası için iz seçenekleri ve düğümün geçtiği izler', async () => {
		expect((await izler.izSecenekleri(ali, d.acik)).map((i) => i.id)).not.toContain(izId);
		expect((await izler.izSecenekleri(ali, d.ozel2)).map((i) => i.id)).toContain(izId);
		expect((await izler.dugumunIzleri(d.acik, banu)).map((i) => i.baslik)).toEqual(['Test izi']);
		expect(await izler.izSayisi(ali)).toBe(1);
	});

	it('liste önizlemesi ilk ve son durağı verir', async () => {
		const [ozet] = await izler.izleriListele(ali);
		expect(ozet).toMatchObject({
			baslik: 'Test izi',
			durakSayisi: 2,
			ilkDurak: { baslik: 'Ali açık' },
			sonDurak: { baslik: 'Ali özel 1' }
		});
	});
});
