// Dil seçimi: ?d=tr|en&donus=/yol → çereze yazar ve aynı sayfaya döner (JavaScript gerekmez).
import { redirect } from '@sveltejs/kit';
import { dilMi } from '#lib/dil.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	const d = url.searchParams.get('d');
	if (dilMi(d))
		cookies.set('dil', d, { path: '/', maxAge: 365 * 86400, sameSite: 'lax', httpOnly: false });
	const donus = url.searchParams.get('donus') ?? '/';
	// Yalnızca site içi yol: açık yönlendirme olmasın
	redirect(303, donus.startsWith('/') && !donus.startsWith('//') ? donus : '/');
};
