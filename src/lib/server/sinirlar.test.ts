// Kalıcı hız sınırı (PGlite üzerinde)
import { describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { KaliciHizSiniri } = await import('./sinirlar.ts');

describe('KaliciHizSiniri', () => {
	it('pencere içinde sınırı uygular, anahtarları ve sınırları ayrı tutar, sıfırlanır', async () => {
		const s = new KaliciHizSiniri('deneme', 3, 60_000);
		for (let i = 0; i < 3; i++) expect((await s.dene('a')).izin).toBe(true);
		const dolu = await s.dene('a');
		expect(dolu.izin).toBe(false);
		expect(dolu.beklemeSaniye).toBeGreaterThan(50);
		expect((await s.dene('b')).izin).toBe(true);
		expect((await new KaliciHizSiniri('baska', 3, 60_000).dene('a')).izin).toBe(true);
		await s.sifirla('a');
		expect((await s.dene('a')).izin).toBe(true);
	});

	it('pencere geçince yeniden izin verir', async () => {
		// Pencere yük altında da iki istek arasında dolmayacak kadar geniş (tam pakette PostGIS yüklenirken)
		const s = new KaliciHizSiniri('kisa', 1, 600);
		expect((await s.dene('x')).izin).toBe(true);
		expect((await s.dene('x')).izin).toBe(false);
		await new Promise((r) => setTimeout(r, 700));
		expect((await s.dene('x')).izin).toBe(true);
	});
});
