// Form doğrulama: saf fonksiyonlar, Türkçe hata mesajları (birim testleri: dogrulama.test.ts)
import {
	fotoDonemiMi,
	fotoHakkiMi,
	KAYNAK_GEREKEN_HAKLAR,
	type FotoDonemi,
	type FotoHakki
} from '../fotograf';
import {
	bagTuruMu,
	dugumTuruMu,
	eserDurumuMu,
	eserTuruMu,
	gizlilikMi,
	type BagTuru,
	DONEM_RENKLERI,
	type DonemRengi,
	type DugumTuru,
	type Etki,
	etkiMi,
	type EserDurumu,
	type EserTuru,
	type Gizlilik,
	type TarihHassasiyeti
} from '../sabitler';
import { tarihCoz } from '../tarih';
import { disKimlikGecerliMi } from './eserArama';

export type Hatalar = Record<string, string>;
export type Sonuc<T> =
	{ tamam: true; veri: T } | { tamam: false; hatalar: Hatalar; degerler: Record<string, string> };

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

// ——— Hesap ayarları ———

export type ProfilVerisi = { ad: string; hakkinda: string | null; aramaMotorlari: boolean };

export function profilDogrula(fd: FormData): Sonuc<ProfilVerisi> {
	const ad = alan(fd, 'ad');
	const hakkinda = alan(fd, 'hakkinda');
	const hatalar: Hatalar = {};
	if (!ad) hatalar.ad = 'Adınızı yazın.';
	else if (ad.length > 80) hatalar.ad = 'Ad en fazla 80 karakter olabilir.';
	if (hakkinda.length > 300) hatalar.hakkinda = 'Tanıtım en fazla 300 karakter olabilir.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: { ad, hakkinda } };
	return {
		tamam: true,
		veri: { ad, hakkinda: hakkinda || null, aramaMotorlari: alan(fd, 'aramaMotorlari') === 'evet' }
	};
}

export function sifreDegistirDogrula(
	fd: FormData
): Sonuc<{ mevcutSifre: string; yeniSifre: string }> {
	const mevcutSifre = String(fd.get('mevcutSifre') ?? '');
	const yeniSifre = String(fd.get('yeniSifre') ?? '');
	const yeniSifreTekrar = String(fd.get('yeniSifreTekrar') ?? '');
	const hatalar: Hatalar = {};
	if (!mevcutSifre) hatalar.mevcutSifre = 'Mevcut şifrenizi yazın.';
	const hata = sifreHatasi(yeniSifre);
	if (hata) hatalar.yeniSifre = hata;
	else if (yeniSifre === mevcutSifre) hatalar.yeniSifre = 'Yeni şifre eskisiyle aynı olamaz.';
	if (!hatalar.yeniSifre && yeniSifre !== yeniSifreTekrar)
		hatalar.yeniSifreTekrar = 'Şifreler birbirini tutmuyor.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: {} };
	return { tamam: true, veri: { mevcutSifre, yeniSifre } };
}

export function epostaDegistirDogrula(fd: FormData): Sonuc<{ eposta: string; sifre: string }> {
	const eposta = alan(fd, 'yeniEposta').toLowerCase();
	const sifre = String(fd.get('sifre') ?? '');
	const hatalar: Hatalar = {};
	const hata = epostaHatasi(eposta);
	if (hata) hatalar.yeniEposta = hata;
	if (!sifre) hatalar.sifre = 'Değişikliği onaylamak için şifrenizi yazın.';
	if (Object.keys(hatalar).length)
		return { tamam: false, hatalar, degerler: { yeniEposta: eposta } };
	return { tamam: true, veri: { eposta, sifre } };
}

export function hesapSilDogrula(fd: FormData, kullaniciAdi: string): Sonuc<{ sifre: string }> {
	const onay = alan(fd, 'onayKullaniciAdi').toLowerCase().replace(/^@/, '');
	const sifre = String(fd.get('sifre') ?? '');
	const hatalar: Hatalar = {};
	if (onay !== kullaniciAdi) hatalar.onayKullaniciAdi = `Onaylamak için “${kullaniciAdi}” yazın.`;
	if (!sifre) hatalar.sifre = 'Şifrenizi yazın.';
	if (Object.keys(hatalar).length)
		return { tamam: false, hatalar, degerler: { onayKullaniciAdi: onay } };
	return { tamam: true, veri: { sifre } };
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
	/** Yalnızca eserler için; diğer türlerde null */
	durum: EserDurumu | null;
	/** Etki ölçeği; formda alan yoksa dokunulmaz */
	etki?: Etki | null;
	/** Zaman kapsülünün açılış günü (yalnızca formda alan varsa) */
	muhurTarihi?: string | null;
};

const DUGUM_ALANLARI = [
	'tur',
	'muhurTarihi',
	'eserTuru',
	'baslik',
	'altBaslik',
	'aciklama',
	'tarih',
	'yil',
	'enlem',
	'boylam',
	'yerAdi',
	'gizlilik',
	'durum'
];

const TARIH_HATASI = 'Tarihi 1998, 1998-05, 1998-05-12 ya da 12.05.1998 biçiminde yazın.';

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
	if (tarih === 'gecersiz') hatalar.tarih = TARIH_HATASI;

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

	let durum: EserDurumu | null = null;
	if (tur === 'eser' && d.durum) {
		if (eserDurumuMu(d.durum)) durum = d.durum;
		else hatalar.durum = 'Geçerli bir durum seçin.';
	}

	const muhur = muhurCoz(fd, hatalar);
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
			gizlilik: gizlilik as Gizlilik,
			durum,
			...(fd.has('etki') ? { etki: etkiMi(fd.get('etki')) ? (fd.get('etki') as Etki) : null } : {}),
			...(muhur !== undefined ? { muhurTarihi: muhur } : {})
		}
	};
}

/** Zaman kapsülünün açılış günü: boş = kapsül yok; dolu ise gelecekte bir gün olmalı */
function muhurCoz(fd: FormData, hatalar: Hatalar): string | null | undefined {
	if (!fd.has('muhurTarihi')) return undefined;
	const girdi = alan(fd, 'muhurTarihi');
	if (!girdi) return null;
	const t = tarihCoz(girdi);
	if (!t || t === 'gecersiz') {
		hatalar.muhurTarihi = TARIH_HATASI;
		return undefined;
	}
	const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(
		new Date()
	);
	if (t.tarih <= bugun) {
		hatalar.muhurTarihi = 'Açılış günü gelecekte olmalı.';
		return undefined;
	}
	return t.tarih;
}

// ——— Dönemler ve alıntılar ———

export type DonemVerisi = { ad: string; baslangic: string; bitis: string | null; renk: DonemRengi };

/** Dönem: başlangıç zorunlu, bitiş isteğe bağlı (sürüyor). Tarihler gün/ay/yıl hassasiyetinde girilir */
export function donemDogrula(fd: FormData): Sonuc<DonemVerisi> {
	const v = degerleriAl(fd, ['ad', 'baslangic', 'bitis', 'renk']);
	const hatalar: Hatalar = {};
	if (!v.ad) hatalar.ad = 'Döneme bir ad ver.';
	else if (v.ad.length > 80) hatalar.ad = 'Ad en fazla 80 karakter olabilir.';
	const bas = tarihCoz(v.baslangic);
	if (!bas) hatalar.baslangic = 'Başlangıç tarihini yaz (ör. 2004).';
	else if (bas === 'gecersiz') hatalar.baslangic = TARIH_HATASI;
	const bit = tarihCoz(v.bitis);
	if (bit === 'gecersiz') hatalar.bitis = TARIH_HATASI;
	// Bitiş yılı/ayı verildiyse o dönemin sonuna kadar sayılır
	const bitisSonu =
		bit && bit !== 'gecersiz'
			? bit.hassasiyet === 'yil'
				? `${bit.tarih.slice(0, 4)}-12-31`
				: bit.hassasiyet === 'ay'
					? ayinSonGunu(bit.tarih)
					: bit.tarih
			: null;
	if (bas && bas !== 'gecersiz' && bitisSonu && bitisSonu < bas.tarih)
		hatalar.bitis = 'Bitiş başlangıçtan önce olamaz.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: v };
	return {
		tamam: true,
		veri: {
			ad: v.ad,
			baslangic: (bas as { tarih: string }).tarih,
			bitis: bitisSonu,
			renk: (DONEM_RENKLERI as readonly string[]).includes(v.renk)
				? (v.renk as DonemRengi)
				: 'kiremit'
		}
	};
}

function ayinSonGunu(ayBasi: string) {
	const [y, a] = ayBasi.split('-').map(Number);
	const son = new Date(Date.UTC(y, a, 0)).getUTCDate();
	return `${ayBasi.slice(0, 7)}-${String(son).padStart(2, '0')}`;
}

export function alintiDogrula(fd: FormData): Sonuc<{ metin: string; yer: string | null }> {
	const metin = String(fd.get('metin') ?? '').trim();
	const yer = alan(fd, 'yer');
	const hatalar: Hatalar = {};
	if (!metin) hatalar.metin = 'Alıntıyı yaz.';
	else if (metin.length > 2000) hatalar.metin = 'Alıntı en fazla 2000 karakter olabilir.';
	if (yer.length > 60) hatalar.yer = 'En fazla 60 karakter.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: { metin, yer } };
	return { tamam: true, veri: { metin, yer: yer || null } };
}

// ——— Bağ ———

export type BagBilgisi = {
	not: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
	/** Bağın anlamı; formda alan yoksa hiç değiştirilmez (undefined) */
	tur?: BagTuru | null;
};

export type BagVerisi = BagBilgisi & { kaynakId: string; hedefId: string };

/** Bağın notu ve tarihi (kurarken ve düzenlerken ortak) */
function bagBilgisiAl(
	fd: FormData,
	hatalar: Hatalar
): BagBilgisi & { metin: Record<string, string> } {
	const metin = degerleriAl(fd, ['not', 'tarih']);
	if (metin.not.length > 1000) hatalar.not = 'Not en fazla 1000 karakter olabilir.';
	const tarih = tarihCoz(metin.tarih);
	if (tarih === 'gecersiz') hatalar.tarih = TARIH_HATASI;
	const cozuldu = tarih && tarih !== 'gecersiz' ? tarih : null;
	const turHam = fd.get('tur');
	return {
		metin: { ...metin, ...(typeof turHam === 'string' ? { tur: turHam } : {}) },
		not: metin.not || null,
		tarih: cozuldu?.tarih ?? null,
		tarihHassasiyeti: cozuldu?.hassasiyet ?? null,
		...(typeof turHam === 'string' ? { tur: bagTuruMu(turHam) ? turHam : null } : {})
	};
}

/**
 * Bir düğümün sayfasından bağ kurma. yon = "giden": bu düğüm → diğeri ("beni şuna götürdü");
 * yon = "gelen": diğeri → bu düğüm ("beni buraya getirdi").
 */
export function bagDogrula(fd: FormData, buDugumId: string): Sonuc<BagVerisi> {
	const digerId = alan(fd, 'digerId');
	const yon = alan(fd, 'yon') === 'gelen' ? 'gelen' : 'giden';
	const hatalar: Hatalar = {};
	if (!uuidMu(digerId))
		hatalar.digerId =
			yon === 'giden' ? 'Seni nereye götürdüğünü seç.' : 'Seni buraya neyin getirdiğini seç.';
	else if (digerId === buDugumId) hatalar.digerId = 'Bir düğüm kendine bağlanamaz.';
	const bilgi = bagBilgisiAl(fd, hatalar);

	if (Object.keys(hatalar).length)
		return { tamam: false, hatalar, degerler: { ...bilgi.metin, digerId, yon } };
	return {
		tamam: true,
		veri: {
			kaynakId: yon === 'giden' ? buDugumId : digerId,
			hedefId: yon === 'giden' ? digerId : buDugumId,
			not: bilgi.not,
			tarih: bilgi.tarih,
			tarihHassasiyeti: bilgi.tarihHassasiyeti,
			...(bilgi.tur !== undefined ? { tur: bilgi.tur } : {})
		}
	};
}

export function bagBilgisiDogrula(fd: FormData): Sonuc<BagBilgisi> {
	const hatalar: Hatalar = {};
	const { metin, ...bilgi } = bagBilgisiAl(fd, hatalar);
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: metin };
	return { tamam: true, veri: bilgi };
}

// ——— İz ———

export type IzVerisi = {
	baslik: string;
	aciklama: string | null;
	gizlilik: Gizlilik;
	/** Ortak iz grubu; üyelik veri katmanında doğrulanır (üye değilse yok sayılır) */
	ortakGrupId?: string | null;
};

export function izDogrula(fd: FormData): Sonuc<IzVerisi> {
	const d = degerleriAl(fd, ['baslik', 'aciklama', 'gizlilik', 'ortakGrupId']);
	const hatalar: Hatalar = {};
	if (!d.baslik) hatalar.baslik = 'İze bir ad ver.';
	else if (d.baslik.length > 120) hatalar.baslik = 'İzin adı en fazla 120 karakter olabilir.';
	if (d.aciklama.length > 2000) hatalar.aciklama = 'Açıklama en fazla 2000 karakter olabilir.';
	const gizlilik = d.gizlilik || 'ozel';
	if (!gizlilikMi(gizlilik) || gizlilik === 'golge')
		hatalar.gizlilik = 'Geçerli bir gizlilik düzeyi seçin.';

	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: d };
	return {
		tamam: true,
		veri: {
			baslik: d.baslik,
			aciklama: d.aciklama || null,
			gizlilik: gizlilik as Gizlilik,
			ortakGrupId: uuidMu(d.ortakGrupId) ? d.ortakGrupId : null
		}
	};
}

export type GrupVerisi = { ad: string; aciklama: string | null };

export function grupDogrula(fd: FormData): Sonuc<GrupVerisi> {
	const d = degerleriAl(fd, ['ad', 'aciklama']);
	const hatalar: Hatalar = {};
	if (!d.ad) hatalar.ad = 'Gruba bir ad ver.';
	else if (d.ad.length > 80) hatalar.ad = 'Grup adı en fazla 80 karakter olabilir.';
	if (d.aciklama.length > 300) hatalar.aciklama = 'Açıklama en fazla 300 karakter olabilir.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: d };
	return { tamam: true, veri: { ad: d.ad, aciklama: d.aciklama || null } };
}

/** Bir durağın anlatı notu */
export function adimNotuDogrula(fd: FormData): Sonuc<{ not: string | null }> {
	const not = alan(fd, 'not');
	if (not.length > 2000)
		return {
			tamam: false,
			hatalar: { not: 'Not en fazla 2000 karakter olabilir.' },
			degerler: { not }
		};
	return { tamam: true, veri: { not: not || null } };
}

// ——— "Seni buraya ne getirdi?" ———

export type GetirenGirdisi =
	| { kip: 'yok' }
	| { kip: 'mevcut'; id: string }
	| { kip: 'yeni'; tur: DugumTuru; eserTuru: EserTuru | null; baslik: string };

/**
 * Düğüm eklerken getiren düğümü okur: haritadan seçilmiş (getirenId), yeni yazılmış (getirenBaslik)
 * ya da hiç (yok). Kip alanı yoksa doldurulmuş alanlardan çıkarılır (JavaScript'siz kullanım için).
 */
export function getirenDogrula(
	fd: FormData,
	hatalar: Hatalar
): { getiren: GetirenGirdisi; not: string | null; degerler: Record<string, string> } {
	const d = degerleriAl(fd, [
		'getirenKip',
		'getirenId',
		'getirenBaslik',
		'getirenTur',
		'getirenEserTuru',
		'getirenNot'
	]);
	let kip = d.getirenKip;
	if (kip !== 'mevcut' && kip !== 'yeni' && kip !== 'yok') {
		kip = uuidMu(d.getirenId) ? 'mevcut' : d.getirenBaslik ? 'yeni' : 'yok';
	}

	// Seçim yapılmadan bırakılan bölüm "bilmiyorum" sayılır; soru zorunlu değildir
	let getiren: GetirenGirdisi = { kip: 'yok' };
	if (kip === 'mevcut' && d.getirenId) {
		if (uuidMu(d.getirenId)) getiren = { kip: 'mevcut', id: d.getirenId };
		else hatalar.getiren = 'Haritandan seni buraya getiren düğümü seç ya da “Bilmiyorum” de.';
	} else if (kip === 'yeni' && d.getirenBaslik) {
		const tur = dugumTuruMu(d.getirenTur) ? d.getirenTur : 'kisi';
		const eserTuru =
			tur === 'eser' ? (eserTuruMu(d.getirenEserTuru) ? d.getirenEserTuru : 'kitap') : null;
		if (d.getirenBaslik.length > 200) hatalar.getirenBaslik = 'Ad en fazla 200 karakter olabilir.';
		else getiren = { kip: 'yeni', tur, eserTuru, baslik: d.getirenBaslik };
	}
	if (d.getirenNot.length > 1000) hatalar.getirenNot = 'Not en fazla 1000 karakter olabilir.';

	return { getiren, not: d.getirenNot || null, degerler: { ...d, getirenKip: kip } };
}

// ——— İlk iz sihirbazı ———

export type SihirbazDugumu = {
	tur: DugumTuru;
	eserTuru: EserTuru | null;
	baslik: string;
	not: string | null;
};

export type IlkIzVerisi = {
	eser: { eserTuru: EserTuru; baslik: string; altBaslik: string | null };
	getiren: SihirbazDugumu | null;
	giden: SihirbazDugumu | null;
	izBaslik: string;
};

const SIHIRBAZ_ALANLARI = [
	'eserTuru',
	'eserBaslik',
	'eserAlt',
	'getirenTur',
	'getirenEserTuru',
	'getirenBaslik',
	'getirenNot',
	'gidenTur',
	'gidenEserTuru',
	'gidenBaslik',
	'gidenNot',
	'izBaslik'
];

export function ilkIzDogrula(fd: FormData): Sonuc<IlkIzVerisi> {
	const d = degerleriAl(fd, SIHIRBAZ_ALANLARI);
	const hatalar: Hatalar = {};

	if (!eserTuruMu(d.eserTuru)) hatalar.eserTuru = 'Eserin türünü seç.';
	if (!d.eserBaslik) hatalar.eserBaslik = 'Hayatında iz bırakan bir eserin adını yaz.';
	else if (d.eserBaslik.length > 200) hatalar.eserBaslik = 'Ad en fazla 200 karakter olabilir.';
	if (d.eserAlt.length > 200) hatalar.eserAlt = 'En fazla 200 karakter olabilir.';

	function yanDugum(on: 'getiren' | 'giden'): SihirbazDugumu | null {
		const baslik = d[`${on}Baslik`];
		if (!baslik) return null;
		if (baslik.length > 200) {
			hatalar[`${on}Baslik`] = 'Ad en fazla 200 karakter olabilir.';
			return null;
		}
		const tur = dugumTuruMu(d[`${on}Tur`]) ? (d[`${on}Tur`] as DugumTuru) : 'kisi';
		const eserTuruHam = d[`${on}EserTuru`];
		const eserTuru = tur === 'eser' ? (eserTuruMu(eserTuruHam) ? eserTuruHam : 'kitap') : null;
		const not = d[`${on}Not`];
		if (not.length > 1000) hatalar[`${on}Not`] = 'Not en fazla 1000 karakter olabilir.';
		return { tur, eserTuru, baslik, not: not || null };
	}
	const getiren = yanDugum('getiren');
	const giden = yanDugum('giden');
	if (!getiren && !giden && !hatalar.getirenBaslik && !hatalar.gidenBaslik)
		hatalar.getirenBaslik =
			'Bir iz en az iki duraktan oluşur: seni bu esere neyin getirdiğini ya da onun seni nereye götürdüğünü yaz.';
	if (d.izBaslik.length > 120) hatalar.izBaslik = 'İzin adı en fazla 120 karakter olabilir.';

	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: d };
	return {
		tamam: true,
		veri: {
			eser: {
				eserTuru: d.eserTuru as EserTuru,
				baslik: d.eserBaslik,
				altBaslik: d.eserAlt || null
			},
			getiren,
			giden,
			izBaslik: d.izBaslik || 'İlk izim'
		}
	};
}

// ——— Ağ konumları (JSON) ———

export type Konum = { id: string; x: number; y: number };
export const EN_FAZLA_KONUM = 5000;

/** Ağ görünümünden gelen konum listesini doğrular; geçersizse null */
export function konumlarDogrula(govde: unknown): Konum[] | null {
	const liste = (govde as { konumlar?: unknown } | null)?.konumlar;
	if (!Array.isArray(liste) || liste.length > EN_FAZLA_KONUM) return null;
	const sonuc: Konum[] = [];
	for (const k of liste) {
		const { id, x, y } = (k ?? {}) as Record<string, unknown>;
		if (!uuidMu(id) || typeof x !== 'number' || typeof y !== 'number') return null;
		if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7)
			return null;
		sonuc.push({ id, x, y });
	}
	return sonuc;
}

// ——— Hızlı ekle onayı ———

export type HizliAna =
	| { kip: 'mevcut'; id: string }
	| { kip: 'dis'; kaynak: 'openlibrary' | 'tmdb'; disKimlik: string }
	| { kip: 'yeni'; tur: DugumTuru; eserTuru: EserTuru | null; baslik: string };

export type HizliSecim = {
	ana: HizliAna;
	getiren: GetirenGirdisi;
	not: string | null;
	durum: EserDurumu | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
};

/**
 * Hızlı ekle onay formunu okur. Seçimler "mevcut:<id>", "dis:<kaynak>:<kimlik>", "yeni" ve
 * "yok" biçimindedir. Dış eserin bilgileri burada değil, eylemde arama yeniden yapılarak alınır
 * (istemciden gelen başlık/görsel verisine güvenilmez).
 */
export function hizliSecimDogrula(fd: FormData): Sonuc<HizliSecim> {
	const d = degerleriAl(fd, [
		'ana',
		'tur',
		'eserTuru',
		'baslik',
		'getiren',
		'getirenTur',
		'getirenEserTuru',
		'getirenBaslik',
		'not',
		'durum',
		'tarih'
	]);
	const hatalar: Hatalar = {};

	let ana: HizliAna | null = null;
	if (d.ana.startsWith('mevcut:')) {
		const id = d.ana.slice(7);
		if (uuidMu(id)) ana = { kip: 'mevcut', id };
	} else if (d.ana.startsWith('dis:')) {
		const [, kaynak, ...kimlik] = d.ana.split(':');
		const disKimlik = kimlik.join(':');
		if ((kaynak === 'openlibrary' || kaynak === 'tmdb') && disKimlikGecerliMi(kaynak, disKimlik))
			ana = { kip: 'dis', kaynak, disKimlik };
	} else if (d.ana === 'yeni') {
		const tur = dugumTuruMu(d.tur) ? d.tur : null;
		if (!tur) hatalar.tur = 'Bir tür seç.';
		if (!d.baslik) hatalar.baslik = 'Eklenecek şeyin adını yaz.';
		else if (d.baslik.length > 200) hatalar.baslik = 'Ad en fazla 200 karakter olabilir.';
		if (tur && d.baslik && d.baslik.length <= 200) {
			const eserTuru = tur === 'eser' ? (eserTuruMu(d.eserTuru) ? d.eserTuru : 'kitap') : null;
			ana = { kip: 'yeni', tur, eserTuru, baslik: d.baslik };
		}
	}
	if (!ana && !hatalar.tur && !hatalar.baslik) hatalar.ana = 'Neyi eklemek istediğini seç.';

	let getiren: GetirenGirdisi = { kip: 'yok' };
	if (d.getiren.startsWith('mevcut:')) {
		const id = d.getiren.slice(7);
		if (uuidMu(id)) getiren = { kip: 'mevcut', id };
		else hatalar.getiren = 'Geçerli bir düğüm seç.';
	} else if (d.getiren === 'yeni') {
		const tur = dugumTuruMu(d.getirenTur) ? d.getirenTur : 'kisi';
		const eserTuru =
			tur === 'eser' ? (eserTuruMu(d.getirenEserTuru) ? d.getirenEserTuru : 'kitap') : null;
		if (!d.getirenBaslik) hatalar.getirenBaslik = 'Seni buraya getirenin adını yaz.';
		else if (d.getirenBaslik.length > 200)
			hatalar.getirenBaslik = 'Ad en fazla 200 karakter olabilir.';
		else getiren = { kip: 'yeni', tur, eserTuru, baslik: d.getirenBaslik };
	}

	if (d.not.length > 1000) hatalar.not = 'Not en fazla 1000 karakter olabilir.';
	const durum = eserDurumuMu(d.durum) ? d.durum : null;
	const tarih = tarihCoz(d.tarih);
	if (tarih === 'gecersiz') hatalar.tarih = TARIH_HATASI;

	if (Object.keys(hatalar).length || !ana) return { tamam: false, hatalar, degerler: d };
	return {
		tamam: true,
		veri: {
			ana,
			getiren,
			not: d.not || null,
			durum,
			tarih: tarih && tarih !== 'gecersiz' ? tarih.tarih : null,
			tarihHassasiyeti: tarih && tarih !== 'gecersiz' ? tarih.hassasiyet : null
		}
	};
}

// ——— Karar Defteri ———

export type KararDefteriVerisi = {
	gerekce: string | null;
	beklenti: string | null;
	guven: number | null;
	sorulacak: string | null;
};

export function kararDefteriDogrula(fd: FormData): Sonuc<KararDefteriVerisi> {
	const v = degerleriAl(fd, ['gerekce', 'beklenti', 'guven', 'sorulacak']);
	const hatalar: Hatalar = {};
	if (v.gerekce.length > 2000) hatalar.gerekce = 'Gerekçe en fazla 2000 karakter olabilir.';
	if (v.beklenti.length > 1000) hatalar.beklenti = 'Beklenti en fazla 1000 karakter olabilir.';
	let guven: number | null = null;
	if (v.guven) {
		const g = Number(v.guven);
		if (!Number.isInteger(g) || g < 0 || g > 100)
			hatalar.guven = 'Güven 0 ile 100 arasında olmalı.';
		else guven = g;
	}
	const sorulacak = tarihCoz(v.sorulacak);
	if (sorulacak === 'gecersiz') hatalar.sorulacak = TARIH_HATASI;
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: v };
	return {
		tamam: true,
		veri: {
			gerekce: v.gerekce || null,
			beklenti: v.beklenti || null,
			guven,
			sorulacak: sorulacak && sorulacak !== 'gecersiz' ? sorulacak.tarih : null
		}
	};
}

export function kararSonucuDogrula(
	fd: FormData
): Sonuc<{ sonuc: 'gerceklesti' | 'kismen' | 'gerceklesmedi'; not: string | null }> {
	const sonuc = alan(fd, 'sonuc');
	const not = alan(fd, 'sonucNotu');
	const hatalar: Hatalar = {};
	if (sonuc !== 'gerceklesti' && sonuc !== 'kismen' && sonuc !== 'gerceklesmedi')
		hatalar.sonuc = 'Nasıl sonuçlandığını seç.';
	if (not.length > 1000) hatalar.sonucNotu = 'Not en fazla 1000 karakter olabilir.';
	if (Object.keys(hatalar).length)
		return { tamam: false, hatalar, degerler: { sonuc, sonucNotu: not } };
	return {
		tamam: true,
		veri: { sonuc: sonuc as 'gerceklesti' | 'kismen' | 'gerceklesmedi', not: not || null }
	};
}

// ——— Fotoğraflar ———

export type FotoBilgisi = {
	donem: FotoDonemi;
	yil: number | null;
	aciklama: string | null;
	kaynak: string | null;
	hak: FotoHakki;
};

/** Dosyanın kendisi ayrıca (sunucuda, görsel kitaplığıyla) doğrulanır */
export function fotoBilgisiDogrula(fd: FormData): Sonuc<FotoBilgisi> {
	const v = degerleriAl(fd, ['donem', 'yil', 'aciklama', 'kaynak', 'hak']);
	const hatalar: Hatalar = {};
	if (!fotoDonemiMi(v.donem)) hatalar.donem = 'Eski mi, yeni mi?';
	let yil: number | null = null;
	if (v.yil) {
		const y = Number(v.yil);
		if (!Number.isInteger(y) || y < 1800 || y > 2200)
			hatalar.yil = 'Yıl 1800 ile 2200 arasında olmalı.';
		else yil = y;
	}
	if (v.aciklama.length > 300) hatalar.aciklama = 'Açıklama en fazla 300 karakter olabilir.';
	if (v.kaynak.length > 200) hatalar.kaynak = 'Kaynak en fazla 200 karakter olabilir.';
	if (!fotoHakkiMi(v.hak)) hatalar.hak = 'Bu fotoğrafı neye dayanarak paylaştığını seç.';
	else if (KAYNAK_GEREKEN_HAKLAR.includes(v.hak) && !v.kaynak)
		hatalar.kaynak = 'Kaynağı yaz: kimin izniyle, hangi lisansla ya da hangi arşivden.';
	if (alan(fd, 'onay') !== 'evet') hatalar.onay = 'Yüklemeden önce hak beyanını onaylamalısın.';
	if (Object.keys(hatalar).length) return { tamam: false, hatalar, degerler: v };
	return {
		tamam: true,
		veri: {
			donem: v.donem as FotoDonemi,
			yil,
			aciklama: v.aciklama || null,
			kaynak: v.kaynak || null,
			hak: v.hak as FotoHakki
		}
	};
}
