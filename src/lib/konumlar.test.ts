import { describe, expect, it } from 'vitest';
import { bagCizgileri, koordinatYaz, sinirlar, yerlereGrupla, type KonumluDugum } from './konumlar';

const d = (
	id: string,
	tur: KonumluDugum['tur'],
	enlem: number,
	boylam: number,
	baslik = id,
	yerAdi: string | null = null
): KonumluDugum => ({ id, tur, enlem, boylam, baslik, yerAdi });

const moda = d('moda', 'yer', 40.98, 29.025, 'Moda');
const kulup = d('kulup', 'ani', 40.980001, 29.025001, 'Kitap kulübü', 'Moda, Kadıköy');
const kreuzberg = d('kreuzberg', 'yer', 52.4986, 13.4033, 'Kreuzberg');
const kisi = d('kisi', 'kisi', 52.4986, 13.4033, 'Deniz');

describe('yerlereGrupla', () => {
	it('aynı noktadakileri toplar, yerin adını "yer" düğümünden alır', () => {
		const yerler = yerlereGrupla([kulup, kreuzberg, moda, kisi]);
		expect(yerler.map((y) => [y.ad, y.dugumler.map((x) => x.id)])).toEqual([
			['Kreuzberg', ['kreuzberg', 'kisi']],
			['Moda', ['moda', 'kulup']]
		]);
	});

	it('yer düğümü yoksa yer adını, o da yoksa başlığı kullanır', () => {
		expect(yerlereGrupla([kulup])[0].ad).toBe('Moda, Kadıköy');
		expect(yerlereGrupla([kisi])[0].ad).toBe('Deniz');
	});
});

describe('sinirlar', () => {
	it('güneybatı ve kuzeydoğu köşelerini verir', () => {
		expect(sinirlar([moda, kreuzberg])).toEqual([
			[13.4033, 40.98],
			[29.025, 52.4986]
		]);
		expect(sinirlar([])).toBeNull();
	});
});

describe('bagCizgileri', () => {
	it('iki ucu konumlu bağları çizer; aynı yer ve yinelenen çiftleri atlar', () => {
		const cizgiler = bagCizgileri(
			[
				{ kaynakId: 'moda', hedefId: 'kreuzberg', tur: 'besler' },
				{ kaynakId: 'kisi', hedefId: 'kulup', tur: null },
				{ kaynakId: 'moda', hedefId: 'kulup', tur: null },
				{ kaynakId: 'moda', hedefId: 'konumsuz', tur: null }
			],
			[moda, kulup, kreuzberg, kisi]
		);
		expect(cizgiler).toHaveLength(1);
		expect(cizgiler[0]).toMatchObject({
			properties: { tur: 'besler' },
			geometry: {
				coordinates: [
					[29.025, 40.98],
					[13.4033, 52.4986]
				]
			}
		});
	});
});

it('koordinatı 6 haneye yuvarlar', () => {
	expect(koordinatYaz(40.990912345)).toBe('40.990912');
	expect(koordinatYaz(-0.1)).toBe('-0.1');
});

it('mesafeyi okunur yazar', async () => {
	const { mesafeYaz } = await import('./konumlar');
	expect([mesafeYaz(0), mesafeYaz(347), mesafeYaz(1240), mesafeYaz(2000)]).toEqual([
		'0 m',
		'350 m',
		'1,2 km',
		'2 km'
	]);
});
