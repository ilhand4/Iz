import { okunmamisSayisi } from '#lib/server/disBaglar.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const cerez = cookies.get('tema');
	const tema: 'sistem' | 'acik' | 'koyu' = cerez === 'acik' || cerez === 'koyu' ? cerez : 'sistem';
	const okunmamis = locals.kullanici ? await okunmamisSayisi(locals.kullanici.id) : 0;
	return { kullanici: locals.kullanici, tema, okunmamis };
};
