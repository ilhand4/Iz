import { okunmamisSayisi } from '#lib/server/disBaglar.ts';
import { zamaniGelenSayisi } from '#lib/server/kararDefteriDb.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const cerez = cookies.get('tema');
	const tema: 'sistem' | 'acik' | 'koyu' = cerez === 'acik' || cerez === 'koyu' ? cerez : 'sistem';
	// Zildeki sayı: okunmamış bildirimler + sonucunu sorma zamanı gelen kararlar
	const okunmamis = locals.kullanici
		? (
				await Promise.all([
					okunmamisSayisi(locals.kullanici.id),
					zamaniGelenSayisi(locals.kullanici.id)
				])
			).reduce((a, b) => a + b, 0)
		: 0;
	return { kullanici: locals.kullanici, tema, okunmamis };
};
