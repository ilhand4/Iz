import { describe, expect, it } from 'vitest';
import { HizSiniri, beklemeMesaji } from './hizSiniri';
import { gorebilirMi, guvenliDonus, likeKacir } from './yetki';

describe('gorebilirMi', () => {
	const sahip = 'kullanici-1';
	const baska = 'kullanici-2';

	it('sahibi her düzeyi görür', () => {
		for (const gizlilik of ['ozel', 'grup', 'herkes'] as const) {
			expect(gorebilirMi({ sahipId: sahip, gizlilik }, sahip)).toBe(true);
		}
	});

	it('başkası ve giriş yapmamış ziyaretçi yalnızca herkese açık olanı görür', () => {
		expect(gorebilirMi({ sahipId: sahip, gizlilik: 'ozel' }, baska)).toBe(false);
		expect(gorebilirMi({ sahipId: sahip, gizlilik: 'grup' }, baska)).toBe(false);
		expect(gorebilirMi({ sahipId: sahip, gizlilik: 'herkes' }, baska)).toBe(true);
		expect(gorebilirMi({ sahipId: sahip, gizlilik: 'ozel' }, null)).toBe(false);
		expect(gorebilirMi({ sahipId: sahip, gizlilik: 'herkes' }, null)).toBe(true);
	});
});

describe('HizSiniri', () => {
	it('pencere içinde sınırı aşınca durdurur, pencere geçince yeniden izin verir', () => {
		let simdi = 0;
		const sinir = new HizSiniri(3, 60_000, () => simdi);
		expect(sinir.dene('a').izin).toBe(true);
		expect(sinir.dene('a').izin).toBe(true);
		expect(sinir.dene('a').izin).toBe(true);
		const dorduncu = sinir.dene('a');
		expect(dorduncu.izin).toBe(false);
		expect(dorduncu.beklemeSaniye).toBe(60);
		// Başka anahtar etkilenmez
		expect(sinir.dene('b').izin).toBe(true);
		simdi = 60_001;
		expect(sinir.dene('a').izin).toBe(true);
	});

	it('sıfırlanınca hemen izin verir', () => {
		const sinir = new HizSiniri(1, 60_000, () => 0);
		sinir.dene('a');
		expect(sinir.dene('a').izin).toBe(false);
		sinir.sifirla('a');
		expect(sinir.dene('a').izin).toBe(true);
	});

	it('Türkçe bekleme mesajı üretir', () => {
		expect(beklemeMesaji(30)).toBe(
			'Çok fazla deneme yapıldı. Lütfen 30 saniye sonra tekrar deneyin.'
		);
		expect(beklemeMesaji(600)).toBe(
			'Çok fazla deneme yapıldı. Lütfen 10 dakika sonra tekrar deneyin.'
		);
	});
});

describe('guvenliDonus', () => {
	it('yalnızca site içi yolları kabul eder', () => {
		expect(guvenliDonus('/dugumler?tur=eser')).toBe('/dugumler?tur=eser');
		expect(guvenliDonus('https://kotu.example')).toBe('/pano');
		expect(guvenliDonus('//kotu.example')).toBe('/pano');
		expect(guvenliDonus('/\\kotu.example')).toBe('/pano');
		expect(guvenliDonus(null)).toBe('/pano');
	});
});

describe('likeKacir', () => {
	it('ILIKE joker karakterlerini kaçırır', () => {
		expect(likeKacir('100%_a\\b')).toBe('100\\%\\_a\\\\b');
	});
});
