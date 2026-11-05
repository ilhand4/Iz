// Zaman kapsülü, dijital vasiyet ve yakınlara soru (PGlite üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { baglar, bildirimKutusu, dugumler, kullanicilar } = await import('./db/schema.ts');
const d = await import('./dugumler.ts');
const v = await import('./vasiyet.ts');
const s = await import('./sorular.ts');
const { kuyrukAyarla } = await import('./yaziyaDokme.ts');

let ali: string;
let ayse: string;
let cem: string;

beforeAll(async () => {
	const k = await db
		.insert(kullanicilar)
		.values(
			['ali', 'ayse', 'cem'].map((ad) => ({
				kullaniciAdi: ad,
				eposta: `${ad}@iz.test`,
				ad: ad.toUpperCase(),
				sifreOzeti: 'x'
			}))
		)
		.returning({ id: kullanicilar.id });
	[ali, ayse, cem] = k.map((x) => x.id);
	kuyrukAyarla({ isleyici: async () => 'kapali' });
});

describe('zaman kapsülü', () => {
	it('açılış gününe kadar açıklama sahibine bile gitmez ve düğüm değiştirilemez', async () => {
		const [n] = await db
			.insert(dugumler)
			.values({
				sahipId: ali,
				tur: 'ani',
				baslik: 'Kızıma mektup',
				aciklama: 'Gizli satırlar',
				muhurTarihi: '2099-01-01'
			})
			.returning({ id: dugumler.id });
		const g = (await d.dugumGetir(n.id, ali))!;
		expect(g.dugum).toMatchObject({ baslik: 'Kızıma mektup', aciklama: null, muhurlu: true });
		const veri = {
			tur: 'ani' as const,
			eserTuru: null,
			baslik: 'Değişti',
			altBaslik: null,
			aciklama: null,
			tarih: null,
			tarihHassasiyeti: null,
			yil: null,
			enlem: null,
			boylam: null,
			yerAdi: null,
			gizlilik: 'ozel' as const,
			durum: null
		};
		expect(await d.dugumGuncelle(n.id, ali, veri)).toBe(false);
		expect(await d.kapsuluAc(n.id, ayse)).toBe(false);
		expect(await d.kapsuluAc(n.id, ali)).toBe(true);
		expect((await d.dugumGetir(n.id, ali))!.dugum).toMatchObject({
			aciklama: 'Gizli satırlar',
			muhurlu: false
		});
	});
});

describe('dijital vasiyet', () => {
	it('süre dolana kadar varis hiçbir şey göremez; dolunca özel arşiv salt okunur açılır', async () => {
		const [ozel] = await db
			.insert(dugumler)
			.values({ sahipId: ali, tur: 'ani', baslik: 'Özel anı' })
			.returning({ id: dugumler.id });
		expect(await v.vasiyetKaydet(ali, 'ali', 12)).toBe('kendisi');
		expect(await v.vasiyetKaydet(ali, 'yok_boyle', 12)).toBe('yok');
		expect(await v.vasiyetKaydet(ali, '@AYSE', 12)).toBe('tamam');
		expect(await v.vasiyetGetir(ali)).toMatchObject({
			beklemeAy: 12,
			varis: { kullaniciAdi: 'ayse' }
		});

		// Ali yakın zamanda geldi: kapalı
		expect(await d.dugumGetir(ozel.id, ayse)).toBeNull();
		expect(await v.banaEmanetler(ayse)).toEqual([
			{ ad: 'ALI', kullaniciAdi: 'ali', beklemeAy: 12, acik: false }
		]);
		expect(await v.acikEmanet(ayse, 'ali')).toBeNull();

		// 13 aydır gelmiyor: açık, ama yalnızca varise ve salt okunur
		await db
			.update(kullanicilar)
			.set({ sonEtkinlik: new Date(Date.now() - 400 * 86400_000) })
			.where(eq(kullanicilar.id, ali));
		expect((await d.dugumGetir(ozel.id, ayse))?.dugum.baslik).toBe('Özel anı');
		expect(await d.dugumGetir(ozel.id, cem)).toBeNull();
		expect(await v.acikEmanet(ayse, 'ali')).toMatchObject({ sahipId: ali });
		expect(await d.dugumuCopeAt(ozel.id, ayse)).toBeNull();

		await v.vasiyetSil(ali);
		expect(await d.dugumGetir(ozel.id, ayse)).toBeNull();
	});
});

describe('yakınlara soru', () => {
	it('bağlantıyla bir kez yanıtlanır, bildirim gider, yanıttan anı oluşur', async () => {
		const [kisi] = await db
			.insert(dugumler)
			.values({ sahipId: cem, tur: 'kisi', baslik: 'Babaannem' })
			.returning({ id: dugumler.id });
		const { id, jeton } = await s.soruOlustur(cem, {
			aliciAdi: 'Babaanne',
			metin: 'Çocukken oturduğun evi anlatır mısın?',
			kisiId: kisi.id
		});
		expect(await s.jetonlaSoru('gecersiz')).toBeNull();
		expect((await s.jetonlaSoru(jeton))?.soran).toBe('CEM');
		expect(await s.yanittanAni(cem, id)).toBeNull();
		expect(await s.yanitKaydet(jeton, { metin: 'Bahçeli bir evdi.', ses: null })).toBe('tamam');
		expect(await s.yanitKaydet(jeton, { metin: 'İkinci', ses: null })).toBe('yanitlanmis');
		expect(
			await db.select().from(bildirimKutusu).where(eq(bildirimKutusu.aliciId, cem))
		).toHaveLength(1);

		expect(await s.yanittanAni(ali, id)).toBeNull();
		const aniId = (await s.yanittanAni(cem, id))!;
		expect(await s.yanittanAni(cem, id)).toBe(aniId);
		const [ani] = await db.select().from(dugumler).where(eq(dugumler.id, aniId));
		expect(ani).toMatchObject({ tur: 'ani', gizlilik: 'ozel' });
		expect(ani.aciklama).toContain('Bahçeli bir evdi.');
		const [bag] = await db.select().from(baglar).where(eq(baglar.hedefId, aniId));
		expect(bag.kaynakId).toBe(kisi.id);
		const [liste] = await s.sorulariListele(cem);
		expect(liste.aniId).toBe(aniId);
	});
});
