import { copOgesi } from '#lib/server/copKutusu.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { izleriListele } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const silindiId = url.searchParams.get('silindi') ?? '';
	const [izler, silinen] = await Promise.all([
		izleriListele(kullanici.id),
		uuidMu(silindiId) ? copOgesi(kullanici.id, 'iz', silindiId) : Promise.resolve(null)
	]);
	return { izler, silinen };
};
