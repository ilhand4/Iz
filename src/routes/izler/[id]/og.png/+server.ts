// Herkese açık izin paylaşım görseli (PNG). Özel izde 404; gizli durakların başlığı çizilmez.
import { Resvg } from '@resvg/resvg-js';
import { error } from '@sveltejs/kit';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { gizliMi, izGetir } from '#lib/server/izler.ts';
import { izOgSvg } from '#lib/server/ogGorsel.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const iz = uuidMu(params.id) ? await izGetir(params.id, null) : null;
	if (!iz) error(404, 'Bu iz paylaşıma açık değil.');
	const svg = izOgSvg({
		baslik: iz.iz.baslik,
		sahip: iz.sahip.ad,
		duraklar: iz.duraklar.map((d) =>
			gizliMi(d) ? { gizli: true as const } : { tur: d.dugum.tur, baslik: d.dugum.baslik }
		)
	});
	// Sunucunun yazı tipleri kullanılır (Windows: Segoe UI, Linux: DejaVu); Türkçe karakterli
	const png = new Resvg(svg, {
		font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
		fitTo: { mode: 'original' }
	})
		.render()
		.asPng();
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=3600'
		}
	});
};
