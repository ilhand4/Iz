import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => {
	const cerez = cookies.get('tema');
	const tema: 'sistem' | 'acik' | 'koyu' = cerez === 'acik' || cerez === 'koyu' ? cerez : 'sistem';
	return { kullanici: locals.kullanici, tema };
};
