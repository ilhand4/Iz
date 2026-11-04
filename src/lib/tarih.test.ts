import { describe, expect, it } from 'vitest';
import { buAyinTarihi, tarihCoz, tarihGirdisi, tarihYaz } from './tarih';

describe('tarihCoz', () => {
	it('boş metin için null döner', () => {
		expect(tarihCoz('')).toBeNull();
		expect(tarihCoz('   ')).toBeNull();
		expect(tarihCoz(null)).toBeNull();
	});

	it('yıl, ay ve gün hassasiyetlerini tanır', () => {
		expect(tarihCoz('1998')).toEqual({ tarih: '1998-01-01', hassasiyet: 'yil' });
		expect(tarihCoz('1998-5')).toEqual({ tarih: '1998-05-01', hassasiyet: 'ay' });
		expect(tarihCoz('05.1998')).toEqual({ tarih: '1998-05-01', hassasiyet: 'ay' });
		expect(tarihCoz('1998-05-12')).toEqual({ tarih: '1998-05-12', hassasiyet: 'gun' });
		expect(tarihCoz('12.05.1998')).toEqual({ tarih: '1998-05-12', hassasiyet: 'gun' });
		expect(tarihCoz('1/2/2020')).toEqual({ tarih: '2020-02-01', hassasiyet: 'gun' });
	});

	it('takvimde olmayan günleri reddeder', () => {
		expect(tarihCoz('31.02.2020')).toBe('gecersiz');
		expect(tarihCoz('2021-13')).toBe('gecersiz');
		expect(tarihCoz('29.02.2023')).toBe('gecersiz');
		expect(tarihCoz('29.02.2024')).toEqual({ tarih: '2024-02-29', hassasiyet: 'gun' });
	});

	it('anlamsız metni reddeder', () => {
		expect(tarihCoz('dün')).toBe('gecersiz');
		expect(tarihCoz('98')).toBe('gecersiz');
		expect(tarihCoz('0000')).toBe('gecersiz');
	});
});

describe('tarihYaz / tarihGirdisi', () => {
	it('hassasiyete göre Türkçe yazar', () => {
		expect(tarihYaz('1998-01-01', 'yil')).toBe('1998');
		expect(tarihYaz('1998-05-01', 'ay')).toBe('Mayıs 1998');
		expect(tarihYaz('2019-09-15', 'gun')).toBe('15 Eylül 2019');
		expect(tarihYaz('2020-02-01', 'ay')).toBe('Şubat 2020');
		expect(tarihYaz(null, null)).toBe('');
	});

	it('form girdisine geri çevirir', () => {
		expect(tarihGirdisi('1998-01-01', 'yil')).toBe('1998');
		expect(tarihGirdisi('1998-05-01', 'ay')).toBe('1998-05');
		expect(tarihGirdisi('1998-05-12', 'gun')).toBe('1998-05-12');
	});
});

describe('buAyinTarihi', () => {
	it('İstanbul saatine göre ayın ilk günü', () => {
		expect(buAyinTarihi(new Date('2026-03-15T10:00:00Z'))).toBe('2026-03-01');
		// UTC'de 31 Ocak 22:30, İstanbul'da 1 Şubat 01:30
		expect(buAyinTarihi(new Date('2026-01-31T22:30:00Z'))).toBe('2026-02-01');
	});
});
