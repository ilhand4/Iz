import { describe, expect, it } from 'vitest';
import { benzerlik, sozcukFarki } from './ceviri';

const farklilar = (a: string, b: string) =>
	sozcukFarki(a, b)
		.filter((p) => p.farkli)
		.map((p) => p.metin);

describe('sözcük farkı', () => {
	it('ortak sözcükleri ayırır, büyük/küçük harf ve noktalamaya takılmaz', () => {
		const a = 'Temmuz başlarında, çok sıcak bir akşamüstü, genç bir adam odasından çıktı.';
		const b = 'Temmuzun başında, son derece sıcak bir akşam, genç adamın biri odasından çıktı';
		expect(farklilar(a, b)).toEqual(['Temmuz', 'başlarında,', 'çok', 'akşamüstü,', 'bir', 'adam']);
	});

	it('metni boşluklarıyla aynen yeniden kurar', () => {
		const a = 'Bir  iki\nüç';
		expect(
			sozcukFarki(a, 'iki')
				.map((p) => p.metin)
				.join('')
		).toBe(a);
	});

	it('Türkçe harfleri sadeleştirerek karşılaştırır', () => {
		expect(farklilar('İSTANBUL’da', 'istanbulda')).toEqual([]);
	});

	it('benzerlik 0 ile 1 arasında', () => {
		expect(benzerlik('a b c d', 'a b c d')).toBe(1);
		expect(benzerlik('a b c d', 'x y')).toBe(0);
		expect(benzerlik('a b c d', 'a b x y')).toBe(0.5);
	});
});
