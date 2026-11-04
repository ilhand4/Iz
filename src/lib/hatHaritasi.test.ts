import { describe, expect, it } from 'vitest';
import { hatHaritasiKur, HAT_ARALIGI } from './hatHaritasi';

const d = (id: string, tarih: string | null = null) => ({
	id,
	baslik: id,
	tur: 'ani' as const,
	tarih
});

describe('hatHaritasiKur', () => {
	it('durakları zamana göre soldan sağa dizer; tarihsizi komşularının arasına koyar', () => {
		const c = hatHaritasiKur([
			{ id: 'h1', baslik: 'Bir', duraklar: [d('A', '2004-01-01'), d('B'), d('C', '2010-01-01')] }
		]);
		const x = (id: string) => c.istasyonlar.find((s) => s.id === id)!.x;
		expect(x('A')).toBeLessThan(x('B'));
		expect(x('B')).toBeLessThan(x('C'));
		expect(c.yillar.map((y) => y.yil)).toEqual([2004, 2010]);
	});

	it('iki hattın ortak durağı aktarma istasyonu olur ve şeritlerin ortasına yerleşir', () => {
		const c = hatHaritasiKur([
			{ id: 'h1', baslik: 'Bir', duraklar: [d('A', '2001-01-01'), d('X', '2005-01-01')] },
			{
				id: 'h2',
				baslik: 'İki',
				duraklar: [d('B', '2002-01-01'), d('X', '2005-01-01'), d('C', '2006-01-01')]
			}
		]);
		const x = c.istasyonlar.find((s) => s.id === 'X')!;
		expect(x.aktarma).toBe(true);
		expect(x.hatlar).toEqual([0, 1]);
		expect(x.y).toBe(HAT_ARALIGI.ust + HAT_ARALIGI.y / 2);
		expect(c.istasyonlar.filter((s) => s.aktarma)).toHaveLength(1);
		// Her hat kendi durak sırasıyla çizilir
		expect(c.hatlar[1].noktalar).toHaveLength(3);
	});

	it('boş hatları atlar; hiç durak yoksa boş çizim', () => {
		const c = hatHaritasiKur([{ id: 'bos', baslik: 'Boş', duraklar: [] }]);
		expect(c.istasyonlar).toEqual([]);
		expect(c.hatlar).toEqual([]);
	});
});
