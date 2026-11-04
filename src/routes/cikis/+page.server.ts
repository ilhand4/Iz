import { redirect } from '@sveltejs/kit';
import { oturumCereziSil, oturumKapat } from '#lib/server/oturum.ts';
import type { Actions, PageServerLoad } from './$types';

// Çıkış yalnızca POST ile yapılır (bir bağlantı ya da görselle kullanıcı dışarı atılamasın)
export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.oturumId) await oturumKapat(locals.oturumId);
		oturumCereziSil(cookies);
		redirect(303, '/');
	}
};
