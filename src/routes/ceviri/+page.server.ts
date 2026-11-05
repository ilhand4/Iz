import { fail, redirect } from '@sveltejs/kit';
import { eserSecenekleri, masaOlustur, masalarim } from '#lib/server/ceviriMasasi.ts';
import { masaDogrula } from '#lib/server/dogrulama.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [masalar, eserler] = await Promise.all([
		masalarim(kullanici.id),
		eserSecenekleri(kullanici.id)
	]);
	return { masalar, eserler, eser: url.searchParams.get('eser') };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = masaDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		const id = await masaOlustur(kullanici.id, sonuc.veri);
		redirect(303, `/ceviri/${id}`);
	}
};
