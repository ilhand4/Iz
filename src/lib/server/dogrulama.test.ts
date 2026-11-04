import { describe, expect, it } from 'vitest';
import {
	adimNotuDogrula,
	bagBilgisiDogrula,
	bagDogrula,
	dugumDogrula,
	getirenDogrula,
	girisDogrula,
	hizliSecimDogrula,
	ilkIzDogrula,
	izDogrula,
	kayitDogrula,
	konumlarDogrula,
	uuidMu
} from './dogrulama';

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
		const kendine = bagDogrula(form({ digerId: UUID_A }), UUID_A);
		expect(!kendine.tamam && kendine.hatalar.digerId).toMatch(/kendine/);
		const gecersiz = bagDogrula(form({ digerId: "1' or 1=1 --" }), UUID_A);
		expect(gecersiz.tamam).toBe(false);
	});

	it('"giden" yönde bu düğüm kaynak olur; not ve tarihi çözer', () => {
		const sonuc = bagDogrula(
			form({ digerId: UUID_B, yon: 'giden', not: 'hocam önerdi', tarih: '2019' }),
			UUID_A
		);
		expect(sonuc).toEqual({
			tamam: true,
			veri: {
				kaynakId: UUID_A,
				hedefId: UUID_B,
				not: 'hocam önerdi',
				tarih: '2019-01-01',
				tarihHassasiyeti: 'yil'
			}
		});
	});

	it('"gelen" yönde diğer düğüm kaynak olur; yön verilmezse "giden" sayılır', () => {
		const gelen = bagDogrula(form({ digerId: UUID_B, yon: 'gelen' }), UUID_A);
		expect(gelen.tamam && gelen.veri).toMatchObject({ kaynakId: UUID_B, hedefId: UUID_A });
		const varsayilan = bagDogrula(form({ digerId: UUID_B, yon: 'saçma' }), UUID_A);
		expect(varsayilan.tamam && varsayilan.veri).toMatchObject({
			kaynakId: UUID_A,
			hedefId: UUID_B
		});
	});

	it('yöne göre Türkçe hata verir', () => {
		const giden = bagDogrula(form({ yon: 'giden' }), UUID_A);
		expect(!giden.tamam && giden.hatalar.digerId).toBe('Seni nereye götürdüğünü seç.');
		const gelen = bagDogrula(form({ yon: 'gelen' }), UUID_A);
		expect(!gelen.tamam && gelen.hatalar.digerId).toBe('Seni buraya neyin getirdiğini seç.');
	});
});

describe('bagBilgisiDogrula', () => {
	it('notu ve tarihi doğrular', () => {
		expect(bagBilgisiDogrula(form({ not: '', tarih: '' }))).toEqual({
			tamam: true,
			veri: { not: null, tarih: null, tarihHassasiyeti: null }
		});
		const hatali = bagBilgisiDogrula(form({ not: 'x'.repeat(1001), tarih: '32.13.2020' }));
		expect(hatali.tamam).toBe(false);
		if (!hatali.tamam) {
			expect(hatali.hatalar.not).toBeDefined();
			expect(hatali.hatalar.tarih).toBeDefined();
		}
	});
});

describe('izDogrula', () => {
	it('adı zorunlu tutar; gizlilik varsayılanı özeldir', () => {
		const bos = izDogrula(form({}));
		expect(!bos.tamam && bos.hatalar.baslik).toBe('İze bir ad ver.');
		expect(izDogrula(form({ baslik: '  Bir kitaplıktan Berlin’e  ' }))).toEqual({
			tamam: true,
			veri: {
				baslik: 'Bir kitaplıktan Berlin’e',
				aciklama: null,
				gizlilik: 'ozel',
				ortakGrupId: null
			}
		});
	});

	it('uzun adı ve geçersiz gizliliği reddeder', () => {
		const sonuc = izDogrula(form({ baslik: 'x'.repeat(121), gizlilik: 'herkese' }));
		expect(sonuc.tamam).toBe(false);
		if (!sonuc.tamam) {
			expect(sonuc.hatalar.baslik).toMatch(/120/);
			expect(sonuc.hatalar.gizlilik).toBeDefined();
		}
	});
});

describe('adimNotuDogrula', () => {
	it('boş notu null yapar, çok uzun notu reddeder', () => {
		expect(adimNotuDogrula(form({ not: '   ' }))).toEqual({ tamam: true, veri: { not: null } });
		expect(adimNotuDogrula(form({ not: 'x'.repeat(2001) })).tamam).toBe(false);
	});
});

describe('uuidMu', () => {
	it('yalnızca UUID biçimini kabul eder', () => {
		expect(uuidMu(UUID_A)).toBe(true);
		expect(uuidMu('123')).toBe(false);
		expect(uuidMu(null)).toBe(false);
	});
});

describe('getirenDogrula', () => {
	it('boş bırakılan soru "bilmiyorum" sayılır', () => {
		const hatalar = {};
		expect(getirenDogrula(form({}), hatalar).getiren).toEqual({ kip: 'yok' });
		expect(getirenDogrula(form({ getirenKip: 'mevcut' }), hatalar).getiren).toEqual({
			kip: 'yok'
		});
		expect(hatalar).toEqual({});
	});

	it('haritadan seçim, yeni düğüm ve geçersiz kimlik', () => {
		const hatalar: Record<string, string> = {};
		expect(
			getirenDogrula(
				form({ getirenKip: 'mevcut', getirenId: UUID_A, getirenNot: 'önerdi' }),
				hatalar
			)
		).toMatchObject({ getiren: { kip: 'mevcut', id: UUID_A }, not: 'önerdi' });
		expect(
			getirenDogrula(
				form({ getirenKip: 'yeni', getirenBaslik: 'Selin Hoca', getirenTur: 'uydurma' }),
				hatalar
			).getiren
		).toEqual({ kip: 'yeni', tur: 'kisi', eserTuru: null, baslik: 'Selin Hoca' });
		expect(hatalar).toEqual({});
		getirenDogrula(form({ getirenKip: 'mevcut', getirenId: 'x' }), hatalar);
		expect(hatalar.getiren).toBeDefined();
	});
});

describe('ilkIzDogrula', () => {
	const tam = {
		eserTuru: 'kitap',
		eserBaslik: 'Tutunamayanlar',
		getirenTur: 'kisi',
		getirenBaslik: 'Selin Hoca',
		gidenTur: 'eser',
		gidenEserTuru: 'film',
		gidenBaslik: 'Uzak'
	};

	it('üç durağı ve varsayılan iz adını verir', () => {
		const s = ilkIzDogrula(form(tam));
		expect(s.tamam && s.veri).toMatchObject({
			eser: { eserTuru: 'kitap', baslik: 'Tutunamayanlar', altBaslik: null },
			getiren: { tur: 'kisi', eserTuru: null, baslik: 'Selin Hoca' },
			giden: { tur: 'eser', eserTuru: 'film', baslik: 'Uzak' },
			izBaslik: 'İlk izim'
		});
	});

	it('eser ve en az bir yan durak ister', () => {
		const s = ilkIzDogrula(form({ eserTuru: 'kitap', eserBaslik: 'Yalnız' }));
		expect(s.tamam).toBe(false);
		if (!s.tamam) expect(Object.keys(s.hatalar)).toEqual(['getirenBaslik']);
		const t = ilkIzDogrula(form({ ...tam, eserTuru: 'roman', eserBaslik: '' }));
		if (!t.tamam) expect(Object.keys(t.hatalar).sort()).toEqual(['eserBaslik', 'eserTuru']);
		else throw new Error('geçmemeliydi');
	});
});

describe('konumlarDogrula', () => {
	it('geçerli listeyi kabul eder, bozuk ya da aşırı değerleri reddeder', () => {
		expect(konumlarDogrula({ konumlar: [{ id: UUID_A, x: 1.5, y: -2 }] })).toEqual([
			{ id: UUID_A, x: 1.5, y: -2 }
		]);
		expect(konumlarDogrula({ konumlar: [] })).toEqual([]);
		expect(konumlarDogrula(null)).toBeNull();
		expect(konumlarDogrula({ konumlar: [{ id: 'x', x: 1, y: 1 }] })).toBeNull();
		expect(konumlarDogrula({ konumlar: [{ id: UUID_A, x: '1', y: 1 }] })).toBeNull();
		expect(konumlarDogrula({ konumlar: [{ id: UUID_A, x: Infinity, y: 1 }] })).toBeNull();
		expect(konumlarDogrula({ konumlar: [{ id: UUID_A, x: 1e8, y: 1 }] })).toBeNull();
		expect(
			konumlarDogrula({
				konumlar: Array.from({ length: 5001 }, () => ({ id: UUID_A, x: 0, y: 0 }))
			})
		).toBeNull();
	});
});

describe('hizliSecimDogrula', () => {
	it('haritadaki düğüm, dış eser ve yeni düğüm seçimlerini çözer', () => {
		const m = hizliSecimDogrula(form({ ana: `mevcut:${UUID_A}`, getiren: 'yok', durum: 'merak' }));
		expect(m.tamam && m.veri).toMatchObject({ ana: { kip: 'mevcut', id: UUID_A }, durum: 'merak' });

		const d = hizliSecimDogrula(form({ ana: 'dis:tmdb:movie/603', getiren: `mevcut:${UUID_B}` }));
		expect(d.tamam && d.veri).toMatchObject({
			ana: { kip: 'dis', kaynak: 'tmdb', disKimlik: 'movie/603' },
			getiren: { kip: 'mevcut', id: UUID_B }
		});

		const y = hizliSecimDogrula(
			form({
				ana: 'yeni',
				tur: 'eser',
				eserTuru: 'film',
				baslik: 'Uzak',
				getiren: 'yeni',
				getirenBaslik: 'Deniz',
				tarih: '05.2024'
			})
		);
		expect(y.tamam && y.veri).toMatchObject({
			ana: { kip: 'yeni', tur: 'eser', eserTuru: 'film', baslik: 'Uzak' },
			getiren: { kip: 'yeni', tur: 'kisi', baslik: 'Deniz' },
			tarih: '2024-05-01',
			tarihHassasiyeti: 'ay'
		});
	});

	it('uydurma dış kimliği ve eksik seçimi reddeder', () => {
		expect(hizliSecimDogrula(form({ ana: 'dis:tmdb:../../etc' })).tamam).toBe(false);
		expect(hizliSecimDogrula(form({ ana: 'dis:baska:OL1W' })).tamam).toBe(false);
		expect(hizliSecimDogrula(form({ ana: 'mevcut:x' })).tamam).toBe(false);
		const bos = hizliSecimDogrula(form({ ana: 'yeni', tur: 'eser' }));
		if (!bos.tamam) expect(bos.hatalar.baslik).toBeDefined();
		else throw new Error('geçmemeliydi');
		expect(hizliSecimDogrula(form({ ana: `mevcut:${UUID_A}`, tarih: '32.13.2020' })).tamam).toBe(
			false
		);
	});
});
