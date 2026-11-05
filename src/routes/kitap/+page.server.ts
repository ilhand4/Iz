import { kisiselArsiv } from '#lib/server/arsiv.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const yilGirdi = Number(url.searchParams.get('yil'));
	const yil = Number.isInteger(yilGirdi) && yilGirdi > 1800 && yilGirdi < 2200 ? yilGirdi : null;
	const [ogeler, tumu] = await Promise.all([
		kisiselArsiv(kullanici.id, yil),
		yil ? kisiselArsiv(kullanici.id) : Promise.resolve(null)
	]);
	const yillar = [
		...new Set((tumu ?? ogeler).filter((o) => o.tarih).map((o) => Number(o.tarih!.slice(0, 4))))
	].sort((a, b) => b - a);
	return { ogeler, yillar, yil, ad: kullanici.ad };
};
