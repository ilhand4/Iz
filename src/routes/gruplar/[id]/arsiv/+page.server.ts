import { error } from '@sveltejs/kit';
import { grupArsivi } from '#lib/server/arsiv.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { grupGetir } from '#lib/server/gruplar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

const BULUNAMADI = 'Bu grup bulunamadı ya da üyesi değilsin.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const grup = await grupGetir(params.id, kullanici.id);
	if (!grup) error(404, BULUNAMADI);
	const yilGirdi = Number(url.searchParams.get('yil'));
	const yil = Number.isInteger(yilGirdi) && yilGirdi > 1800 && yilGirdi < 2200 ? yilGirdi : null;
	const [ogeler, tumu] = await Promise.all([
		grupArsivi(params.id, kullanici.id, yil),
		yil ? grupArsivi(params.id, kullanici.id) : Promise.resolve(null)
	]);
	const yillar = [
		...new Set(
			(tumu ?? ogeler ?? []).filter((o) => o.tarih).map((o) => Number(o.tarih!.slice(0, 4)))
		)
	].sort((a, b) => b - a);
	return { grup: grup.grup, uyeSayisi: grup.uyeler.length, ogeler: ogeler ?? [], yillar, yil };
};
