import { dugumleriListele } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { dugumTuruMu } from '#lib/sabitler.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const turParam = url.searchParams.get('tur');
	const tur = dugumTuruMu(turParam) ? turParam : null;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	return { dugumler: await dugumleriListele(kullanici.id, { tur, q }), tur, q };
};
