// Komut paleti araması: kullanıcının kendi düğümleri ve izleri (yazım hatasına dayanıklı)
import { dugumleriListele } from '#lib/server/dugumler.ts';
import { izleriListele } from '#lib/server/izler.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.kullanici) return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	if (!q) return Response.json({ dugumler: [], izler: [] });
	const [dugumler, izler] = await Promise.all([
		dugumleriListele(locals.kullanici.id, { q, limit: 8 }),
		izleriListele(locals.kullanici.id, { q, limit: 5 })
	]);
	return Response.json(
		{
			dugumler: dugumler.map((d) => ({
				id: d.id,
				baslik: d.baslik,
				altBaslik: d.altBaslik,
				tur: d.tur
			})),
			izler: izler.map((i) => ({ id: i.id, baslik: i.baslik, durakSayisi: i.durakSayisi }))
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
