import { kararListesi } from '#lib/server/kararDefteriDb.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const veri = await kararListesi(kullanici.id);
	const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(
		new Date()
	);
	return { ...veri, bugun };
};
