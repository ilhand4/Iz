import { describe, expect, it } from 'vitest';
import { halusinasyonuAyikla, sesTuru, sureYaz } from './ses';
import { varlikCikar } from './varliklar';

const mevcut = [
	{ id: '1', baslik: 'Kadıköy', tur: 'yer' as const },
	{ id: '2', baslik: 'Selin Hoca', tur: 'kisi' as const },
	{ id: '3', baslik: 'Ev', tur: 'yer' as const }
];

describe('varlikCikar', () => {
	it('haritadakileri eşleştirir, yeni kişi ve yerleri ekinden tanır', () => {
		const metin =
			"1965 yazında Kadıköy'den Kuzguncuk'a taşındık. Ayşe teyzenin bahçesi vardı; " +
			"Mehmet Amca'nın kahvesinde Selin Hoca ile tanıştım. Sonra Moda Sahili'nde yürürdük. " +
			'Babam 1971 yılında Almanya’ya gitti.';
		const s = varlikCikar(metin, mevcut);
		expect(s.eslesenler.map((d) => d.baslik)).toEqual(['Kadıköy', 'Selin Hoca']);
		expect(s.yillar).toEqual([1965, 1971]);
		const adlar = Object.fromEntries(s.yeniler.map((y) => [y.ad, y.tur]));
		expect(adlar).toMatchObject({
			Kuzguncuk: 'yer',
			'Mehmet Amca': 'kisi',
			'Moda Sahili': 'yer',
			Almanya: 'yer'
		});
		// "Babam" cümle başında ve tek: ad sayılmaz; "Sonra" atılır
		expect(Object.keys(adlar)).not.toContain('Babam');
		expect(Object.keys(adlar)).not.toContain('Sonra');
		// "teyzenin" ekli akrabalık sözcüğü: kökü ada katılır
		expect(adlar['Ayşe teyze']).toBe('kisi');
	});

	it('küçük harfle gelen akrabalık sözcüğünü ada katar', () => {
		const s = varlikCikar('Bayramlarda Fatma nine bize gelirdi.', []);
		expect(s.yeniler).toEqual([
			{ ad: 'Fatma nine', tur: 'kisi', kanit: 'akrabalık / hitap sözcüğü' }
		]);
	});

	it('kısa başlıkları ve sözcük içi eşleşmeleri saymaz', () => {
		const s = varlikCikar('Evlendikten sonra Kadıköylü olduk.', mevcut);
		expect(s.eslesenler).toEqual([]);
	});
});

describe('ses', () => {
	it('dosya türünü baytlardan tanır', () => {
		const b = (...x: number[]) => new Uint8Array([...x, ...new Array(12).fill(0)]);
		const yazi = (s: string) => [...s].map((c) => c.charCodeAt(0));
		expect(sesTuru(b(0x1a, 0x45, 0xdf, 0xa3))).toBe('webm');
		expect(sesTuru(b(...yazi('OggS')))).toBe('ogg');
		expect(sesTuru(b(...yazi('RIFF'), 0, 0, 0, 0, ...yazi('WAVE')))).toBe('wav');
		expect(sesTuru(b(0, 0, 0, 0x20, ...yazi('ftypM4A ')))).toBe('m4a');
		expect(sesTuru(b(...yazi('ID3')))).toBe('mp3');
		expect(sesTuru(b(...yazi('%PDF')))).toBeNull();
	});

	it('süreyi yazar', () => {
		expect([sureYaz(5), sureYaz(65), sureYaz(750)]).toEqual(['0:05', '1:05', '12:30']);
	});

	it('Whisper’ın altyazı halüsinasyonlarını ayıklar', () => {
		expect(halusinasyonuAyikla('Altyazı M.K.')).toBe('');
		expect(halusinasyonuAyikla('Erik ağacı vardı. İzlediğiniz için teşekkürler.')).toBe(
			'Erik ağacı vardı.'
		);
		expect(halusinasyonuAyikla('[Müzik] Annem şarkı söylerdi.')).toBe('Annem şarkı söylerdi.');
		// Gerçek bir cümle silinmez
		expect(halusinasyonuAyikla('Altyazılı filmleri severdi.')).toBe('Altyazılı filmleri severdi.');
	});
});
