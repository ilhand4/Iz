import { panoVerisi } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return {
		pano: await panoVerisi(kullanici.id),
		hosgeldin: url.searchParams.has('hosgeldin')
	};
};
