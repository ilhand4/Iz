import { fail, redirect } from '@sveltejs/kit';
import { grupDogrula } from '#lib/server/dogrulama.ts';
import { grupOlustur, gruplarim } from '#lib/server/gruplar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return { gruplar: await gruplarim(kullanici.id) };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = grupDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		const id = await grupOlustur(kullanici.id, sonuc.veri);
		redirect(303, `/gruplar/${id}?yeni=1`);
	}
};
