// Dönemler, alıntılar, etki ve iz çatallanması (PGlite üzerinde).
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const dusunce = await import('./dusunce.ts');
const izModulu = await import('./izler.ts');
const { donemDogrula, alintiDogrula, dugumDogrula } = await import('./dogrulama.ts');

let ali: string, banu: string;
const d: Record<string, string> = {};

function form(alanlar: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(alanlar)) fd.set(k, v);
	return fd;
}

beforeAll(async () => {
	for (const ad of ['ali', 'banu']) {
		const [k] = await db
			.insert(kullanicilar)
			.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'x' })
			.returning({ id: kullanicilar.id });
		if (ad === 'ali') ali = k.id;
		else banu = k.id;
	}
	for (const ad of ['A', 'B', 'C', 'D']) {
		const [x] = await db
			.insert(dugumler)
			.values({
				sahipId: ali,
				tur: 'eser',
				eserTuru: 'kitap',
				baslik: ad,
				gizlilik: ad === 'A' ? 'herkes' : 'ozel'
			})
			.returning({ id: dugumler.id });
		d[ad] = x.id;
	}
});

describe('doğrulama', () => {
	it('dönem: yıl hassasiyetli bitiş yıl sonuna uzar; ters aralık reddedilir', () => {
		const s = donemDogrula(form({ ad: 'Kadıköy', baslangic: '2004', bitis: '2011' }));
		expect(s.tamam && s.veri).toEqual({
			ad: 'Kadıköy',
			baslangic: '2004-01-01',
			bitis: '2011-12-31',
			renk: 'kiremit'
		});
		const ay = donemDogrula(
			form({ ad: 'Şubat', baslangic: '2024-02', bitis: '2024-02', renk: 'mavi' })
		);
		expect(ay.tamam && ay.veri.bitis).toBe('2024-02-29');
		expect(donemDogrula(form({ ad: 'Ters', baslangic: '2010', bitis: '2009' })).tamam).toBe(false);
		expect(donemDogrula(form({ ad: '', baslangic: '' })).tamam).toBe(false);
	});

	it('alıntı ve etki', () => {
		expect(alintiDogrula(form({ metin: '  ' })).tamam).toBe(false);
		expect(alintiDogrula(form({ metin: 'Bir satır', yer: 's. 4' }))).toEqual({
			tamam: true,
			veri: { metin: 'Bir satır', yer: 's. 4' }
		});
		const e = dugumDogrula(form({ tur: 'ani', baslik: 'x', etki: 'degistirdi' }));
		expect(e.tamam && e.veri.etki).toBe('degistirdi');
		const yok = dugumDogrula(form({ tur: 'ani', baslik: 'x' }));
		expect(yok.tamam && 'etki' in yok.veri).toBe(false);
	});
});

describe('dönemler ve alıntılar', () => {
	it('dönemler yalnızca sahibince yönetilir', async () => {
		const id = await dusunce.donemOlustur(ali, {
			ad: 'Lise',
			baslangic: '2001-09-01',
			bitis: '2005-06-30',
			renk: 'yesil'
		});
		expect(await dusunce.donemSil(id, banu)).toBe(false);
		expect((await dusunce.donemleriListele(ali)).map((x) => x.ad)).toEqual(['Lise']);
		expect(await dusunce.donemleriListele(banu)).toEqual([]);
		expect(await dusunce.donemSil(id, ali)).toBe(true);
	});

	it('alıntılar düğümü görebilene görünür; başkası ekleyemez', async () => {
		expect(await dusunce.alintiEkle(banu, d.A, { metin: 'sızma', yer: null })).toBeNull();
		await dusunce.alintiEkle(ali, d.A, { metin: 'Açık alıntı', yer: null });
		await dusunce.alintiEkle(ali, d.B, { metin: 'Özel alıntı', yer: 's. 1' });
		expect((await dusunce.alintilariListele(d.A, banu)).map((a) => a.metin)).toEqual([
			'Açık alıntı'
		]);
		expect(await dusunce.alintilariListele(d.B, banu)).toEqual([]);
		const [ozel] = await dusunce.alintilariListele(d.B, ali);
		expect(await dusunce.alintiKaynagi(ozel.id, ali)).toBe(d.B);
		expect(await dusunce.alintiKaynagi(ozel.id, banu)).toBeNull();
	});
});

describe('iz çatallanması', () => {
	it('verilen duraktan çatallar; ata ve çatallar görünürlüğe göre listelenir', async () => {
		const ata = await izModulu.izOlustur(
			ali,
			{ baslik: 'Ana yol', aciklama: null, gizlilik: 'herkes' },
			d.A
		);
		await izModulu.durakEkle(ata.id, ali, d.B);
		await izModulu.durakEkle(ata.id, ali, d.C);
		expect(await dusunce.catalla(banu, ata.id, 2)).toBeNull();
		const catal = (await dusunce.catalla(ali, ata.id, 2))!;
		const yeni = (await izModulu.izGetir(catal, ali))!;
		expect(yeni.duraklar.map((x) => ('dugum' in x ? x.dugum.baslik : null))).toEqual(['A', 'B']);
		expect(yeni.iz).toMatchObject({ ataIzId: ata.id, ayrilmaSirasi: 2, gizlilik: 'ozel' });
		await izModulu.durakEkle(catal, ali, d.D);

		expect((await dusunce.catallar(ata.id, ali)).map((c) => c.ayrilmaSirasi)).toEqual([2]);
		// Çatal özel: başkasına görünmez
		expect(await dusunce.catallar(ata.id, banu)).toEqual([]);
		expect(await dusunce.atasi(ata.id, banu)).toMatchObject({ baslik: 'Ana yol' });
	});
});
