import { fail, redirect } from '@sveltejs/kit';
import { ilkIzDogrula } from '#lib/server/dogrulama.ts';
import { ilkIzOlustur } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	girisGerekli(locals, url);
	return { hosgeldin: url.searchParams.has('hosgeldin') };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = ilkIzDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		const { izId } = await ilkIzOlustur(kullanici.id, sonuc.veri);
		redirect(303, `/izler/${izId}?ilk=1`);
	}
};
