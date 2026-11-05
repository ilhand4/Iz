// Arayüz dili: Türkçe (asıl) ve İngilizce. Seçim çerezde (`dil`), yoksa tarayıcının diline göre.
// Kapsam (kullanıcı kararı, Kasım 2026): altyapı + kamuya açık sayfalar (tanıtım, giriş/kayıt,
// menüler, alt bilgi, hata sayfası, profil, paylaşılan iz ve gömme, gizlilik/çerez). Uygulama içi
// sayfalar şimdilik Türkçe; aynı sözlükle adım adım çevrilir. Birim testleri: dil.test.ts
import type { DugumTuru } from './sabitler';
import { EN } from './sozluk/en';
import { TR, type Anahtar } from './sozluk/tr';

export const DILLER = ['tr', 'en'] as const;
export type Dil = (typeof DILLER)[number];
export const DIL_ADI: Record<Dil, string> = { tr: 'Türkçe', en: 'English' };

export function dilMi(x: unknown): x is Dil {
	return x === 'tr' || x === 'en';
}

/** Çerez varsa o; yoksa Accept-Language'de Türkçe İngilizceden önce gelmiyorsa ve İngilizce varsa en */
export function dilSec(cerez: string | undefined, kabul: string | null): Dil {
	if (dilMi(cerez)) return cerez;
	if (!kabul) return 'tr';
	const diller = kabul
		.split(',')
		.map((p) => {
			const [ad, ...ek] = p.trim().split(';');
			const q = ek.find((e) => e.trim().startsWith('q='));
			return { ad: ad.toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) : 1 };
		})
		.filter((d) => d.ad && !Number.isNaN(d.q))
		.sort((a, b) => b.q - a.q);
	for (const d of diller) {
		if (d.ad === 'tr') return 'tr';
		if (d.ad === 'en') return 'en';
	}
	return 'tr';
}

const SOZLUKLER: Record<Dil, Record<Anahtar, string>> = { tr: TR, en: EN };

/** `t('anahtar', { ad: 'Deniz' })`: {ad} yer tutucuları doldurulur; çevirisi yoksa Türkçesi */
export function cevirmen(dil: Dil) {
	const s = SOZLUKLER[dil] ?? TR;
	return (anahtar: Anahtar, degiskenler?: Record<string, string | number>) => {
		let metin = s[anahtar] ?? TR[anahtar] ?? anahtar;
		if (degiskenler)
			for (const [k, v] of Object.entries(degiskenler))
				metin = metin.replaceAll(`{${k}}`, String(v));
		return metin;
	};
}

export type Cevirmen = ReturnType<typeof cevirmen>;

export const TUR_ETIKETI: Record<Dil, Record<DugumTuru, string>> = {
	tr: { eser: 'Eser', kisi: 'Kişi', yer: 'Yer', karar: 'Karar', ani: 'Anı' },
	en: { eser: 'Work', kisi: 'Person', yer: 'Place', karar: 'Decision', ani: 'Memory' }
};

/** Tarih (gün/ay/yıl hassasiyetli) seçilen dilde; Türkçede tarih.ts → tarihYaz ile aynı biçim */
export function tarihDilde(
	tarih: string | null,
	hassasiyet: 'gun' | 'ay' | 'yil' | null,
	dil: Dil
): string {
	if (!tarih || !hassasiyet) return '';
	const [y, a, g] = tarih.split('-').map(Number);
	if (hassasiyet === 'yil') return String(y);
	const yerel = dil === 'en' ? 'en-GB' : 'tr-TR';
	const t = new Date(Date.UTC(y, a - 1, g));
	return new Intl.DateTimeFormat(
		yerel,
		hassasiyet === 'ay'
			? { month: 'long', year: 'numeric', timeZone: 'UTC' }
			: { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
	).format(t);
}

/** Sunucunun Türkçe doğrulama iletilerinin İngilizceleri (giriş, kayıt, şifre sayfaları) */
const HATA_EN: Record<string, string> = {
	'E-posta adresi gerekli.': 'Email address is required.',
	'Geçerli bir e-posta adresi girin.': 'Enter a valid email address.',
	'E-posta adresinizi yazın.': 'Enter your email address.',
	'E-posta ya da şifre hatalı.': 'Incorrect email or password.',
	'Şifrenizi yazın.': 'Enter your password.',
	'Şifre gerekli.': 'Password is required.',
	'Şifre en az 10 karakter olmalı.': 'Password must be at least 10 characters.',
	'Şifre en fazla 200 karakter olabilir.': 'Password can be at most 200 characters.',
	'Şifreler birbirini tutmuyor.': 'Passwords do not match.',
	'Şifre kullanıcı adınız ya da e-postanızla aynı olamaz.':
		'Password cannot be the same as your username or email.',
	'Adınızı yazın.': 'Enter your name.',
	'Ad en fazla 80 karakter olabilir.': 'Name can be at most 80 characters.',
	'Kullanıcı adı gerekli.': 'Username is required.',
	'Kullanıcı adı en az 3 karakter olmalı.': 'Username must be at least 3 characters.',
	'Kullanıcı adı en fazla 30 karakter olabilir.': 'Username can be at most 30 characters.',
	'Kullanıcı adında yalnızca küçük harf (a-z, Türkçe karakter olmadan), rakam, nokta ve alt çizgi kullanılabilir.':
		'Usernames may only contain lowercase letters (a–z), digits, dots and underscores.',
	'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.':
		'An account with this email already exists. Try signing in.',
	'Bu kullanıcı adı ya da e-posta az önce alındı.': 'This username or email was just taken.'
};

/** Hata iletisini seçilen dile çevirir; bilinmeyen ileti olduğu gibi döner */
export function hataDilde(mesaj: string | null | undefined, dil: Dil): string | undefined {
	if (!mesaj) return undefined;
	if (dil === 'tr') return mesaj;
	if (HATA_EN[mesaj]) return HATA_EN[mesaj];
	const bekle =
		/^Çok fazla deneme yapıldı\. Lütfen (\d+) (dakika|saniye) sonra tekrar deneyin\.$/.exec(mesaj);
	if (bekle)
		return `Too many attempts. Please try again in ${bekle[1]} ${bekle[2] === 'dakika' ? 'minutes' : 'seconds'}.`;
	return mesaj;
}
