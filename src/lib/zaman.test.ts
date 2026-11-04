import { describe, expect, it } from 'vitest';
import type { TarihHassasiyeti } from './sabitler';
import { EN_GENIS_ARALIK, zamanCizgisiKur, type ZamanGirdisi } from './zaman';

let sayac = 0;
function dugum(
	baslik: string,
	tarih: string | null,
	tarihHassasiyeti: TarihHassasiyeti | null
): ZamanGirdisi {
	return {
		id: `d${++sayac}`,
		tur: 'eser',
		eserTuru: 'kitap',
		baslik,
		altBaslik: null,
		gorselUrl: null,
		gizlilik: 'ozel',
		tarih,
		tarihHassasiyeti
	};
}

describe('zamanCizgisiKur', () => {
	const yilBoyunca = dugum('Yalnızca yılı bilinen', '1998-01-01', 'yil');
	const ayIcinde = dugum('Mayıs ayı', '1998-05-01', 'ay');
	const gunlu = dugum('12 Mayıs', '1998-05-12', 'gun');
	const ilkGun = dugum('1 Mayıs', '1998-05-01', 'gun');
	const sonraki = dugum('Sonraki yıl', '2001-03-04', 'gun');
	const tarihsiz = dugum('Tarihsiz', null, null);
	const hepsi = [sonraki, gunlu, tarihsiz, ilkGun, yilBoyunca, ayIcinde];

	it('yılları ve ayları sıralar; yalnızca yılı bilinenleri ayrı tutar', () => {
		const { yillar, tarihsiz: tarihsizler } = zamanCizgisiKur(hepsi, []);
		expect(yillar.map((y) => y.yil)).toEqual([1998, 2001]);
		const y1998 = yillar[0];
		expect(y1998.sayi).toBe(4);
		expect(y1998.yilBoyunca.map((o) => o.baslik)).toEqual(['Yalnızca yılı bilinen']);
		expect(y1998.aylar.map((a) => a.ay)).toEqual([5]);
		// Aynı günde, daha belirsiz olan ("Mayıs ayı") önce gelir
		expect(y1998.aylar[0].ogeler.map((o) => o.baslik)).toEqual([
			'Mayıs ayı',
			'1 Mayıs',
			'12 Mayıs'
		]);
		expect(tarihsizler.map((o) => o.baslik)).toEqual(['Tarihsiz']);
	});

	it('"yeni" sırasında her düzeyi tersine çevirir', () => {
		const { yillar } = zamanCizgisiKur(hepsi, [], 'yeni');
		expect(yillar.map((y) => y.yil)).toEqual([2001, 1998]);
		expect(yillar[1].aylar[0].ogeler.map((o) => o.baslik)).toEqual([
			'12 Mayıs',
			'1 Mayıs',
			'Mayıs ayı'
		]);
	});

	it('yoğunluğu boş yıllarla birlikte doldurur', () => {
		const { yogunluk } = zamanCizgisiKur(hepsi, []);
		expect(yogunluk).toEqual([
			{ yil: 1998, sayi: 4 },
			{ yil: 1999, sayi: 0 },
			{ yil: 2000, sayi: 0 },
			{ yil: 2001, sayi: 1 }
		]);
	});

	it('aralık çok genişse yalnızca dolu yılları verir', () => {
		const eski = dugum('Eski', '1850-01-01', 'yil');
		const yeni = dugum('Yeni', `${1850 + EN_GENIS_ARALIK + 1}-01-01`, 'yil');
		expect(zamanCizgisiKur([eski, yeni], []).yogunluk).toHaveLength(2);
	});

	it('götürdüğü düğümleri ekler; listede olmayan uçları atlar', () => {
		const { yillar } = zamanCizgisiKur(hepsi, [
			{ kaynakId: ilkGun.id, hedefId: sonraki.id },
			{ kaynakId: ilkGun.id, hedefId: 'bilinmeyen' }
		]);
		const oge = yillar[0].aylar[0].ogeler.find((o) => o.id === ilkGun.id)!;
		expect(oge.gidenler).toEqual([{ id: sonraki.id, baslik: 'Sonraki yıl' }]);
	});

	it('boş girdide boş sonuç döner', () => {
		expect(zamanCizgisiKur([], [])).toEqual({ yillar: [], tarihsiz: [], yogunluk: [] });
	});
});
