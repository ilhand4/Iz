// Çeviri Masası (PGlite): erişim, telif sınırı, oy ve yorum.
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, grupUyeleri, gruplar, kullanicilar } = await import('./db/schema.ts');
const m = await import('./ceviriMasasi.ts');

let ali: string;
let ayse: string;
let cem: string;
let eser: string;
let masa: string;

const ceviri = (ek: Partial<Parameters<typeof m.ceviriEkle>[2]> = {}) => ({
	metin: 'Temmuz başlarında, çok sıcak bir akşamüstü…',
	cevirmen: 'Mazlum Beyhan',
	yayinevi: null,
	yil: 1983,
	dayanak: 'alinti' as const,
	...ek
});

beforeAll(async () => {
	const k = await db
		.insert(kullanicilar)
		.values(
			['ali', 'ayse', 'cem'].map((ad) => ({
				kullaniciAdi: ad,
				eposta: `${ad}@iz.test`,
				ad,
				sifreOzeti: 'x'
			}))
		)
		.returning({ id: kullanicilar.id });
	[ali, ayse, cem] = k.map((x) => x.id);
	const [g] = await db.insert(gruplar).values({ ad: 'Kulüp' }).returning({ id: gruplar.id });
	await db.insert(grupUyeleri).values([
		{ grupId: g.id, kullaniciId: ali },
		{ grupId: g.id, kullaniciId: ayse }
	]);
	const [e] = await db
		.insert(dugumler)
		.values({ sahipId: ali, tur: 'eser', eserTuru: 'kitap', baslik: 'Suç ve Ceza' })
		.returning({ id: dugumler.id });
	eser = e.id;
});

describe('çeviri masası', () => {
	it('özel masa yalnızca sahibine görünür; başkasının eseri bağlanamaz', async () => {
		masa = await m.masaOlustur(ali, {
			baslik: 'Suç ve Ceza',
			ozgunDil: 'Rusça',
			aciklama: null,
			gizlilik: 'ozel',
			eserId: eser
		});
		expect((await m.masaGetir(masa, ali))?.eser?.baslik).toBe('Suç ve Ceza');
		expect(await m.masaGetir(masa, ayse)).toBeNull();
		expect(await m.masaGetir(masa, null)).toBeNull();
		const baska = await m.masaOlustur(ayse, {
			baslik: 'X',
			ozgunDil: null,
			aciklama: null,
			gizlilik: 'ozel',
			eserId: eser
		});
		expect((await m.masaGetir(baska, ayse))?.masa.eserId).toBeNull();
	});

	it('grup masasına grup arkadaşı çeviri ekler; yabancı ekleyemez ama herkese açıkta oy verir', async () => {
		await m.masaGuncelle(masa, ali, {
			baslik: 'Suç ve Ceza',
			ozgunDil: 'Rusça',
			aciklama: null,
			gizlilik: 'grup',
			eserId: eser
		});
		const p = (await m.paragrafEkle(masa, ali, { yer: '1. bölüm', ozgun: null }))!;
		expect(await m.paragrafEkle(masa, ayse, { yer: 'x', ozgun: null })).toBeNull();
		const c1 = await m.ceviriEkle(p, ali, ceviri());
		const c2 = await m.ceviriEkle(p, ayse, ceviri({ cevirmen: 'Ergin Altay', yil: 2004 }));
		expect(await m.ceviriEkle(p, cem, ceviri())).toBe('yetkisiz');
		if (typeof c1 === 'string' || typeof c2 === 'string') throw new Error('eklenemedi');

		expect(await m.oyVer(c1.id, cem)).toBeNull();
		await m.masaGuncelle(masa, ali, {
			baslik: 'Suç ve Ceza',
			ozgunDil: 'Rusça',
			aciklama: null,
			gizlilik: 'herkes',
			eserId: eser
		});
		// Herkese açık: Cem görür ve oy verir ama çeviri ekleyemez (grup arkadaşı değil)
		expect(await m.ceviriEkle(p, cem, ceviri())).toBe('yetkisiz');
		expect(await m.oyVer(c1.id, cem)).toBe('verildi');
		expect(await m.oyVer(c2.id, cem)).toBe('verildi');
		expect(await m.oyVer(c2.id, ayse)).toBe('verildi');
		const g = (await m.masaGetir(masa, cem))!;
		// Paragraf başına tek oy: Cem'in oyu c2'ye taşındı
		expect(g.paragraflar[0].ceviriler.map((c) => [c.cevirmen, c.oy, c.benimOyum])).toEqual([
			['Mazlum Beyhan', 0, false],
			['Ergin Altay', 2, true]
		]);
		expect(await m.oyVer(c2.id, cem)).toBe('geri-alindi');
		// Anonim izleyici görür ama eser bağlantısı (özel eser) gönderilmez
		expect((await m.masaGetir(masa, null))?.eser).toBeNull();

		expect(await m.yorumEkle(c1.id, cem, 'Akşamüstü daha şiirsel.')).toBe(true);
		const [yorum] = (await m.masaGetir(masa, ali))!.paragraflar[0].ceviriler[0].yorumlar;
		expect(yorum.metin).toBe('Akşamüstü daha şiirsel.');
		expect(await m.yorumSil(yorum.id, ayse)).toBe(false);
		// Masa sahibi her yorumu silebilir
		expect(await m.yorumSil(yorum.id, ali)).toBe(true);
		expect(await m.ceviriSil(c2.id, cem)).toBe(false);
		expect(await m.ceviriSil(c2.id, ali)).toBe(true);
	});

	it('alıntı dayanaklı çeviri en çok 5 paragrafta; kamu malı sınırsız', async () => {
		const paragraflar: string[] = [];
		for (let i = 0; i < 6; i++)
			paragraflar.push(
				(await m.paragrafEkle(masa, ali, { yer: `${i + 2}. paragraf`, ozgun: null }))!
			);
		// 1. paragrafta zaten alıntı var: 4 paragraf daha eklenebilir
		for (const p of paragraflar.slice(0, 4))
			expect(typeof (await m.ceviriEkle(p, ali, ceviri()))).toBe('object');
		expect(await m.ceviriEkle(paragraflar[4], ali, ceviri())).toBe('alinti-siniri');
		expect(typeof (await m.ceviriEkle(paragraflar[4], ali, ceviri({ dayanak: 'kamu' })))).toBe(
			'object'
		);
		// Zaten alıntı içeren paragrafa ikinci alıntı eklenebilir
		expect(typeof (await m.ceviriEkle(paragraflar[0], ali, ceviri({ cevirmen: 'B' })))).toBe(
			'object'
		);
		expect((await m.masaGetir(masa, ali))!.alintiParagraf).toBe(5);
		expect((await m.masalarim(ayse)).map((x) => [x.baslik, x.paragraf, x.sahibiMi])).toEqual([
			['X', 0, true],
			['Suç ve Ceza', 7, false]
		]);
		expect((await m.eserinMasalari(eser, null)).map((x) => x.baslik)).toEqual(['Suç ve Ceza']);
		expect(await m.masaSil(masa, ayse)).toBe(false);
		expect(await m.masaSil(masa, ali)).toBe(true);
	});
});
