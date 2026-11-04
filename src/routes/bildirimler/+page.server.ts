import { bildirimleriGetir, hepsiniOku } from '#lib/server/disBaglar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const liste = await bildirimleriGetir(kullanici.id);
	// Sayfa açılınca hepsi okunmuş sayılır (liste, okunmamışları vurgulamak için önce alındı)
	await hepsiniOku(kullanici.id);
	return { liste };
};
