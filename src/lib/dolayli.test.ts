import { describe, expect, it } from 'vitest';
import { dolayliBaglar } from './dolayli';

const b = (kaynakId: string, hedefId: string) => ({ kaynakId, hedefId });

describe('dolayliBaglar', () => {
	it('gizli düğümlerden geçen yolu tek bir bağa indirir', () => {
		// A → x → y → C  (x, y gizli)
		const sonuc = dolayliBaglar(new Set(['A', 'C']), [b('A', 'x'), b('x', 'y'), b('y', 'C')]);
		expect(sonuc).toEqual([b('A', 'C')]);
	});

	it('doğrudan bağ varsa dolaylı bağ üretmez; görünür düğümün içinden geçmez', () => {
		expect(dolayliBaglar(new Set(['A', 'C']), [b('A', 'C'), b('A', 'x'), b('x', 'C')])).toEqual([]);
		// A → x → B → y → C: A'dan C'ye dolaylı yok (B görünür, onun üzerinden zincir kurulmaz)
		const sonuc = dolayliBaglar(new Set(['A', 'B', 'C']), [
			b('A', 'x'),
			b('x', 'B'),
			b('B', 'y'),
			b('y', 'C')
		]);
		expect(sonuc).toEqual([b('A', 'B'), b('B', 'C')]);
	});

	it('döngüde takılmaz, kendine bağ üretmez ve derinlik sınırına uyar', () => {
		expect(
			dolayliBaglar(new Set(['A']), [b('A', 'x'), b('x', 'y'), b('y', 'x'), b('x', 'A')])
		).toEqual([]);
		const uzun = [b('A', 'x1'), b('x1', 'x2'), b('x2', 'x3'), b('x3', 'C')];
		expect(dolayliBaglar(new Set(['A', 'C']), uzun, 3)).toEqual([]);
		expect(dolayliBaglar(new Set(['A', 'C']), uzun, 4)).toEqual([b('A', 'C')]);
	});

	it('çok yol olsa da çift başına tek bağ', () => {
		const sonuc = dolayliBaglar(new Set(['A', 'C']), [
			b('A', 'x'),
			b('A', 'y'),
			b('x', 'C'),
			b('y', 'C')
		]);
		expect(sonuc).toEqual([b('A', 'C')]);
	});
});
