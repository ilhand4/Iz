import { redirect } from '@sveltejs/kit';
import { yillikVerisi } from '#lib/server/geriGetirenlerDb.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

// En son düğümü olan yıla (yoksa bu yıla) yönlendirir
export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const buYil = Number(
		new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(
			new Date()
		)
	);
	const { yillar } = await yillikVerisi(kullanici.id, buYil);
	redirect(303, `/yillik/${yillar[0] ?? buYil}`);
};
