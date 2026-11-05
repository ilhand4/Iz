// Harita görünümünün verisi: konumlu düğümler, aralarındaki bağlar ve konumsuzların sayısı.
import { and, count, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { KonumluDugum } from '../konumlar';
import { db } from './db';
import { baglar, dugumler } from './db/schema';
import { etkin } from './dugumler';

const kaynakD = alias(dugumler, 'kaynak_d');
const hedefD = alias(dugumler, 'hedef_d');

export async function haritaKonumlari(sahipId: string) {
	const konumlu = and(isNotNull(dugumler.enlem), isNotNull(dugumler.boylam));
	const [liste, bagListesi, [{ konumsuz }]] = await Promise.all([
		db
			.select({
				id: dugumler.id,
				baslik: dugumler.baslik,
				tur: dugumler.tur,
				enlem: dugumler.enlem,
				boylam: dugumler.boylam,
				yerAdi: dugumler.yerAdi
			})
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler), konumlu))
			.limit(5000),
		db
			.select({ kaynakId: baglar.kaynakId, hedefId: baglar.hedefId, tur: baglar.tur })
			.from(baglar)
			.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
			.innerJoin(hedefD, eq(baglar.hedefId, hedefD.id))
			.where(
				and(
					eq(baglar.sahipId, sahipId),
					etkin(kaynakD),
					etkin(hedefD),
					isNotNull(kaynakD.enlem),
					isNotNull(hedefD.enlem)
				)
			)
			.limit(20000),
		db
			.select({ konumsuz: count() })
			.from(dugumler)
			.where(
				and(
					eq(dugumler.sahipId, sahipId),
					etkin(dugumler),
					or(isNull(dugumler.enlem), isNull(dugumler.boylam))
				)
			)
	]);
	return { dugumler: liste as KonumluDugum[], baglar: bagListesi, konumsuz };
}

/** Sahibin bu düğüme `metre` içindeki diğer düğümleri, yakından uzağa (PostGIS, GiST dizini) */
export async function yakindakiler(sahipId: string, dugumId: string, metre = 2000, limit = 8) {
	const merkez = alias(dugumler, 'merkez');
	return db
		.select({
			id: dugumler.id,
			baslik: dugumler.baslik,
			tur: dugumler.tur,
			mesafe: sql<number>`round(st_distance(${dugumler.konum}, ${merkez.konum}))::int`
		})
		.from(dugumler)
		.innerJoin(merkez, eq(merkez.id, dugumId))
		.where(
			and(
				eq(merkez.sahipId, sahipId),
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				ne(dugumler.id, dugumId),
				// Aynı noktadakiler (0 m) de dahildir
				sql`st_dwithin(${dugumler.konum}, ${merkez.konum}, ${metre})`
			)
		)
		.orderBy(sql`st_distance(${dugumler.konum}, ${merkez.konum})`, dugumler.baslik)
		.limit(limit);
}
