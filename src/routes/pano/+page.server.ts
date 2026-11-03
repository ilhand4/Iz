import { panoVerisi } from '#lib/server/dugumler.ts';
import { izleriListele, izSayisi } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [pano, izler, toplamIz] = await Promise.all([
		panoVerisi(kullanici.id),
		izleriListele(kullanici.id, 3),
		izSayisi(kullanici.id)
	]);
	return { pano, izler, toplamIz, hosgeldin: url.searchParams.has('hosgeldin') };
};
