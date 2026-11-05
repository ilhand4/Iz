// Fotoğraf dosyası: ?k=1 küçük boyut. Görünürlük düğümünkidir; görünmeyen fotoğraf 404.
import { readFile } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { fotoDosyasi } from '#lib/server/fotograflar.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!uuidMu(params.id)) error(404, 'Fotoğraf bulunamadı.');
	const dosya = await fotoDosyasi(
		params.id,
		locals.kullanici?.id ?? null,
		url.searchParams.has('k')
	);
	if (!dosya) error(404, 'Fotoğraf bulunamadı.');
	let icerik: Buffer;
	try {
		icerik = await readFile(dosya.yol);
	} catch {
		error(404, 'Fotoğraf bulunamadı.');
	}
	return new Response(new Uint8Array(icerik), {
		headers: {
			'content-type': 'image/webp',
			// Gizlilik sonradan değişebilir: paylaşılan önbelleklere hiç girmesin
			'cache-control': 'private, max-age=3600',
			'x-content-type-options': 'nosniff'
		}
	});
};
