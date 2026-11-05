import { bildirimleriGetir, hepsiniOku } from '#lib/server/disBaglar.ts';
import { zamaniGelenKararlar } from '#lib/server/kararDefteriDb.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [liste, kararlar] = await Promise.all([
		bildirimleriGetir(kullanici.id),
		zamaniGelenKararlar(kullanici.id)
	]);
	// Sayfa açılınca hepsi okunmuş sayılır (liste, okunmamışları vurgulamak için önce alındı)
	await hepsiniOku(kullanici.id);
	return { liste, kararlar };
};
