import { hatVerisi } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { hatHaritasiKur } from '#lib/hatHaritasi.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const hatlar = await hatVerisi(kullanici.id);
	return { cizim: hatHaritasiKur(hatlar) };
};
