// Verilerin indirilmesi: ?bicim=json (yeniden içe aktarılabilir) ya da ?bicim=md (okunabilir)
import { disaAktar } from '#lib/server/disaIceAktar.ts';
import { markdownYaz } from '#lib/server/veriTasima.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.kullanici) return new Response('Giriş yapmalısın.', { status: 401 });
	const md = url.searchParams.get('bicim') === 'md';
	const veri = await disaAktar(locals.kullanici.id);
	const gun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
	const dosya = `iz-${locals.kullanici.kullaniciAdi}-${gun}.${md ? 'md' : 'json'}`;
	return new Response(md ? markdownYaz(veri) : JSON.stringify(veri, null, 2), {
		headers: {
			'content-type': md ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${dosya}"`,
			'cache-control': 'no-store'
		}
	});
};
