// Düğüm formunda yazarken eser önerisi (Open Library / TMDB). Anahtar tarayıcıya gitmez.
import { TMDB_ANAHTARI } from '$app/env/private';
import { AramaHatasi, kitapAra, tmdbAra } from '#lib/server/eserArama.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.kullanici) return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
	const tur = url.searchParams.get('tur');
	if (q.length < 2) return Response.json({ sonuclar: [] });
	try {
		const sonuclar =
			tur === 'film' || tur === 'dizi'
				? TMDB_ANAHTARI
					? await tmdbAra(q, tur, TMDB_ANAHTARI)
					: []
				: tur === 'kitap' || !tur
					? await kitapAra(q)
					: [];
		return Response.json({
			sonuclar: sonuclar.slice(0, 6).map((s) => ({
				baslik: s.baslik,
				altBaslik: s.altBaslik,
				yil: s.yil,
				eserTuru: s.eserTuru
			}))
		});
	} catch (e) {
		if (e instanceof AramaHatasi) return Response.json({ sonuclar: [], hata: e.message });
		throw e;
	}
};
