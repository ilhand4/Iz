import { error, redirect } from '@sveltejs/kit';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { anlatiOnerileri, onerileriUygula } from '#lib/server/oneriler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu düğüm bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const oneriler = await anlatiOnerileri(kullanici.id, params.id);
	if (!oneriler) error(404, BULUNAMADI);
	return { id: params.id, ...oneriler };
};

export const actions: Actions = {
	default: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const fd = await request.formData();
		const baglanacak = fd.getAll('bagla').map(String).filter(uuidMu).slice(0, 200);
		const yeniler: { ad: string; tur: 'kisi' | 'yer' }[] = [];
		for (const sira of fd.getAll('yeni').map(String).slice(0, 100)) {
			const ad = String(fd.get(`ad-${sira}`) ?? '')
				.trim()
				.slice(0, 200);
			const tur = fd.get(`tur-${sira}`) === 'yer' ? 'yer' : 'kisi';
			if (ad) yeniler.push({ ad, tur });
		}
		const yilGirdi = Number(fd.get('yil'));
		const yil =
			Number.isInteger(yilGirdi) && yilGirdi >= 1800 && yilGirdi <= 2200 ? yilGirdi : null;
		const sonuc = await onerileriUygula(kullanici.id, params.id, { baglanacak, yeniler, yil });
		if (!sonuc) error(404, BULUNAMADI);
		redirect(303, `/dugumler/${params.id}?oneriler=${sonuc.yeni}-${sonuc.bag}`);
	}
};
