import { describe, expect, it } from 'vitest';
import { bagAviAdayi, gununSecimi, soruGunuMu, yillikKur, type YalinDugum } from './geriGetirenler';

const d = (id: string, tarih: string | null, altBaslik: string | null = null): YalinDugum => ({
	id,
	baslik: id,
	altBaslik,
	tur: 'eser',
	tarih
});
const b = (kaynakId: string, hedefId: string) => ({ kaynakId, hedefId });

describe('bağ avı', () => {
	it('önce aynı yazarı, sonra hemen öncesini önerir; redleri ve var olan bağları atlar', () => {
		const dugumler = [
			d('Madonna', '1998-08-01', 'Sabahattin Ali'),
			d('Kuyucaklı', '1999-01-01', 'sabahattin ali'),
			d('Berlin', '1998-12-01'),
			d('Uzak', '2010-01-01')
		];
		expect(bagAviAdayi(dugumler, [], [])).toMatchObject({
			kaynak: { id: 'Madonna' },
			hedef: { id: 'Kuyucaklı' },
			gerekce: 'ayni-yapimci'
		});
		// Aynı yazar reddedilince hemen öncesi (Berlin, 1 ay önce)
		const ikinci = bagAviAdayi(dugumler, [], [b('Madonna', 'Kuyucaklı')]);
		expect(ikinci).toMatchObject({
			kaynak: { id: 'Berlin' },
			hedef: { id: 'Kuyucaklı' },
			gerekce: 'hemen-oncesi'
		});
		// Kuyucaklı'nın gelen bağı varsa sıradaki hedefe geçilir
		const ucuncu = bagAviAdayi(dugumler, [b('Berlin', 'Kuyucaklı')], []);
		expect(ucuncu?.hedef.id).toBe('Berlin');
	});

	it('uygun aday yoksa null', () => {
		expect(bagAviAdayi([d('Tek', '2000-01-01')], [], [])).toBeNull();
		expect(bagAviAdayi([d('A', '2000-01-01'), d('B', '2005-01-01')], [], [])).toBeNull();
	});
});

describe('günün sorusu', () => {
	it('yalnızca pazartesi, çarşamba, cuma (İstanbul saatiyle)', () => {
		expect(soruGunuMu(new Date('2026-11-02T09:00:00Z'))).toBe(true); // pazartesi
		expect(soruGunuMu(new Date('2026-11-03T09:00:00Z'))).toBe(false); // salı
		// UTC'de salı 22:30, İstanbul'da çarşamba 01:30
		expect(soruGunuMu(new Date('2026-11-03T22:30:00Z'))).toBe(true);
	});

	it('aynı gün aynı seçim', () => {
		const a = ['x', 'y', 'z'];
		expect(gununSecimi(a, '2026-11-04')).toBe(gununSecimi(a, '2026-11-04'));
		expect(gununSecimi([], '2026-11-04')).toBeNull();
	});
});

describe('İz Yıllığı', () => {
	it('yılın düğümlerini, en çok götüreni, en uzun zinciri ve kümeleri bulur', () => {
		const dugumler = [
			d('Eski', '2019-05-01'),
			d('A', '2022-01-01'),
			d('B', '2022-02-01'),
			d('C', '2022-03-01'),
			d('D', '2022-04-01'),
			d('X', '2022-05-01'),
			d('Sonra', '2023-01-01')
		];
		const baglar = [
			b('Eski', 'A'),
			b('A', 'B'),
			b('B', 'C'),
			b('C', 'D'),
			b('A', 'X'),
			b('D', 'Sonra')
		];
		const y = yillikKur(2022, dugumler, baglar);
		expect(y.toplam).toBe(5);
		expect(y.turler).toEqual({ eser: 5 });
		expect(y.enCokGoturen).toMatchObject({ id: 'A', ulasilan: 4 });
		expect(y.enUzunZincir.map((x) => x.id)).toEqual(['A', 'B', 'C', 'D']);
		expect(y.kumeler).toHaveLength(1);
		expect(y.kumeler[0]).toHaveLength(5);
		expect(y.gecmistenGelen).toBe(1);
		expect(yillikKur(1990, dugumler, baglar).toplam).toBe(0);
	});
});
