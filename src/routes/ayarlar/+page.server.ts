import { error, fail, redirect } from '@sveltejs/kit';
import {
	alan,
	epostaDegistirDogrula,
	hesapSilDogrula,
	profilDogrula,
	sifreDegistirDogrula
} from '#lib/server/dogrulama.ts';
import {
	digerOturumlariKapat,
	epostaDegistir,
	hesabiSil,
	hesapGetir,
	oturumlariListele,
	oturumuKapat,
	profilGuncelle,
	sifreDegistir
} from '#lib/server/hesap.ts';
import { iceAktar } from '#lib/server/disaIceAktar.ts';
import { anahtarlariListele, anahtarSil } from '#lib/server/gecisAnahtari.ts';
import { dogrulamaGonder, epostaDegistiBildir } from '#lib/server/epostaJetonu.ts';
import {
	beklemeMesaji,
	dogrulamaSiniri,
	hesapSiniri,
	iceAktarmaSiniri
} from '#lib/server/hizSiniri.ts';
import { oturumCereziSil } from '#lib/server/oturum.ts';
import { iceAktarmaDogrula } from '#lib/server/veriTasima.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [hesap, oturumlar, anahtarlar] = await Promise.all([
		hesapGetir(kullanici.id),
		oturumlariListele(kullanici.id, locals.oturumId),
		anahtarlariListele(kullanici.id)
	]);
	if (!hesap) error(404, 'Hesap bulunamadı.');
	return { hesap, oturumlar, anahtarlar };
};

const EN_BUYUK_DOSYA = 5 * 1024 * 1024;

/** Şifre soran işlemlerde kullanıcı başına deneme sınırı */
function sinirAsildi(kullaniciId: string) {
	const sinir = hesapSiniri.dene(kullaniciId);
	return sinir.izin ? null : beklemeMesaji(sinir.beklemeSaniye);
}

export const actions: Actions = {
	profil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = profilDogrula(await request.formData());
		if (!sonuc.tamam) {
			return fail(400, { profil: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		await profilGuncelle(kullanici.id, sonuc.veri);
		return { bildirim: { mesaj: 'Profilin kaydedildi.' } };
	},

	eposta: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = epostaDegistirDogrula(await request.formData());
		if (!sonuc.tamam) {
			return fail(400, { eposta: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		const bekle = sinirAsildi(kullanici.id);
		if (bekle) return fail(429, { eposta: { hatalar: { sifre: bekle }, degerler: {} } });
		const eski = (await hesapGetir(kullanici.id))?.eposta;
		const durum = await epostaDegistir(kullanici.id, sonuc.veri.sifre, sonuc.veri.eposta);
		const degerler = { yeniEposta: sonuc.veri.eposta };
		if (durum === 'yanlis') {
			return fail(400, { eposta: { hatalar: { sifre: 'Şifre hatalı.' }, degerler } });
		}
		if (durum === 'kullaniliyor') {
			return fail(400, {
				eposta: { hatalar: { yeniEposta: 'Bu e-posta başka bir hesapta kayıtlı.' }, degerler }
			});
		}
		await Promise.allSettled([
			dogrulamaGonder(kullanici.id, url.origin),
			eski && eski !== sonuc.veri.eposta ? epostaDegistiBildir(eski, sonuc.veri.eposta) : null
		]);
		return {
			bildirim: {
				mesaj: 'E-posta adresin değiştirildi. Yeni adrese doğrulama bağlantısı gönderdik.'
			}
		};
	},

	dogrulamaGonder: async ({ locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sinir = dogrulamaSiniri.dene(kullanici.id);
		if (!sinir.izin) {
			return fail(429, {
				bildirim: { mesaj: beklemeMesaji(sinir.beklemeSaniye), tur: 'hata' as const }
			});
		}
		await dogrulamaGonder(kullanici.id, url.origin);
		return { bildirim: { mesaj: 'Doğrulama bağlantısı gönderildi.' } };
	},

	sifre: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = sifreDegistirDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { sifre: { hatalar: sonuc.hatalar } });
		const bekle = sinirAsildi(kullanici.id);
		if (bekle) return fail(429, { sifre: { hatalar: { mevcutSifre: bekle } } });
		const durum = await sifreDegistir(
			kullanici.id,
			sonuc.veri.mevcutSifre,
			sonuc.veri.yeniSifre,
			locals.oturumId
		);
		if (durum === 'yanlis') {
			return fail(400, { sifre: { hatalar: { mevcutSifre: 'Mevcut şifre hatalı.' } } });
		}
		return {
			bildirim: { mesaj: 'Şifren değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.' }
		};
	},

	gecisSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'id');
		if (!id || !(await anahtarSil(kullanici.id, id))) error(404, 'Geçiş anahtarı bulunamadı.');
		return { bildirim: { mesaj: 'Geçiş anahtarı kaldırıldı.' } };
	},

	oturumKapat: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'oturum');
		if (!(await oturumuKapat(kullanici.id, id))) error(404, 'Oturum bulunamadı.');
		return { bildirim: { mesaj: 'Oturum kapatıldı.' } };
	},

	digerleriniKapat: async ({ locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!locals.oturumId) error(400, 'Oturum bulunamadı.');
		const sayi = await digerOturumlariKapat(kullanici.id, locals.oturumId);
		return {
			bildirim: {
				mesaj: sayi ? `${sayi} oturum kapatıldı.` : 'Kapatılacak başka oturum yoktu.'
			}
		};
	},

	iceAktar: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const hata = (mesaj: string, durum = 400) =>
			fail(durum, { ice: { hatalar: { dosya: mesaj } } });
		const sinir = iceAktarmaSiniri.dene(kullanici.id);
		if (!sinir.izin) return hata(beklemeMesaji(sinir.beklemeSaniye), 429);

		const dosya = (await request.formData()).get('dosya');
		if (!(dosya instanceof File) || dosya.size === 0) return hata('Bir JSON dosyası seç.');
		if (dosya.size > EN_BUYUK_DOSYA) return hata('Dosya 5 MB’tan büyük olamaz.', 413);
		let ham: unknown;
		try {
			ham = JSON.parse(await dosya.text());
		} catch {
			return hata('Dosya okunamadı: geçerli bir JSON değil.');
		}
		const sonuc = iceAktarmaDogrula(ham);
		if (!sonuc.tamam) return hata(sonuc.hata);
		const rapor = await iceAktar(kullanici.id, sonuc);
		const parcalar = [
			`${rapor.dugum} düğüm`,
			`${rapor.bag} bağ`,
			`${rapor.iz} iz eklendi`,
			rapor.birlesen ? `${rapor.birlesen} eser haritandakiyle birleşti` : null,
			rapor.atlanan ? `${rapor.atlanan} bozuk kayıt atlandı` : null
		].filter(Boolean);
		return {
			bildirim: {
				mesaj: `İçe aktarıldı: ${parcalar.join(', ')}.`,
				baglanti: { href: '/dugumler', metin: 'Düğümler' }
			}
		};
	},

	hesabiSil: async ({ request, locals, url, cookies }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = hesapSilDogrula(await request.formData(), kullanici.kullaniciAdi);
		if (!sonuc.tamam) {
			return fail(400, { sil: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		const bekle = sinirAsildi(kullanici.id);
		if (bekle) return fail(429, { sil: { hatalar: { sifre: bekle }, degerler: {} } });
		if ((await hesabiSil(kullanici.id, sonuc.veri.sifre)) === 'yanlis') {
			return fail(400, { sil: { hatalar: { sifre: 'Şifre hatalı.' }, degerler: {} } });
		}
		oturumCereziSil(cookies);
		redirect(303, '/?hesapSilindi=1');
	}
};
