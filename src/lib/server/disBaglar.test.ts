// "Senin izin beni buraya götürdü" ve bildirim kutusu (PGlite üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const dis = await import('./disBaglar.ts');

let ali: string, banu: string, cem: string;
const d: Record<string, string> = {};

async function kullanici(ad: string) {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: ad, eposta: `${ad}@iz.test`, ad, sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	return k.id;
}
async function dugum(sahipId: string, baslik: string, gizlilik: 'ozel' | 'herkes') {
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
	d.aliAcik = await dugum(ali, 'Ali açık', 'herkes');
	d.aliOzel = await dugum(ali, 'Ali özel', 'ozel');
	d.banuOzel = await dugum(banu, 'BANU ÖZEL', 'ozel');
	d.banuAcik = await dugum(banu, 'Banu açık', 'herkes');
});

describe('dış bağlar', () => {
	it('yalnızca görünür başkasının düğümünden kendi düğümüne kurulur', async () => {
		expect(await dis.disBagKur(banu, d.aliOzel, d.banuOzel, null)).toBe('yetkisiz');
		expect(await dis.disBagKur(banu, d.aliAcik, d.aliAcik, null)).toBe('yetkisiz');
		expect(await dis.disBagKur(ali, d.aliAcik, d.aliOzel, null)).toBe('yetkisiz');
		expect(await dis.disBagKur(banu, d.aliAcik, d.banuOzel, 'gizli not')).toBe('kuruldu');
		expect(await dis.disBagKur(banu, d.aliAcik, d.banuOzel, null)).toBe('zaten-var');
		expect(await dis.disBagKur(banu, d.aliAcik, d.banuAcik, 'açık not')).toBe('kuruldu');
	});

	it('kaynak sahibine bildirim gider; özel hedefin başlığı ve notu gösterilmez', async () => {
		expect(await dis.okunmamisSayisi(ali)).toBe(2);
		const liste = await dis.bildirimleriGetir(ali);
		expect(liste.map((b) => [b.hedef?.baslik ?? null, b.not])).toEqual([
			['Banu açık', 'açık not'],
			[null, null]
		]);
		expect(JSON.stringify(liste)).not.toContain('BANU ÖZEL');
		expect(JSON.stringify(liste)).not.toContain('gizli not');
		await dis.hepsiniOku(ali);
		expect(await dis.okunmamisSayisi(ali)).toBe(0);
	});

	it('kaynak sayfasında görünür hedefler listelenir, ötekiler yalnızca sayılır', async () => {
		const giden = await dis.gidenDisBaglar(d.aliAcik, ali);
		expect(giden.gorunur.map((b) => b.dugum.baslik)).toEqual(['Banu açık']);
		expect(giden.gizliSayisi).toBe(1);
		const gelen = await dis.gelenDisBaglar(d.banuOzel, banu);
		expect(gelen.map((b) => [b.dugum.baslik, b.sahibiBenMiyim])).toEqual([['Ali açık', true]]);
	});

	it('kaynak gizlenince bağ hedef sayfasında da görünmez; yalnızca kuran silebilir', async () => {
		await db.update(dugumler).set({ gizlilik: 'ozel' }).where(eq(dugumler.id, d.aliAcik));
		expect(await dis.gelenDisBaglar(d.banuAcik, cem)).toEqual([]);
		const [bag] = await dis.gelenDisBaglar(d.banuAcik, ali);
		expect(await dis.disBagSil(ali, bag.id)).toBe(false);
		expect(await dis.disBagSil(banu, bag.id)).toBe(true);
	});
});
