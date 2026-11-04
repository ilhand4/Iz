import { describe, expect, it } from 'vitest';
import { izOgSvg, satirlaraBol } from './ogGorsel';

describe('paylaşım görseli', () => {
	it('başlığı kaçırır, gizli durakların başlığını yazmaz', () => {
		const svg = izOgSvg({
			baslik: 'Kitaplıktan <Berlin> & ötesi',
			sahip: 'Deniz',
			duraklar: [
				{ tur: 'ani', baslik: 'Babaannemin kitaplığı' },
				{ gizli: true },
				{ tur: 'yer', baslik: 'Berlin' }
			]
		});
		expect(svg).toContain('Kitaplıktan &lt;Berlin&gt; &amp; ötesi');
		expect(svg).toContain('Gizli durak');
		expect(svg).toContain('3 durak');
		expect(svg).toMatch(/^<svg /);
	});

	it('en fazla altı durak çizer ve bunu belirtir', () => {
		const svg = izOgSvg({
			baslik: 'Uzun',
			sahip: 'D',
			duraklar: Array.from({ length: 9 }, (_, i) => ({ tur: 'eser' as const, baslik: `D${i}` }))
		});
		expect(svg).toContain('9 durak (ilk 6)');
		expect(svg).not.toContain('>D6<');
	});

	it('satırlara sözcük sınırında böler ve taşanı kısaltır', () => {
		expect(satirlaraBol('bir iki üç dört', 7, 3)).toEqual(['bir iki', 'üç dört']);
		expect(satirlaraBol('bir iki üç dört beş altı', 7, 2)).toEqual(['bir iki', 'üç dör…']);
	});
});
