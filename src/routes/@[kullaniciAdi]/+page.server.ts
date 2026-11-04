import { error } from '@sveltejs/kit';
import { KULLANICI_ADI_DESENI } from '#lib/server/dogrulama.ts';
import { profilGetir, profilVerisi } from '#lib/server/profil.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const ad = params.kullaniciAdi.toLowerCase();
	if (!KULLANICI_ADI_DESENI.test(ad)) error(404, 'Böyle bir kullanıcı yok.');
	const profil = await profilGetir(ad);
	if (!profil) error(404, 'Böyle bir kullanıcı yok.');
	const veri = await profilVerisi(profil.id);
	const { id, aramaMotorlari, ...gorunen } = profil;
	return {
		profil: gorunen,
		...veri,
		kendisi: locals.kullanici?.id === id,
		indekslenebilir: aramaMotorlari
	};
};
