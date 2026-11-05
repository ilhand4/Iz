// Karar Defteri veri katmanı (PGlite üzerinde): sahiplik, zamanı gelenler, kalibrasyon.
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const k = await import('./kararDefteriDb.ts');

let ali: string;
let ayse: string;
let tasinma: string;
let okul: string;
let eser: string;

beforeAll(async () => {
	const kisiler = await db
		.insert(kullanicilar)
		.values([
			{ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' },
			{ kullaniciAdi: 'ayse', eposta: 'ayse@iz.test', ad: 'Ayşe', sifreOzeti: 'x' }
		])
		.returning({ id: kullanicilar.id });
	[ali, ayse] = kisiler.map((x) => x.id);
	const d = await db
		.insert(dugumler)
		.values([
			{ sahipId: ali, tur: 'karar', baslik: 'İzmir’e taşınmak', gizlilik: 'herkes' },
			{ sahipId: ali, tur: 'karar', baslik: 'Akşam okuluna yazılmak' },
			{ sahipId: ali, tur: 'eser', eserTuru: 'kitap', baslik: 'Tutunamayanlar' }
		])
		.returning({ id: dugumler.id });
	[tasinma, okul, eser] = d.map((x) => x.id);
});

const veri = (ek = {}) => ({
	gerekce: 'Deniz',
	beklenti: 'Daha sakin bir yıl',
	guven: 70,
	sorulacak: '2026-06-01',
	...ek
});

describe('karar defteri', () => {
	it('yalnızca sahibi ve yalnızca karar düğümüne yazar', async () => {
		expect(await k.kararKaydet(ayse, tasinma, veri())).toBe(false);
		expect(await k.kararKaydet(ali, eser, veri())).toBe(false);
		expect(await k.kararKaydet(ali, tasinma, veri())).toBe(true);
		expect(await k.kararGetir(ayse, tasinma)).toBeNull();
		expect(await k.kararGetir(ali, tasinma)).toMatchObject({ guven: 70, sorulacak: '2026-06-01' });
		// İkinci yazım günceller
		expect(await k.kararKaydet(ali, tasinma, veri({ guven: 80 }))).toBe(true);
		expect((await k.kararGetir(ali, tasinma))?.guven).toBe(80);
	});

	it('sorma zamanı gelenleri İstanbul gününe göre bulur', async () => {
		await k.kararKaydet(ali, okul, veri({ guven: 40, sorulacak: '2026-09-01' }));
		const once = new Date('2026-05-31T20:00:00Z'); // İstanbul'da 31 Mayıs 23.00
		expect(await k.zamaniGelenSayisi(ali, once)).toBe(0);
		const sonra = new Date('2026-05-31T21:30:00Z'); // İstanbul'da 1 Haziran 00.30
		expect((await k.zamaniGelenKararlar(ali, sonra)).map((x) => x.baslik)).toEqual([
			'İzmir’e taşınmak'
		]);
		expect(await k.zamaniGelenSayisi(ayse, sonra)).toBe(0);
	});

	it('sonuç kaydedilince listeden düşer, kalibrasyona girer', async () => {
		expect(await k.sonucKaydet(ayse, tasinma, 'gerceklesti', null)).toBe(false);
		expect(await k.sonucKaydet(ali, tasinma, 'gerceklesti', 'Gerçekten sakin')).toBe(true);
		expect(await k.zamaniGelenSayisi(ali, new Date('2026-12-01T09:00:00Z'))).toBe(1);
		await k.sonucKaydet(ali, okul, 'gerceklesmedi', null);
		const { liste, dilimler, brier, sonuclananSayisi } = await k.kararListesi(ali);
		expect(liste).toHaveLength(2);
		expect(sonuclananSayisi).toBe(2);
		expect(dilimler).toEqual([
			{ alt: 0, ust: 50, sayi: 1, ortalamaGuven: 40, gerceklesme: 0 },
			{ alt: 80, ust: 90, sayi: 1, ortalamaGuven: 80, gerceklesme: 100 }
		]);
		// ((0,8−1)² + (0,4−0)²) / 2 = 0,1
		expect(brier).toBe(0.1);
		expect((await k.kararListesi(ayse)).liste).toEqual([]);
	});
});
