import { describe, expect, it } from 'vitest';
import { imlecOku, imlecYaz } from './imlec';

const ID = '6f1c1d2e-3b4a-4c5d-8e9f-0a1b2c3d4e5f';

describe('imleç', () => {
	it('yazılan imleç aynen okunur (mikro saniyeler korunur)', () => {
		const imlec = { zaman: '2026-11-04 17:19:03.123456+03', id: ID };
		expect(imlecOku(imlecYaz(imlec))).toEqual(imlec);
	});

	it('bozuk ya da kurcalanmış imleçleri reddeder', () => {
		expect(imlecOku(null)).toBeNull();
		expect(imlecOku('')).toBeNull();
		expect(imlecOku('bozuk!')).toBeNull();
		const kotu = (m: string) => Buffer.from(m).toString('base64url');
		expect(imlecOku(kotu(`2026-11-04 17:19:03+03|${ID}|fazla`))).toBeNull();
		expect(imlecOku(kotu(`'; drop table dugumler; --|${ID}`))).toBeNull();
		expect(imlecOku(kotu('2026-11-04 17:19:03+03|kimlik-degil'))).toBeNull();
		expect(imlecOku('a'.repeat(300))).toBeNull();
	});
});
