import { copOgesi } from '#lib/server/copKutusu.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { imlecOku } from '#lib/server/imlec.ts';
import { gruplarimdakiOrtakIzler } from '#lib/server/gruplar.ts';
import { izSayfasi } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const imlec = imlecOku(url.searchParams.get('sonra'));
	const silindiId = url.searchParams.get('silindi') ?? '';
	const [sayfa, silinen, ortak] = await Promise.all([
		izSayfasi(kullanici.id, q, imlec),
		uuidMu(silindiId) ? copOgesi(kullanici.id, 'iz', silindiId) : Promise.resolve(null),
		q || imlec ? Promise.resolve([]) : gruplarimdakiOrtakIzler(kullanici.id)
	]);
	return { izler: sayfa.liste, sonraki: sayfa.sonraki, devam: !!imlec && !q, q, silinen, ortak };
};
