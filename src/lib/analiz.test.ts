import { describe, expect, it } from 'vitest';
import { arasindalik, haritaKarakterleri, type AnalizDugumu } from './analiz';

const d = (id: string): AnalizDugumu => ({ id, baslik: id.toUpperCase(), tur: 'eser' });
const b = (kaynakId: string, hedefId: string) => ({ kaynakId, hedefId });

describe('haritaKarakterleri', () => {
	// a → b → c → d ve a → e; f bağsız; g bağsız ama izde
	const dugumler = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(d);
	const baglar = [b('a', 'b'), b('b', 'c'), b('c', 'd'), b('a', 'e')];

	it('kökleri ve açtıkları kapı sayısını bulur', () => {
		const { kokler } = haritaKarakterleri(dugumler, baglar);
		expect(kokler.map((k) => [k.id, k.deger])).toEqual([['a', 4]]);
	});

	it('kapı açanları dolaylı ulaşılan düğüm sayısına göre sıralar', () => {
		const { kapiAcanlar } = haritaKarakterleri(dugumler, baglar);
		expect(kapiAcanlar.map((k) => [k.id, k.deger])).toEqual([
			['a', 4],
			['b', 2]
		]);
	});

	it('yetimlerden izde durak olanları ayırır', () => {
		const { yetimler } = haritaKarakterleri(dugumler, baglar, new Set(['g']));
		expect(yetimler.map((y) => y.id)).toEqual(['f']);
	});

	it('kavşak için en az üç bağ ister ve iki kümeyi bağlayanı öne çıkarır', () => {
		// İki üçgen (x1-x2-x3) ve (y1-y2-y3), aralarında köprü: k
		const ds = ['x1', 'x2', 'x3', 'y1', 'y2', 'y3', 'k'].map(d);
		const bs = [
			b('x1', 'x2'),
			b('x2', 'x3'),
			b('x3', 'x1'),
			b('y1', 'y2'),
			b('y2', 'y3'),
			b('y3', 'y1'),
			b('x1', 'k'),
			b('k', 'y1')
		];
		const { kavsaklar } = haritaKarakterleri(ds, bs);
		// x1 ve y1 üç bağlı köprü uçları; k'nin yalnızca iki bağı var
		expect(kavsaklar.map((k) => k.id).sort()).toEqual(['x1', 'y1']);
	});

	it('döngülerde takılmaz', () => {
		const { kapiAcanlar } = haritaKarakterleri(['a', 'b', 'c'].map(d), [
			b('a', 'b'),
			b('b', 'c'),
			b('c', 'a')
		]);
		expect(kapiAcanlar.every((k) => k.deger === 2)).toBe(true);
	});
});

describe('arasindalik', () => {
	it('yıldız grafında merkez tüm yolların üzerindedir', () => {
		const komsular = new Map([
			['m', new Set(['a', 'b', 'c'])],
			['a', new Set(['m'])],
			['b', new Set(['m'])],
			['c', new Set(['m'])]
		]);
		const sonuc = arasindalik(['m', 'a', 'b', 'c'], komsular);
		// Yapraklar arası 3 çiftin hepsi merkezden geçer
		expect(sonuc.get('m')).toBe(3);
		expect(sonuc.get('a')).toBe(0);
	});
});
