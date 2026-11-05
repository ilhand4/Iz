import { describe, expect, it } from 'vitest';
import { wikidataOzeti } from './wikidata';

describe('wikidataOzeti', () => {
	it('Türkçe açıklamayı, koordinatı ve doğum/ölüm yılını alır', () => {
		const o = wikidataOzeti({
			id: 'Q64',
			descriptions: { tr: { value: "Almanya'nın başkenti" }, en: { value: 'capital of Germany' } },
			claims: {
				P625: [{ mainsnak: { datavalue: { value: { latitude: 52.52, longitude: 13.405 } } } }],
				P569: [{ mainsnak: { datavalue: { value: { time: '+1907-02-25T00:00:00Z' } } } }]
			}
		});
		expect(o).toEqual({
			id: 'Q64',
			aciklama: "Almanya'nın başkenti",
			enlem: 52.52,
			boylam: 13.405,
			dogumYili: 1907,
			olumYili: null
		});
	});

	it('Türkçe yoksa İngilizce; geçersiz kimlik ve koordinatı reddeder', () => {
		expect(wikidataOzeti({ id: 'Q1', descriptions: { en: { value: 'x' } } })?.aciklama).toBe('x');
		expect(wikidataOzeti({ id: 'bozuk' })).toBeNull();
		const kotu = wikidataOzeti({
			id: 'Q2',
			claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 200, longitude: 10 } } } }] }
		});
		expect(kotu?.enlem).toBeNull();
	});
});
