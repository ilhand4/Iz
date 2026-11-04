import { copOgesi, copSayisi } from '#lib/server/copKutusu.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { dugumSayfasi } from '#lib/server/dugumler.ts';
import { imlecOku } from '#lib/server/imlec.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { dugumTuruMu } from '#lib/sabitler.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const turParam = url.searchParams.get('tur');
	// "Merak listesi" süzgeci: merak edilen ve sürmekte olan eserler
	const merak = url.searchParams.get('durum') === 'merak';
	const tur = merak ? 'eser' : dugumTuruMu(turParam) ? turParam : null;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const silindiId = url.searchParams.get('silindi') ?? '';
	const imlec = imlecOku(url.searchParams.get('sonra'));
	const [sayfa, copta, silinen] = await Promise.all([
		dugumSayfasi(
			kullanici.id,
			{ tur, q, durumlar: merak ? ['suruyor', 'merak'] : undefined },
			imlec
		),
		copSayisi(kullanici.id),
		uuidMu(silindiId) ? copOgesi(kullanici.id, 'dugum', silindiId) : Promise.resolve(null)
	]);
	return {
		dugumler: sayfa.liste,
		sonraki: sayfa.sonraki,
		devam: !!imlec && !q,
		tur: merak ? null : tur,
		q,
		merak,
		copta,
		silinen
	};
};
