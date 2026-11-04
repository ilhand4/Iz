import { describe, expect, it } from 'vitest';
import { hizliCoz } from './hizliEkle';

describe('hizliCoz', () => {
	it('virgülle ayrılmış öneriyi çözer; öneri tek başınaysa merak listesine düşer', () => {
		expect(hizliCoz('Tutunamayanlar, Selin Hoca önerdi')).toEqual({
			ana: 'Tutunamayanlar',
			getiren: 'Selin Hoca',
			not: 'önerdi',
			durum: 'merak',
			eserTuru: null,
			getirenTuru: 'kisi'
		});
	});

	it('ana kısımdaki fiilden durumu ve eser türünü çıkarır, belirtme ekini atar', () => {
		expect(hizliCoz("Tutunamayanlar'ı okudum, Selin Hoca önerdi")).toMatchObject({
			ana: 'Tutunamayanlar',
			durum: 'bitti',
			eserTuru: 'kitap',
			getiren: 'Selin Hoca'
		});
		expect(hizliCoz('Babylon Berlin izliyorum')).toMatchObject({
			ana: 'Babylon Berlin',
			durum: 'suruyor',
			eserTuru: 'film',
			getiren: null
		});
		expect(hizliCoz('Aylak Adam yarım bıraktım').durum).toBe('yarim');
	});

	it('"okurken" kalıbında getireni bir eser olarak tanır', () => {
		expect(hizliCoz("Kuyucaklı Yusuf, Kürk Mantolu Madonna'yı okurken")).toMatchObject({
			ana: 'Kuyucaklı Yusuf',
			getiren: 'Kürk Mantolu Madonna',
			not: 'okurken',
			getirenTuru: 'eser'
		});
	});

	it('keşif fiillerinde ayrılma ekini atar', () => {
		expect(hizliCoz("Babylon Berlin; Twitter'dan duydum")).toMatchObject({
			ana: 'Babylon Berlin',
			getiren: 'Twitter',
			not: 'duydum'
		});
		expect(hizliCoz('Kürk Mantolu Madonna — babaannemin kitaplığından buldum').getiren).toBe(
			'babaannemin kitaplığı'
		);
	});

	it('"…in önerisiyle" kalıbını çözer', () => {
		expect(hizliCoz("Aylak Adam, Selin'in önerisiyle")).toMatchObject({
			getiren: 'Selin',
			not: 'önerisiyle',
			getirenTuru: 'kisi'
		});
	});

	it('oklarla yazılmış ifadeleri iki yönde de çözer', () => {
		expect(hizliCoz("Disco Elysium ← Kreuzberg'de ilk kış")).toMatchObject({
			ana: 'Disco Elysium',
			getiren: "Kreuzberg'de ilk kış"
		});
		expect(hizliCoz("Nick Cave -> The Boatman's Call")).toMatchObject({
			ana: "The Boatman's Call",
			getiren: 'Nick Cave'
		});
	});

	it('yalnızca başlık yazılınca getiren boş kalır; tırnakları ve fazla boşluğu temizler', () => {
		expect(hizliCoz('  “Aylak   Adam”  ')).toEqual({
			ana: 'Aylak Adam',
			getiren: null,
			not: null,
			durum: null,
			eserTuru: null,
			getirenTuru: null
		});
	});

	it('tanımadığı kuyruğu olduğu gibi getiren sayar', () => {
		expect(hizliCoz('Berlin, Almanca kursu')).toMatchObject({
			ana: 'Berlin',
			getiren: 'Almanca kursu',
			not: null
		});
	});

	it('kısa çizgili adları ayırıcı saymaz', () => {
		expect(hizliCoz('Spider-Man, kardeşim önerdi')).toMatchObject({
			ana: 'Spider-Man',
			getiren: 'kardeşim'
		});
	});

	it('ok işaretinin solundaki öneri fiilini de ayıklar', () => {
		expect(hizliCoz('Deniz önerdi → Aylak Adam')).toMatchObject({
			ana: 'Aylak Adam',
			getiren: 'Deniz',
			not: 'önerdi',
			getirenTuru: 'kisi',
			durum: 'merak'
		});
		expect(hizliCoz('Kreuzberg’de ilk kış → Disco Elysium')).toMatchObject({
			ana: 'Disco Elysium',
			getiren: 'Kreuzberg’de ilk kış'
		});
	});
});
