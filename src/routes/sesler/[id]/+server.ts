// Ses dosyası: yalnızca sahibine ve grup arkadaşlarına. <audio> ileri sarabilsin diye Range desteklenir.
import { readFile } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { sesMime } from '#lib/ses.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { sesDosyasi } from '#lib/server/sesler.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, request }) => {
	if (!uuidMu(params.id)) error(404, 'Ses bulunamadı.');
	const dosya = await sesDosyasi(params.id, locals.kullanici?.id ?? null);
	if (!dosya) error(404, 'Ses bulunamadı.');
	let icerik: Buffer;
	try {
		icerik = await readFile(dosya.yol);
	} catch {
		error(404, 'Ses bulunamadı.');
	}
	const ortak = {
		'content-type': sesMime(dosya.uzanti),
		'accept-ranges': 'bytes',
		'cache-control': 'private, max-age=3600',
		'x-content-type-options': 'nosniff'
	};
	const aralik = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
	if (aralik && (aralik[1] || aralik[2])) {
		const boyut = icerik.length;
		let bas = aralik[1] ? Number(aralik[1]) : boyut - Number(aralik[2]);
		let son = aralik[1] && aralik[2] ? Number(aralik[2]) : boyut - 1;
		bas = Math.max(0, bas);
		son = Math.min(son, boyut - 1);
		if (bas > son) {
			return new Response(null, { status: 416, headers: { 'content-range': `bytes */${boyut}` } });
		}
		return new Response(new Uint8Array(icerik.subarray(bas, son + 1)), {
			status: 206,
			headers: { ...ortak, 'content-range': `bytes ${bas}-${son}/${boyut}` }
		});
	}
	return new Response(new Uint8Array(icerik), { headers: ortak });
};
