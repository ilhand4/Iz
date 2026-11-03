import { izleriListele } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return {
		izler: await izleriListele(kullanici.id),
		silindi: url.searchParams.has('silindi')
	};
};
