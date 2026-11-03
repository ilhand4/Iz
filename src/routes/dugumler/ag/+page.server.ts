import { uuidMu } from '#lib/server/dogrulama.ts';
import { haritaVerisi } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const odak = url.searchParams.get('odak');
	return {
		...(await haritaVerisi(kullanici.id)),
		odakId: uuidMu(odak) ? odak : null
	};
};
