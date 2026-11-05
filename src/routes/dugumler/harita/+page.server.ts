import { uuidMu } from '#lib/server/dogrulama.ts';
import { haritaKonumlari } from '#lib/server/konumlar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const odak = url.searchParams.get('odak');
	return {
		...(await haritaKonumlari(kullanici.id)),
		odakId: uuidMu(odak) ? odak : null
	};
};
