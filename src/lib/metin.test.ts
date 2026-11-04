import { describe, expect, it } from 'vitest';
import { eslesir, kisalt, sadelestir } from './metin';

describe('sadelestir', () => {
	it('Türkçe harfleri sadeleştirip küçük harfe çevirir', () => {
		expect(sadelestir('Kürk Mantolu Madonna')).toBe('kurk mantolu madonna');
		expect(sadelestir('İSTANBUL')).toBe('istanbul');
		expect(sadelestir('IŞIK')).toBe('isik');
		expect(sadelestir('Çağrı Öğüt')).toBe('cagri ogut');
	});
});

describe('eslesir', () => {
	it('aksansız ve büyük/küçük harften bağımsız eşleşir', () => {
		expect(eslesir('Kürk Mantolu Madonna', 'kurk')).toBe(true);
		expect(eslesir('Ayşe Işık', 'AYSE isik')).toBe(true);
		expect(eslesir('Tutunamayanlar Oğuz Atay', 'atay tutun')).toBe(true);
	});

	it('sözcüklerden biri yoksa eşleşmez', () => {
		expect(eslesir('Kürk Mantolu Madonna', 'kürk ceket')).toBe(false);
	});

	it('boş sorgu her şeyle eşleşir', () => {
		expect(eslesir('Berlin', '   ')).toBe(true);
	});
});

describe('kisalt', () => {
	it('kısa metni olduğu gibi bırakır', () => {
		expect(kisalt('Berlin', 10)).toBe('Berlin');
	});

	it('uzun metni sözcük sınırında kısaltır', () => {
		expect(kisalt('Yüksek lisans için Berlin’e başvurmak', 24)).toBe('Yüksek lisans için…');
	});
});

describe('satır içi bağlar', () => {
	it('[[…]] başlıklarını sırayla ve tekrarsız çıkarır', async () => {
		const { satirIciBaglar } = await import('./metin');
		expect(
			satirIciBaglar(
				'Önce [[Kürk Mantolu Madonna]], sonra [[ Berlin ]] ve yine [[kürk mantolu madonna]].'
			)
		).toEqual(['Kürk Mantolu Madonna', 'Berlin']);
		expect(satirIciBaglar('[[]] ya da [[satır\nsonu]] geçersiz')).toEqual([]);
	});

	it('imleçten önceki açık [[ sorgusunu bulur', async () => {
		const { acikSatirIciSorgu } = await import('./metin');
		expect(acikSatirIciSorgu('Bir şey [[Kür')).toBe('Kür');
		expect(acikSatirIciSorgu('Bir şey [[')).toBe('');
		expect(acikSatirIciSorgu('Bir şey [[Kürk]] sonra')).toBeNull();
	});
});
