// Ağda iki dokunuşla bağ kurma (JSON). Köken denetimi hooks.server.ts'de; iki uç da
// kullanıcının kendi düğümü olmalı (veri katmanı denetler).
import { and, eq } from 'drizzle-orm';
import { bagKur } from '#lib/server/baglar.ts';
import { db } from '#lib/server/db/index.ts';
import { baglar } from '#lib/server/db/schema.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.kullanici) return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
	let govde: { kaynakId?: unknown; hedefId?: unknown };
	try {
		govde = await request.json();
	} catch {
		return Response.json({ hata: 'Geçersiz istek.' }, { status: 400 });
	}
	const { kaynakId, hedefId } = govde;
	if (!uuidMu(kaynakId) || !uuidMu(hedefId) || kaynakId === hedefId) {
		return Response.json({ hata: 'İki farklı düğüm seç.' }, { status: 400 });
	}
	const durum = await bagKur(locals.kullanici.id, {
		kaynakId,
		hedefId,
		not: null,
		tarih: null,
		tarihHassasiyeti: null
	});
	if (durum === 'yetkisiz') return Response.json({ hata: 'Düğüm bulunamadı.' }, { status: 404 });
	if (durum === 'zaten-var') {
		return Response.json({ hata: 'Bu iki düğüm zaten bu yönde bağlı.' }, { status: 409 });
	}
	const [bag] = await db
		.select({ id: baglar.id })
		.from(baglar)
		.where(and(eq(baglar.kaynakId, kaynakId), eq(baglar.hedefId, hedefId)));
	return Response.json({ id: bag.id }, { status: 201 });
};
