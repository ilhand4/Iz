// Emanet edilen arşivin tamamı (varis yalnızca süre dolunca indirebilir)
import { error } from '@sveltejs/kit';
import { disaAktar } from '#lib/server/disaIceAktar.ts';
import { acikEmanet } from '#lib/server/vasiyet.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.kullanici) error(401, 'Giriş yapmalısın.');
	const e = await acikEmanet(locals.kullanici.id, params.kullaniciAdi);
	if (!e) error(404, 'Bu arşiv sana açık değil.');
	const veri = await disaAktar(e.sahipId);
	return new Response(JSON.stringify(veri, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="iz-emanet-${e.kullaniciAdi}.json"`,
			'cache-control': 'no-store'
		}
	});
};
