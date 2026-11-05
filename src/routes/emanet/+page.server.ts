import { banaEmanetler } from '#lib/server/vasiyet.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return { emanetler: await banaEmanetler(kullanici.id) };
};
