// İz Yıllığı kartı (PNG). Kişisel veri içerdiği için yalnızca sahibine üretilir; paylaşmak
// kullanıcının kendi kararıdır (indirip istediği yere koyar).
import { Resvg } from '@resvg/resvg-js';
import { error } from '@sveltejs/kit';
import { yillikVerisi } from '#lib/server/geriGetirenlerDb.ts';
import { yillikSvg } from '#lib/server/ogGorsel.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.kullanici) error(401, 'Giriş yapmalısın.');
	const yil = Number(params.yil);
	if (!Number.isInteger(yil) || yil < 1 || yil > 2999) error(404, 'Böyle bir yıl yok.');
	const { yillik } = await yillikVerisi(locals.kullanici.id, yil);
	const svg = yillikSvg({
		yil,
		ad: locals.kullanici.ad,
		toplam: yillik.toplam,
		enCokGoturen: yillik.enCokGoturen,
		zincir: yillik.enUzunZincir,
		kumeSayisi: yillik.kumeler.length
	});
	const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } })
		.render()
		.asPng();
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'content-disposition': `inline; filename="iz-yilligi-${yil}.png"`,
			'cache-control': 'private, no-store'
		}
	});
};
