import { describe, expect, it } from 'vitest';
import { brierPuani, brierYorumu, kalibrasyon } from './kararDefteri';

describe('kalibrasyon', () => {
	it('10’luk dilimlere ayırır, 50 altını tek dilimde toplar; kısmen yarım sayılır', () => {
		const d = kalibrasyon([
			{ guven: 72, sonuc: 'gerceklesti' },
			{ guven: 78, sonuc: 'gerceklesmedi' },
			{ guven: 70, sonuc: 'kismen' },
			{ guven: 30, sonuc: 'gerceklesmedi' },
			{ guven: 100, sonuc: 'gerceklesti' }
		]);
		expect(d).toEqual([
			{ alt: 0, ust: 50, sayi: 1, ortalamaGuven: 30, gerceklesme: 0 },
			{ alt: 70, ust: 80, sayi: 3, ortalamaGuven: 73, gerceklesme: 50 },
			{ alt: 90, ust: 100, sayi: 1, ortalamaGuven: 100, gerceklesme: 100 }
		]);
		expect(kalibrasyon([])).toEqual([]);
	});
});

describe('Brier puanı', () => {
	it('kusursuz tahmin 0, yazı tura 0,25', () => {
		expect(brierPuani([{ guven: 100, sonuc: 'gerceklesti' }])).toBe(0);
		expect(brierPuani([{ guven: 50, sonuc: 'gerceklesmedi' }])).toBe(0.25);
		expect(brierPuani([])).toBeNull();
		expect(brierYorumu(0.05)).toMatch(/Çok iyi/);
		expect(brierYorumu(null)).toMatch(/Henüz/);
	});
});
