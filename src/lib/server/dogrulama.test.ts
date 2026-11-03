import { describe, expect, it } from 'vitest';
import { bagDogrula, dugumDogrula, girisDogrula, kayitDogrula, uuidMu } from './dogrulama';

function form(alanlar: Record<string, string>) {
	const fd = new FormData();
	for (const [ad, deger] of Object.entries(alanlar)) fd.set(ad, deger);
	return fd;
}

const UUID_A = '6f1c1d2e-3b4a-4c5d-8e9f-0a1b2c3d4e5f';
const UUID_B = '7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('kayitDogrula', () => {
	const gecerli = {
		ad: 'Ayşe Işık',
		kullaniciAdi: 'Ayse.Isik',
		eposta: ' AYSE@Ornek.COM ',
		sifre: 'uzun bir şifre cümlesi',
		sifreTekrar: 'uzun bir şifre cümlesi'
	};

	it('geçerli kaydı kabul eder, kullanıcı adı ve e-postayı küçük harfe çevirir', () => {
		const sonuc = kayitDogrula(form(gecerli));
		expect(sonuc.tamam).toBe(true);
		if (sonuc.tamam) {
			expect(sonuc.veri.kullaniciAdi).toBe('ayse.isik');
			// Türkçe olmayan küçültme: "I" → "i"
			expect(sonuc.veri.eposta).toBe('ayse@ornek.com');
			expect(sonuc.veri.ad).toBe('Ayşe Işık');
		}
	});

	it('Türkçe karakterli kullanıcı adını Türkçe mesajla reddeder', () => {
		const sonuc = kayitDogrula(form({ ...gecerli, kullaniciAdi: 'ayşe' }));
		expect(sonuc.tamam).toBe(false);
		if (!sonuc.tamam) expect(sonuc.hatalar.kullaniciAdi).toMatch(/Türkçe karakter olmadan/);
	});

	it('kısa şifreyi, uyuşmayan tekrarı ve geçersiz e-postayı yakalar', () => {
		const kisa = kayitDogrula(form({ ...gecerli, sifre: 'kisa', sifreTekrar: 'kisa' }));
		expect(!kisa.tamam && kisa.hatalar.sifre).toMatch(/en az 10/);
		const farkli = kayitDogrula(form({ ...gecerli, sifreTekrar: 'baska bir şifre' }));
		expect(!farkli.tamam && farkli.hatalar.sifreTekrar).toMatch(/tutmuyor/);
		const eposta = kayitDogrula(form({ ...gecerli, eposta: 'ayse@' }));
		expect(!eposta.tamam && eposta.hatalar.eposta).toMatch(/Geçerli bir e-posta/);
	});

	it('hatada şifreyi geri göndermez', () => {
		const sonuc = kayitDogrula(form({ ...gecerli, ad: '' }));
		expect(sonuc.tamam).toBe(false);
		if (!sonuc.tamam) {
			expect(sonuc.hatalar.ad).toBeDefined();
			expect(sonuc.degerler).not.toHaveProperty('sifre');
		}
	});
});

describe('girisDogrula', () => {
	it('boş alanlar için Türkçe hata verir', () => {
		const sonuc = girisDogrula(form({}));
		expect(sonuc.tamam).toBe(false);
		if (!sonuc.tamam) {
			expect(sonuc.hatalar.eposta).toBe('E-posta adresinizi yazın.');
			expect(sonuc.hatalar.sifre).toBe('Şifrenizi yazın.');
		}
	});
});

describe('dugumDogrula', () => {
	it('eser için eser türü ister', () => {
		const sonuc = dugumDogrula(form({ tur: 'eser', baslik: 'Tutunamayanlar' }));
		expect(!sonuc.tamam && sonuc.hatalar.eserTuru).toBeTruthy();
	});

	it('eser olmayan düğümde eser türünü ve yayın yılını yok sayar', () => {
		const sonuc = dugumDogrula(
			form({ tur: 'kisi', eserTuru: 'kitap', baslik: 'Oğuz Atay', yil: '' })
		);
		expect(sonuc.tamam).toBe(true);
		if (sonuc.tamam) {
			expect(sonuc.veri.eserTuru).toBeNull();
			expect(sonuc.veri.gizlilik).toBe('ozel');
		}
	});

	it('tarihi ve konumu çözer; virgüllü ondalığı kabul eder', () => {
		const sonuc = dugumDogrula(
			form({ tur: 'yer', baslik: 'Kadıköy', tarih: '1998-07', enlem: '40,9903', boylam: '29.0295' })
		);
		expect(sonuc.tamam).toBe(true);
		if (sonuc.tamam) {
			expect(sonuc.veri.tarih).toBe('1998-07-01');
			expect(sonuc.veri.tarihHassasiyeti).toBe('ay');
			expect(sonuc.veri.enlem).toBeCloseTo(40.9903);
		}
	});

	it('yarım konumu, sınır dışı koordinatı ve bilinmeyen türü reddeder', () => {
		const yarim = dugumDogrula(form({ tur: 'yer', baslik: 'X', enlem: '41' }));
		expect(!yarim.tamam && yarim.hatalar.boylam).toMatch(/ikisini de/);
		const disarida = dugumDogrula(form({ tur: 'yer', baslik: 'X', enlem: '91', boylam: '0' }));
		expect(!disarida.tamam && disarida.hatalar.enlem).toBeTruthy();
		const tur = dugumDogrula(form({ tur: 'robot', baslik: 'X' }));
		expect(!tur.tamam && tur.hatalar.tur).toBeTruthy();
		const gizlilik = dugumDogrula(form({ tur: 'ani', baslik: 'X', gizlilik: 'herkese' }));
		expect(!gizlilik.tamam && gizlilik.hatalar.gizlilik).toBeTruthy();
	});

	it('HTML içeren başlığı olduğu gibi saklar (kaçırma görünümde yapılır)', () => {
		const sonuc = dugumDogrula(form({ tur: 'ani', baslik: '<script>alert(1)</script>' }));
		expect(sonuc.tamam && sonuc.veri.baslik).toBe('<script>alert(1)</script>');
	});
});

describe('bagDogrula', () => {
	it('kendine bağı ve geçersiz hedefi reddeder', () => {
		const kendine = bagDogrula(form({ hedefId: UUID_A }), UUID_A);
		expect(!kendine.tamam && kendine.hatalar.hedefId).toMatch(/kendine/);
		const gecersiz = bagDogrula(form({ hedefId: "1' or 1=1 --" }), UUID_A);
		expect(gecersiz.tamam).toBe(false);
	});

	it('notlu ve tarihli bağı kabul eder', () => {
		const sonuc = bagDogrula(form({ hedefId: UUID_B, not: 'hocam önerdi', tarih: '2019' }), UUID_A);
		expect(sonuc).toEqual({
			tamam: true,
			veri: { hedefId: UUID_B, not: 'hocam önerdi', tarih: '2019-01-01', tarihHassasiyeti: 'yil' }
		});
	});
});

describe('uuidMu', () => {
	it('yalnızca UUID biçimini kabul eder', () => {
		expect(uuidMu(UUID_A)).toBe(true);
		expect(uuidMu('123')).toBe(false);
		expect(uuidMu(null)).toBe(false);
	});
});
