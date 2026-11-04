import { fail, redirect } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { kullanicilar } from '#lib/server/db/schema.ts';
import { kayitDogrula } from '#lib/server/dogrulama.ts';
import { beklemeMesaji } from '#lib/server/hizSiniri.ts';
import { kayitSiniri } from '#lib/server/sinirlar.ts';
import { cihazAdi } from '#lib/server/cihaz.ts';
import { dogrulamaGonder } from '#lib/server/epostaJetonu.ts';
import { jetonUret, oturumAc, oturumCereziYaz } from '#lib/server/oturum.ts';
import { sifreOzetle } from '#lib/server/sifre.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.kullanici) redirect(303, '/pano');
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const fd = await request.formData();
		const sonuc = kayitDogrula(fd);
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });

		const { ad, kullaniciAdi, eposta, sifre } = sonuc.veri;
		const degerler = { ad, kullaniciAdi, eposta };

		const sinir = await kayitSiniri.dene(getClientAddress());
		if (!sinir.izin) {
			return fail(429, { hatalar: { genel: beklemeMesaji(sinir.beklemeSaniye) }, degerler });
		}

		const [mevcut] = await db
			.select({ kullaniciAdi: kullanicilar.kullaniciAdi, eposta: kullanicilar.eposta })
			.from(kullanicilar)
			.where(or(eq(kullanicilar.kullaniciAdi, kullaniciAdi), eq(kullanicilar.eposta, eposta)));
		if (mevcut) {
			const hatalar =
				mevcut.eposta === eposta
					? { eposta: 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.' }
					: { kullaniciAdi: 'Bu kullanıcı adı alınmış. Başka bir tane deneyin.' };
			return fail(400, { hatalar, degerler });
		}

		let kullaniciId: string;
		try {
			const [yeni] = await db
				.insert(kullanicilar)
				.values({ ad, kullaniciAdi, eposta, sifreOzeti: await sifreOzetle(sifre) })
				.returning({ id: kullanicilar.id });
			kullaniciId = yeni.id;
		} catch (hata) {
			// Aynı anda iki kayıt: tekil dizin ihlali
			if (
				(hata as { code?: string }).code === '23505' ||
				(hata as { cause?: { code?: string } }).cause?.code === '23505'
			) {
				return fail(400, {
					hatalar: { genel: 'Bu kullanıcı adı ya da e-posta az önce alındı.' },
					degerler
				});
			}
			throw hata;
		}

		// Doğrulama iletisi gönderilemese de kayıt tamamlanır (ayarlardan yeniden istenebilir)
		await dogrulamaGonder(kullaniciId, url.origin).catch((e) =>
			console.error('Doğrulama iletisi gönderilemedi', e)
		);

		const jeton = jetonUret();
		const oturum = await oturumAc(jeton, kullaniciId, cihazAdi(request.headers.get('user-agent')));
		oturumCereziYaz(cookies, jeton, oturum.bitis);
		// Yeni kullanıcı ilk izini üç soruda oluştursun
		redirect(303, '/basla?hosgeldin=1');
	}
};
