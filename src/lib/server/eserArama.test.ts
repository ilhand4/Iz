import { describe, expect, it } from 'vitest';
import {
	disKimlikGecerliMi,
	gorselGuvenliMi,
	openLibrarySonucuCevir,
	tmdbSonucuCevir
} from './eserArama';

describe('openLibrarySonucuCevir', () => {
	it('arama belgesini eser sonucuna çevirir', () => {
		expect(
			openLibrarySonucuCevir({
				key: '/works/OL45804W',
				title: 'Fantastic Mr Fox',
				author_name: ['Roald Dahl'],
				first_publish_year: 1970,
				cover_i: 6498519
			})
		).toEqual({
			kaynak: 'openlibrary',
			disKimlik: 'OL45804W',
			eserTuru: 'kitap',
			baslik: 'Fantastic Mr Fox',
			altBaslik: 'Roald Dahl',
			yil: 1970,
			gorselUrl: 'https://covers.openlibrary.org/b/id/6498519-M.jpg',
			ozet: null
		});
	});

	it('başlığı ya da kimliği olmayan belgeyi atar', () => {
		expect(openLibrarySonucuCevir({ key: '/works/OL1W' })).toBeNull();
		expect(openLibrarySonucuCevir({ title: 'Kimliksiz' })).toBeNull();
		expect(openLibrarySonucuCevir({ key: '/books/OL1M', title: 'Baskı, eser değil' })).toBeNull();
	});
});

describe('tmdbSonucuCevir', () => {
	it('filmi çevirir, özgün adı farklıysa alt başlık yapar', () => {
		const sonuc = tmdbSonucuCevir(
			{
				id: 144,
				title: 'Berlin Üzerinde Gökyüzü',
				original_title: 'Der Himmel über Berlin',
				release_date: '1987-09-23',
				poster_path: '/abc123.jpg',
				overview: 'İki melek…'
			},
			'film'
		);
		expect(sonuc).toMatchObject({
			kaynak: 'tmdb',
			disKimlik: 'movie/144',
			eserTuru: 'film',
			altBaslik: 'Der Himmel über Berlin',
			yil: 1987,
			gorselUrl: 'https://image.tmdb.org/t/p/w185/abc123.jpg'
		});
	});

	it('diziyi çevirir; şüpheli poster yolunu kullanmaz', () => {
		const sonuc = tmdbSonucuCevir(
			{ id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', poster_path: '/../x"onerror=1' },
			'dizi'
		);
		expect(sonuc?.disKimlik).toBe('tv/1399');
		expect(sonuc?.altBaslik).toBeNull();
		expect(sonuc?.gorselUrl).toBeNull();
	});
});

describe('dış kimlik ve görsel doğrulaması', () => {
	it('kimlik biçimlerini denetler', () => {
		expect(disKimlikGecerliMi('openlibrary', 'OL45804W')).toBe(true);
		expect(disKimlikGecerliMi('openlibrary', 'OL45804W/../x')).toBe(false);
		expect(disKimlikGecerliMi('tmdb', 'movie/144')).toBe(true);
		expect(disKimlikGecerliMi('tmdb', 'person/1')).toBe(false);
		expect(disKimlikGecerliMi('baska', 'x')).toBe(false);
	});

	it('yalnızca izinli görsel adreslerini kabul eder', () => {
		expect(gorselGuvenliMi('https://covers.openlibrary.org/b/id/1-M.jpg')).toBe(true);
		expect(gorselGuvenliMi('https://image.tmdb.org/t/p/w185/a.jpg')).toBe(true);
		expect(gorselGuvenliMi('javascript:alert(1)')).toBe(false);
		expect(gorselGuvenliMi('https://kotu.example/a.jpg')).toBe(false);
		expect(gorselGuvenliMi('https://covers.openlibrary.org/a" onerror="x')).toBe(false);
	});
});
