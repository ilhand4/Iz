import { error, redirect } from '@sveltejs/kit';
import { davetCoz, davetleKatil } from '#lib/server/gruplar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const grup = await davetCoz(params.jeton);
	return { grup, girisli: !!locals.kullanici };
};

export const actions: Actions = {
	default: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const grupId = await davetleKatil(params.jeton, kullanici.id);
		if (!grupId) error(404, 'Bu davet bağlantısının süresi dolmuş ya da kapatılmış.');
		redirect(303, `/gruplar/${grupId}`);
	}
};
