import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { kullanicilar } from '#lib/server/db/schema.ts';
import { girisDogrula } from '#lib/server/dogrulama.ts';
import { beklemeMesaji, girisSiniri, ipGirisSiniri } from '#lib/server/hizSiniri.ts';
import { jetonUret, oturumAc, oturumCereziYaz } from '#lib/server/oturum.ts';
import { sahteDogrulama, sifreDogrula } from '#lib/server/sifre.ts';
import { guvenliDonus } from '#lib/server/yetki.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.kullanici) redirect(303, guvenliDonus(url.searchParams.get('donus')));
};

const HATALI = 'E-posta ya da şifre hatalı.';

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const fd = await request.formData();
		const sonuc = girisDogrula(fd);
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });

		const { eposta, sifre } = sonuc.veri;
		const ip = getClientAddress();
		const anahtar = `${ip}|${eposta}`;

		// Önce IP, sonra IP + e-posta sınırı
		for (const sinir of [ipGirisSiniri.dene(ip), girisSiniri.dene(anahtar)]) {
			if (!sinir.izin) {
				return fail(429, {
					hatalar: { genel: beklemeMesaji(sinir.beklemeSaniye) },
					degerler: { eposta }
				});
			}
		}

		const [kullanici] = await db
			.select({ id: kullanicilar.id, sifreOzeti: kullanicilar.sifreOzeti })
			.from(kullanicilar)
			.where(eq(kullanicilar.eposta, eposta));

		// Kullanıcı yoksa da şifre doğrulaması kadar zaman harca: hesap varlığı süreden anlaşılmasın
		const dogru = kullanici
			? await sifreDogrula(kullanici.sifreOzeti, sifre)
			: await sahteDogrulama(sifre);
		if (!kullanici || !dogru) {
			return fail(400, { hatalar: { genel: HATALI }, degerler: { eposta } });
		}

		girisSiniri.sifirla(anahtar);
		const jeton = jetonUret();
		const oturum = await oturumAc(jeton, kullanici.id);
		oturumCereziYaz(cookies, jeton, oturum.bitis);
		redirect(303, guvenliDonus(url.searchParams.get('donus')));
	}
};
