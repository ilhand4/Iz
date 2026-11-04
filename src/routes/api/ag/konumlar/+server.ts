// Ağ görünümündeki düğüm konumlarını kaydeder (sürükleme ve yeniden yerleştirme sonrası).
// Köken denetimi hooks.server.ts'de; yalnızca kullanıcının kendi düğümleri yazılır.
import { konumlarDogrula } from '#lib/server/dogrulama.ts';
import { konumlariKaydet } from '#lib/server/dugumler.ts';
import type { RequestHandler } from './$types';

const EN_BUYUK_GOVDE = 512 * 1024;

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.kullanici) {
		return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
	}
	const uzunluk = Number(request.headers.get('content-length') ?? 0);
	if (uzunluk > EN_BUYUK_GOVDE) {
		return Response.json({ hata: 'İstek çok büyük.' }, { status: 413 });
	}
	let govde: unknown;
	try {
		govde = await request.json();
	} catch {
		return Response.json({ hata: 'Geçersiz istek.' }, { status: 400 });
	}
	const konumlar = konumlarDogrula(govde);
	if (!konumlar) return Response.json({ hata: 'Geçersiz konumlar.' }, { status: 400 });
	const kaydedilen = await konumlariKaydet(locals.kullanici.id, konumlar);
	return Response.json({ kaydedilen });
};
