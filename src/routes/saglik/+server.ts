// Yayında izleme için sağlık ucu: uygulama ve veritabanı ayakta mı. Ayrıntı (sürüm, hata) sızdırmaz.
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`select 1`);
		return Response.json({ durum: 'iyi' }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return Response.json(
			{ durum: 'veritabani-yok' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
