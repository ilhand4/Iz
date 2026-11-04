// Gruplar, "grup" gizliliği ve ortak izler (PGlite üzerinde).
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const grup = await import('./gruplar.ts');
const veri = await import('./dugumler.ts');
const izModulu = await import('./izler.ts');

let ali: string, banu: string, cem: string;
let grupId: string;
const d: Record<string, string> = {};

async function kullanici(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	return k.id;
}

async function dugum(sahipId: string, baslik: string, gizlilik: 'ozel' | 'grup' | 'herkes') {
	const [x] = await db
		.insert(dugumler)
		.values({ sahipId, tur: 'ani', baslik, gizlilik })
		.returning({ id: dugumler.id });
	return x.id;
}

beforeAll(async () => {
	ali = await kullanici('ali');
	banu = await kullanici('banu');
	cem = await kullanici('cem');
	d.aliGrup = await dugum(ali, 'Ali grup anısı', 'grup');
	d.aliOzel = await dugum(ali, 'Ali özel', 'ozel');
	d.banuGrup = await dugum(banu, 'Banu grup anısı', 'grup');
	d.banuOzel = await dugum(banu, 'Banu özel', 'ozel');
});

describe('davet ve üyelik', () => {
	it('grup kurulur, davetle katılınır; eski davet yenilenince geçersizleşir', async () => {
		grupId = await grup.grupOlustur(ali, { ad: 'Aile', aciklama: null });
		expect(await grup.davetYenile(grupId, banu)).toBeNull();
		const eski = (await grup.davetYenile(grupId, ali))!;
		const yeni = (await grup.davetYenile(grupId, ali))!;
		expect(await grup.davetCoz(eski)).toBeNull();
		expect(await grup.davetCoz(yeni)).toMatchObject({ ad: 'Aile', uyeSayisi: 1 });
		expect(await grup.davetleKatil(yeni, banu)).toBe(grupId);
		// İkinci kez katılmak sorun değil
		expect(await grup.davetleKatil(yeni, banu)).toBe(grupId);
		expect((await grup.grupGetir(grupId, banu))?.uyeler.map((u) => u.rol)).toEqual([
			'yonetici',
			'uye'
		]);
		expect(await grup.grupGetir(grupId, cem)).toBeNull();
		await grup.davetKapat(grupId, ali);
		expect(await grup.davetCoz(yeni)).toBeNull();
	});
});

describe('"grup" gizliliği', () => {
	it('grup arkadaşı görür, başkası ve ziyaretçi göremez; özel içerik özel kalır', async () => {
		expect(await veri.dugumGetir(d.aliGrup, banu)).not.toBeNull();
		expect(await veri.dugumGetir(d.aliGrup, cem)).toBeNull();
		expect(await veri.dugumGetir(d.aliGrup, null)).toBeNull();
		expect(await veri.dugumGetir(d.aliOzel, banu)).toBeNull();
	});
});

describe('ortak izler', () => {
	let izId: string;

	it('üye ortak izi görür ve kendi düğümünü durak olarak ekler; grup dışı göremez', async () => {
		const iz = await izModulu.izOlustur(
			ali,
			{ baslik: 'Aile yolu', aciklama: null, gizlilik: 'ozel', ortakGrupId: grupId },
			d.aliGrup
		);
		izId = iz.id;
		const banuyaGore = await izModulu.izGetir(izId, banu);
		expect(banuyaGore).toMatchObject({ duzenleyebilir: true, sahibiMi: false });
		expect(banuyaGore?.ortakGrup?.ad).toBe('Aile');
		expect(await izModulu.izGetir(izId, cem)).toBeNull();

		expect(await izModulu.durakEkle(izId, banu, d.banuOzel)).toBe('eklendi');
		expect(await izModulu.durakEkle(izId, banu, d.banuGrup)).toBe('eklendi');
		// Başkasının düğümü eklenemez
		expect(await izModulu.durakEkle(izId, banu, d.aliOzel)).toBe('yetkisiz');
		expect(await izModulu.durakEkle(izId, cem, d.aliGrup)).toBe('yetkisiz');
	});

	it('üyenin özel düğümü ötekilere gizli durak; ortak izler listesi önizlemesi de gizler', async () => {
		const aliyeGore = (await izModulu.izGetir(izId, ali))!;
		expect(aliyeGore.duraklar.map((x) => izModulu.gizliMi(x))).toEqual([false, true, false]);
		expect(JSON.stringify(aliyeGore)).not.toContain('Banu özel');

		const liste = await grup.ortakIzler(grupId, ali);
		expect(liste[0]).toMatchObject({ baslik: 'Aile yolu', durakSayisi: 3 });
		expect(liste[0].duraklar.map((x) => x.baslik)).toEqual(['Ali grup anısı', 'Banu grup anısı']);
		expect(await grup.gruplarimdakiOrtakIzler(banu)).toHaveLength(1);
		expect(await grup.gruplarimdakiOrtakIzler(ali)).toHaveLength(0);
	});

	it('üye yalnızca kendi durağını çıkarır; sahip hepsini; bilgileri yalnızca sahip değiştirir', async () => {
		const duraklar = (await izModulu.izGetir(izId, ali))!.duraklar;
		const aliDuragi = duraklar[0].adimId;
		const banuDuragi = duraklar[1].adimId;
		expect(await izModulu.durakCikar(aliDuragi, banu)).toBeNull();
		expect(await izModulu.durakCikar(banuDuragi, banu)).toMatchObject({ izId });
		expect(
			await izModulu.izGuncelle(izId, banu, { baslik: 'x', aciklama: null, gizlilik: 'herkes' })
		).toBe(false);
		// Üye sırayı değiştirebilir
		const kalan = (await izModulu.izGetir(izId, banu))!.duraklar.map((x) => x.adimId);
		expect(await izModulu.duraklariSirala(izId, banu, [...kalan].reverse())).toBe(true);
	});

	it('üye olmadığı gruba ortak iz bağlanamaz', async () => {
		const baska = await grup.grupOlustur(cem, { ad: 'Cem kulübü', aciklama: null });
		const iz = await izModulu.izOlustur(ali, {
			baslik: 'Sızma',
			aciklama: null,
			gizlilik: 'ozel',
			ortakGrupId: baska
		});
		expect((await izModulu.izGetir(iz.id, ali))?.ortakGrup).toBeNull();
		expect(await izModulu.izGetir(iz.id, cem)).toBeNull();
	});
});

describe('ayrılma', () => {
	it('son yönetici ayrılınca en eski üye yönetici olur; son üye ayrılınca grup silinir', async () => {
		expect(await grup.uyeCikar(grupId, banu, ali)).toBe(false);
		expect(await grup.gruptanAyril(grupId, ali)).toBe(true);
		expect((await grup.grupGetir(grupId, banu))?.rolum).toBe('yonetici');
		// Ayrılan artık grup içeriğini göremez
		expect(await veri.dugumGetir(d.banuGrup, ali)).toBeNull();
		expect(await grup.gruptanAyril(grupId, banu)).toBe(true);
		expect(await grup.gruplarim(banu)).toEqual([]);
	});
});
