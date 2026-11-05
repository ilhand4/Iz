import { error } from '@sveltejs/kit';
import { yillikVerisi } from '#lib/server/geriGetirenlerDb.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const yil = Number(params.yil);
	if (!Number.isInteger(yil) || yil < 1 || yil > 2999) error(404, 'Böyle bir yıl yok.');
	return await yillikVerisi(kullanici.id, yil);
};
