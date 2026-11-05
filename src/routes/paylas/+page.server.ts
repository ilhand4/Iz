// Telefonun paylaş menüsünden gelen metin (PWA share_target): hızlı ekleye yönlendirir.
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const parcalar = ['baslik', 'metin', 'adres']
		.map((k) => url.searchParams.get(k)?.trim())
		.filter((x): x is string => !!x);
	// Paylaşılan bağlantı çoğunlukla metnin içinde de geçer: yinelenmesin
	const tekil = parcalar.filter(
		(p, i) => !parcalar.some((q, j) => j !== i && q.includes(p) && q !== p)
	);
	const metin = [...new Set(tekil)].join(' ').slice(0, 300);
	redirect(303, metin ? `/hizli?metin=${encodeURIComponent(metin)}` : '/pano');
};
