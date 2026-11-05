import { describe, expect, it } from 'vitest';
import { haftaninSorusu, isoHafta, SORU_BANKASI, whatsappBaglantisi } from './sorular';

describe('haftanın sorusu', () => {
	it('ISO haftasına göre sabit, haftadan haftaya değişir', () => {
		expect(isoHafta(new Date('2026-01-01T12:00:00Z'))).toEqual({ yil: 2026, hafta: 1 });
		expect(isoHafta(new Date('2027-01-01T12:00:00Z'))).toEqual({ yil: 2026, hafta: 53 });
		const pazartesi = haftaninSorusu(new Date('2026-11-02T09:00:00Z'));
		expect(haftaninSorusu(new Date('2026-11-08T09:00:00Z'))).toBe(pazartesi);
		expect(haftaninSorusu(new Date('2026-11-09T09:00:00Z'))).not.toBe(pazartesi);
		expect(SORU_BANKASI).toContain(pazartesi);
	});

	it('WhatsApp bağlantısı metni kodlar', () => {
		expect(whatsappBaglantisi('Merhaba & selam')).toBe('https://wa.me/?text=Merhaba%20%26%20selam');
	});
});
