import { describe, expect, it } from 'vitest';
import { csvOku, goodreadsOku, kindleOku, letterboxdOku, spotifyOku } from './disKaynaklar';

describe('csvOku', () => {
	it('tırnaklı alanları, kaçırılmış tırnakları ve alan içi satır sonlarını okur', () => {
		const r = csvOku(
			String.fromCharCode(0xfeff) + 'A,B,C\r\n1,"iki, üç","dört ""tırnak""\nsatır"\r\n,,\r\n5,6,7'
		);
		expect(r).toEqual([
			{ A: '1', B: 'iki, üç', C: 'dört "tırnak"\nsatır' },
			{ A: '5', B: '6', C: '7' }
		]);
	});
});

describe('Goodreads', () => {
	it('rafa göre durum, okunma tarihini ve özgün yılı alır', () => {
		const csv = [
			'Book Id,Title,Author,Year Published,Original Publication Year,Date Read,Exclusive Shelf',
			'1,Tutunamayanlar,Oğuz Atay,2000,1972,2005/01/14,read',
			'2,Aylak Adam,Yusuf Atılgan,2010,,,to-read',
			'3,,Boş,,,,read'
		].join('\n');
		expect(goodreadsOku(csv)).toEqual([
			{
				eserTuru: 'kitap',
				baslik: 'Tutunamayanlar',
				altBaslik: 'Oğuz Atay',
				yil: 1972,
				tarih: '2005-01-14',
				tarihHassasiyeti: 'gun',
				durum: 'bitti',
				alintilar: []
			},
			expect.objectContaining({ baslik: 'Aylak Adam', yil: 2010, tarih: null, durum: 'merak' })
		]);
	});
});

describe('Letterboxd', () => {
	it('izlenenleri tarihle, izleme listesini merak olarak alır', () => {
		const csv = 'Date,Name,Year,Letterboxd URI\n2022-11-05,Babylon Berlin,2017,x\n';
		expect(letterboxdOku(csv)[0]).toMatchObject({
			eserTuru: 'film',
			yil: 2017,
			tarih: '2022-11-05',
			durum: 'bitti'
		});
		expect(letterboxdOku(csv, true)[0]).toMatchObject({ tarih: null, durum: 'merak' });
	});
});

describe('Spotify', () => {
	it('kısa dinlemeleri atar, en çok dinlenenleri ilk ayıyla verir', () => {
		const k = (t: string, ms = 60_000, z = '2020-03-02 10:00') => ({
			endTime: z,
			artistName: 'Nick Cave',
			trackName: t,
			msPlayed: ms
		});
		const json = JSON.stringify([
			k('Into My Arms', 60_000, '2020-04-01 10:00'),
			k('Into My Arms', 60_000, '2020-03-15 10:00'),
			k('Into My Arms'),
			k('Into My Arms', 5_000),
			k('Brompton Oratory'),
			k('Brompton Oratory')
		]);
		expect(spotifyOku(json)).toEqual([
			{
				eserTuru: 'muzik',
				baslik: 'Into My Arms',
				altBaslik: 'Nick Cave',
				yil: null,
				tarih: '2020-03-01',
				tarihHassasiyeti: 'ay',
				durum: 'bitti',
				alintilar: []
			}
		]);
		expect(spotifyOku('bozuk')).toEqual([]);
	});
});

describe('Kindle', () => {
	it('vurguları kitap başına toplar; yer imlerini ve tekrarları atar', () => {
		const metin = [
			'Kürk Mantolu Madonna (Sabahattin Ali)',
			'- Your Highlight on page 42 | Location 600-602 | Added on Monday',
			'',
			'Hayatta en büyük acı, bir şeyi kaybetmek değil.',
			'==========',
			'Kürk Mantolu Madonna (Sabahattin Ali)',
			'- Your Bookmark on page 50 | Location 700',
			'',
			'',
			'==========',
			'Kürk Mantolu Madonna (Sabahattin Ali)',
			'- Your Highlight on page 42 | Location 600-602',
			'',
			'Hayatta en büyük acı, bir şeyi kaybetmek değil.',
			'==========',
			'Tutunamayanlar (Oğuz Atay)',
			'- Konum 120-121 üzerindeki vurgunuz',
			'',
			'Olric.',
			'=========='
		].join('\n');
		const sonuc = kindleOku(metin);
		expect(sonuc.map((k) => [k.baslik, k.altBaslik, k.alintilar.length])).toEqual([
			['Kürk Mantolu Madonna', 'Sabahattin Ali', 1],
			['Tutunamayanlar', 'Oğuz Atay', 1]
		]);
		expect(sonuc[0].alintilar[0].yer).toBe('s. 42');
		expect(sonuc[1].alintilar[0].yer).toBe('konum 120-121');
	});
});
