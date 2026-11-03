// Form doğrulama: saf fonksiyonlar, Türkçe hata mesajları (birim testleri: dogrulama.test.ts)
import {
	dugumTuruMu,
	eserTuruMu,
	gizlilikMi,
	type DugumTuru,
	type EserTuru,
	type Gizlilik,
	type TarihHassasiyeti
} from '../sabitler';
import { tarihCoz } from '../tarih';

export type Hatalar = Record<string, string>;
export type Sonuc<T> =
	| { tamam: true; veri: T }
	| { tamam: false; hatalar: Hatalar; degerler: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidMu(deger: unknown): deger is string {
	return typeof deger === 'string' && UUID.test(deger);
}

/** Formdan kırpılmış metin alır; dosya ya da eksik alan için boş metin döner */
export function alan(fd: FormData, ad: string): string {
	const deger = fd.get(ad);
	return typeof deger === 'string' ? deger.trim() : '';
}

function degerleriAl(fd: FormData, adlar: string[]): Record<string, string> {
	return Object.fromEntries(adlar.map((ad) => [ad, alan(fd, ad)]));
}

// ——— Hesap ———

export const KULLANICI_ADI_DESENI = /^[a-z0-9_.]{3,30}$/;

export function kullaniciAdiHatasi(ad: string): string | null {
	if (!ad) return 'Kullanıcı adı gerekli.';
	if (ad.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı.';
	if (ad.length > 30) return 'Kullanıcı adı en fazla 30 karakter olabilir.';
	if (!KULLANICI_ADI_DESENI.test(ad))
		return 'Kullanıcı adında yalnızca küçük harf (a-z, Türkçe karakter olmadan), rakam, nokta ve alt çizgi kullanılabilir.';
	return null;
}

export function epostaHatasi(eposta: string): string | null {
	if (!eposta) return 'E-posta adresi gerekli.';
	if (eposta.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta))
		return 'Geçerli bir e-posta adresi girin.';
	return null;
}

export const SIFRE_EN_AZ = 10;
export const SIFRE_EN_FAZLA = 200;

export function sifreHatasi(sifre: string): string | null {
	if (!sifre) return 'Şifre gerekli.';
	if (sifre.length < SIFRE_EN_AZ) return `Şifre en az ${SIFRE_EN_AZ} karakter olmalı.`;
	if (sifre.length > SIFRE_EN_FAZLA) return `Şifre en fazla ${SIFRE_EN_FAZLA} karakter olabilir.`;
	return null;
}

export type KayitVerisi = { ad: string; kullaniciAdi: string; eposta: string; sifre: string };

export function kayitDogrula(fd: FormData): Sonuc<KayitVerisi> {
	const ad = alan(fd, 'ad');
	// E-posta ve kullanıcı adı için Türkçe olmayan küçük harf: "I" → "i" (ı değil)
	const kullaniciAdi = alan(fd, 'kullaniciAdi').toLowerCase();
	const eposta = alan(fd, 'eposta').toLowerCase();
	// Şifre kırpılmaz: baştaki/sondaki boşluklar da şifrenin parçası olabilir
	const sifre = String(fd.get('sifre') ?? '');
	const sifreTekrar = String(fd.get('sifreTekrar') ?? '');

	const hatalar: Hatalar = {};
	if (!ad) hatalar.ad = 'Adınızı yazın.';
	else if (ad.length > 80) hatalar.ad = 'Ad en fazla 80 karakter olabilir.';

	const kaHata = kullaniciAdiHatasi(kullaniciAdi);
	if (kaHata) hatalar.kullaniciAdi = kaHata;
	const epHata = epostaHatasi(eposta);
	if (epHata) hatalar.eposta = epHata;
	const sfHata = sifreHatasi(sifre);
	if (sfHata) hatalar.sifre = sfHata;
	else if (sifre.toLowerCase() === kullaniciAdi || sifre.toLowerCase() === eposta)
		hatalar.sifre = 'Şifre kullanıcı adınız ya da e-postanızla aynı olamaz.';
	if (!hatalar.sifre && sifre !== sifreTekrar) hatalar.sifreTekrar = 'Şifreler birbirini tutmuyor.';

	if (Object.keys(hatalar).length)
		return { tamam: false, hatalar, degerler: { ad, kullaniciAdi, eposta } };
	return { tamam: true, veri: { ad, kullaniciAdi, eposta, sifre } };
}

export function girisDogrula(fd: FormData): Sonuc<{ eposta: string; sifre: string }> {
	const eposta = alan(fd, 'eposta').toLowerCase();
	const sifre = String(fd.get('sifre') ?? '');
	const hatalar: Hatalar = {};
	if (!eposta) hatalar.eposta = 'E-posta adresinizi yazın.';
	if (!sifre) hatalar.sifre = 'Şifrenizi yazın.';
	else if (sifre.length > SIFRE_EN_FAZLA) hatalar.sifre = 'E-posta ya da şifre hatalı.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: { eposta } };
	return { tamam: true, veri: { eposta, sifre } };
}

// ——— Düğüm ———

export type DugumVerisi = {
	tur: DugumTuru;
	eserTuru: EserTuru | null;
	baslik: string;
	altBaslik: string | null;
	aciklama: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
	yil: number | null;
	enlem: number | null;
	boylam: number | null;
	yerAdi: string | null;
	gizlilik: Gizlilik;
};

const DUGUM_ALANLARI = [
	'tur',
	'eserTuru',
	'baslik',
	'altBaslik',
	'aciklama',
	'tarih',
	'yil',
	'enlem',
	'boylam',
	'yerAdi',
	'gizlilik'
];

function sayiCoz(metin: string): number | null | 'gecersiz' {
	if (!metin) return null;
	const n = Number(metin.replace(',', '.'));
	return Number.isFinite(n) ? n : 'gecersiz';
}

export function dugumDogrula(fd: FormData): Sonuc<DugumVerisi> {
	const d = degerleriAl(fd, DUGUM_ALANLARI);
	const hatalar: Hatalar = {};

	if (!dugumTuruMu(d.tur)) hatalar.tur = 'Bir düğüm türü seçin.';
	const tur = d.tur as DugumTuru;

	let eserTuru: EserTuru | null = null;
	if (tur === 'eser') {
		if (eserTuruMu(d.eserTuru)) eserTuru = d.eserTuru;
		else hatalar.eserTuru = 'Eserin türünü seçin (kitap, film, dizi…).';
	}

	if (!d.baslik) hatalar.baslik = 'Başlık gerekli.';
	else if (d.baslik.length > 200) hatalar.baslik = 'Başlık en fazla 200 karakter olabilir.';
	if (d.altBaslik.length > 200) hatalar.altBaslik = 'Alt başlık en fazla 200 karakter olabilir.';
	if (d.aciklama.length > 5000) hatalar.aciklama = 'Açıklama en fazla 5000 karakter olabilir.';
	if (d.yerAdi.length > 200) hatalar.yerAdi = 'Yer adı en fazla 200 karakter olabilir.';

	const tarih = tarihCoz(d.tarih);
	if (tarih === 'gecersiz')
		hatalar.tarih = 'Tarihi 1998, 1998-05, 1998-05-12 ya da 12.05.1998 biçiminde yazın.';

	let yil: number | null = null;
	if (d.yil) {
		if (/^\d{1,4}$/.test(d.yil) && +d.yil >= 1 && +d.yil <= 2999) yil = +d.yil;
		else hatalar.yil = 'Yıl 1 ile 2999 arasında bir sayı olmalı.';
	}

	const enlem = sayiCoz(d.enlem);
	const boylam = sayiCoz(d.boylam);
	if (enlem === 'gecersiz' || (enlem !== null && (enlem < -90 || enlem > 90)))
		hatalar.enlem = 'Enlem -90 ile 90 arasında olmalı.';
	if (boylam === 'gecersiz' || (boylam !== null && (boylam < -180 || boylam > 180)))
		hatalar.boylam = 'Boylam -180 ile 180 arasında olmalı.';
	if (!hatalar.enlem && !hatalar.boylam && (enlem === null) !== (boylam === null))
		hatalar.boylam = 'Konum için enlem ve boylamın ikisini de yazın ya da ikisini de boş bırakın.';

	const gizlilik = d.gizlilik || 'ozel';
	if (!gizlilikMi(gizlilik)) hatalar.gizlilik = 'Geçerli bir gizlilik düzeyi seçin.';

	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: d };

	const konumVar = typeof enlem === 'number' && typeof boylam === 'number';
	return {
		tamam: true,
		veri: {
			tur,
			eserTuru,
			baslik: d.baslik,
			altBaslik: d.altBaslik || null,
			aciklama: d.aciklama || null,
			tarih: tarih && tarih !== 'gecersiz' ? tarih.tarih : null,
			tarihHassasiyeti: tarih && tarih !== 'gecersiz' ? tarih.hassasiyet : null,
			yil,
			enlem: konumVar ? enlem : null,
			boylam: konumVar ? boylam : null,
			yerAdi: d.yerAdi || null,
			gizlilik: gizlilik as Gizlilik
		}
	};
}

// ——— Bağ ———

export type BagVerisi = {
	hedefId: string;
	not: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
};

export function bagDogrula(fd: FormData, kaynakId: string): Sonuc<BagVerisi> {
	const d = degerleriAl(fd, ['hedefId', 'not', 'tarih']);
	const hatalar: Hatalar = {};
	if (!uuidMu(d.hedefId)) hatalar.hedefId = 'Seni nereye götürdüğünü seç.';
	else if (d.hedefId === kaynakId) hatalar.hedefId = 'Bir düğüm kendine bağlanamaz.';
	if (d.not.length > 1000) hatalar.not = 'Not en fazla 1000 karakter olabilir.';
	const tarih = tarihCoz(d.tarih);
	if (tarih === 'gecersiz')
		hatalar.tarih = 'Tarihi 1998, 1998-05, 1998-05-12 ya da 12.05.1998 biçiminde yazın.';

	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: d };
	return {
		tamam: true,
		veri: {
			hedefId: d.hedefId,
			not: d.not || null,
			tarih: tarih && tarih !== 'gecersiz' ? tarih.tarih : null,
			tarihHassasiyeti: tarih && tarih !== 'gecersiz' ? tarih.hassasiyet : null
		}
	};
}
