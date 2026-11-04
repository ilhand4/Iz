import { haritaVerisi } from '#lib/server/dugumler.ts';
import { donemleriListele } from '#lib/server/dusunce.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { zamanCizgisiKur } from '#lib/zaman.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const sira = url.searchParams.get('sira') === 'yeni' ? 'yeni' : 'eski';
	const [{ dugumler, baglar }, donemler] = await Promise.all([
		haritaVerisi(kullanici.id),
		donemleriListele(kullanici.id)
	]);
	return {
		sira,
		donemler,
		toplam: dugumler.length,
		cizgi: zamanCizgisiKur(dugumler, baglar, sira)
	} as const;
};
