import { error } from '@sveltejs/kit';
import { kisiselArsiv } from '#lib/server/arsiv.ts';
import { acikEmanet } from '#lib/server/vasiyet.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const e = await acikEmanet(kullanici.id, params.kullaniciAdi);
	// Süresi dolmamış ya da hiç olmayan emanet aynı 404'ü alır
	if (!e) error(404, 'Bu arşiv sana açık değil.');
	const yilGirdi = Number(url.searchParams.get('yil'));
	const yil = Number.isInteger(yilGirdi) && yilGirdi > 1800 && yilGirdi < 2200 ? yilGirdi : null;
	const [ogeler, tumu] = await Promise.all([
		kisiselArsiv(e.sahipId, yil),
		yil ? kisiselArsiv(e.sahipId) : Promise.resolve(null)
	]);
	const yillar = [
		...new Set((tumu ?? ogeler).filter((o) => o.tarih).map((o) => Number(o.tarih!.slice(0, 4))))
	].sort((a, b) => b - a);
	return { sahip: { ad: e.ad, kullaniciAdi: e.kullaniciAdi }, ogeler, yillar, yil };
};
