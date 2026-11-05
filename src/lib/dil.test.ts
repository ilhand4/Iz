import { describe, expect, it } from 'vitest';
import { cevirmen, dilSec, hataDilde, tarihDilde } from './dil';
import { EN } from './sozluk/en';
import { TR } from './sozluk/tr';

describe('dil seçimi', () => {
	it('çerez önce; yoksa tarayıcı dili, Türkçe öncelikli', () => {
		expect(dilSec('en', 'tr-TR,tr;q=0.9')).toBe('en');
		expect(dilSec(undefined, 'en-US,en;q=0.9')).toBe('en');
		expect(dilSec(undefined, 'de-DE,tr;q=0.8,en;q=0.5')).toBe('tr');
		expect(dilSec(undefined, 'de-DE,fr;q=0.8')).toBe('tr');
		expect(dilSec('xx', null)).toBe('tr');
	});
});

describe('çeviri', () => {
	it('her Türkçe anahtarın İngilizcesi var ve yer tutucuları eşleşiyor', () => {
		for (const k of Object.keys(TR) as (keyof typeof TR)[]) {
			expect(EN[k], k).toBeTruthy();
			const tut = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
			expect(tut(EN[k]), k).toEqual(tut(TR[k]));
		}
	});

	it('yer tutucuları doldurur, tarihi dilde yazar, hatayı çevirir', () => {
		expect(cevirmen('en')('iz.durak', { sayi: 3 })).toBe('3 stops');
		expect(cevirmen('tr')('iz.durak', { sayi: 3 })).toBe('3 durak');
		expect(tarihDilde('1998-08-01', 'ay', 'en')).toBe('August 1998');
		expect(tarihDilde('1998-08-12', 'gun', 'tr')).toBe('12 Ağustos 1998');
		expect(hataDilde('E-posta ya da şifre hatalı.', 'en')).toBe('Incorrect email or password.');
		expect(hataDilde('Çok fazla deneme yapıldı. Lütfen 4 dakika sonra tekrar deneyin.', 'en')).toBe(
			'Too many attempts. Please try again in 4 minutes.'
		);
		expect(hataDilde('Bilinmeyen', 'en')).toBe('Bilinmeyen');
	});
});
