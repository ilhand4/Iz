import { error } from '@sveltejs/kit';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { izGetir } from '#lib/server/izler.ts';
import type { PageServerLoad } from './$types';

// Gömülen iz her zaman anonim ziyaretçinin gördüğü hâliyle gösterilir (sahibi baksa bile)
export const load: PageServerLoad = async ({ params }) => {
	const iz = uuidMu(params.id) ? await izGetir(params.id, null) : null;
	if (!iz) error(404, 'Bu iz paylaşıma açık değil.');
	return {
		iz: iz.iz,
		sahip: { ad: iz.sahip.ad, kullaniciAdi: iz.sahip.kullaniciAdi },
		duraklar: iz.duraklar
	};
};
