import { fail, redirect } from '@sveltejs/kit';
import { sifreHatasi } from '#lib/server/dogrulama.ts';
import { jetonCoz, sifreyiSifirla } from '#lib/server/epostaJetonu.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const jeton = url.searchParams.get('jeton') ?? '';
	const kayit = await jetonCoz(jeton, 'sifre_sifirlama');
	return { jeton: kayit ? jeton : null, eposta: kayit?.eposta ?? null };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		const jeton = String(fd.get('jeton') ?? '');
		const sifre = String(fd.get('sifre') ?? '');
		const tekrar = String(fd.get('sifreTekrar') ?? '');
		const hata = sifreHatasi(sifre);
		if (hata) return fail(400, { hatalar: { sifre: hata } });
		if (sifre !== tekrar)
			return fail(400, { hatalar: { sifreTekrar: 'Şifreler birbirini tutmuyor.' } });
		if (!(await sifreyiSifirla(jeton, sifre))) {
			return fail(400, {
				hatalar: {
					genel: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı iste.'
				}
			});
		}
		redirect(303, '/giris?sifirlandi=1');
	}
};
