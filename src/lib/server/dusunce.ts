// Düşünce araçları: dönemler (hayat bölümleri), alıntılar ve iz çatallanması.
// Yazma sorguları sahip_id ile süzülür; alıntılar, düğümü görebilen herkese görünür.
import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from './db';
import { alintilar, donemler, dugumler, izAdimlari, izler } from './db/schema';
import type { DonemVerisi } from './dogrulama';
import { etkin, gorunurluk } from './dugumler';

// ——— Dönemler ———

export async function donemleriListele(sahipId: string) {
	return db
		.select({
			id: donemler.id,
			ad: donemler.ad,
			baslangic: donemler.baslangic,
			bitis: donemler.bitis,
			renk: donemler.renk
		})
		.from(donemler)
		.where(eq(donemler.sahipId, sahipId))
		.orderBy(asc(donemler.baslangic));
}

export async function donemOlustur(sahipId: string, veri: DonemVerisi) {
	const [d] = await db
		.insert(donemler)
		.values({ ...veri, sahipId })
		.returning({ id: donemler.id });
	return d.id;
}

export async function donemGuncelle(id: string, sahipId: string, veri: DonemVerisi) {
	const s = await db
		.update(donemler)
		.set(veri)
		.where(and(eq(donemler.id, id), eq(donemler.sahipId, sahipId)))
		.returning({ id: donemler.id });
	return s.length > 0;
}

export async function donemSil(id: string, sahipId: string) {
	const s = await db
		.delete(donemler)
		.where(and(eq(donemler.id, id), eq(donemler.sahipId, sahipId)))
		.returning({ id: donemler.id });
	return s.length > 0;
}

// ——— Alıntılar ———

/** Düğümün alıntıları (düğüm izleyene görünüyorsa) */
export async function alintilariListele(dugumId: string, izleyenId: string | null) {
	return db
		.select({ id: alintilar.id, metin: alintilar.metin, yer: alintilar.yer })
		.from(alintilar)
		.innerJoin(dugumler, eq(alintilar.dugumId, dugumler.id))
		.where(and(eq(alintilar.dugumId, dugumId), gorunurluk(dugumler, izleyenId)))
		.orderBy(asc(alintilar.olusturma));
}

export async function alintiEkle(
	sahipId: string,
	dugumId: string,
	veri: { metin: string; yer: string | null }
) {
	const [d] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(and(eq(dugumler.id, dugumId), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	if (!d) return null;
	const [a] = await db
		.insert(alintilar)
		.values({ sahipId, dugumId, ...veri })
		.returning({ id: alintilar.id });
	return a.id;
}

export async function alintiSil(id: string, sahipId: string) {
	const s = await db
		.delete(alintilar)
		.where(and(eq(alintilar.id, id), eq(alintilar.sahipId, sahipId)))
		.returning({ id: alintilar.id });
	return s.length > 0;
}

/** Bağa alıntı iliştirmek için: alıntı, bağın kaynak düğümüne ait olmalı */
export async function alintiKaynagi(alintiId: string, sahipId: string) {
	const [a] = await db
		.select({ dugumId: alintilar.dugumId })
		.from(alintilar)
		.where(and(eq(alintilar.id, alintiId), eq(alintilar.sahipId, sahipId)));
	return a?.dugumId ?? null;
}

// ——— İz çatallanması ———

/**
 * İzi verilen duraktan (o durak dahil) çatallar: aynı ilk duraklarla yeni bir iz oluşturur ve
 * ata izi ile ayrılma sırasını kaydeder. Yalnızca kendi izlerinden çatallanır.
 */
export async function catalla(sahipId: string, izId: string, ayrilmaSirasi: number) {
	return db.transaction(async (tx) => {
		const [ata] = await tx
			.select({ baslik: izler.baslik, gizlilik: izler.gizlilik })
			.from(izler)
			.where(and(eq(izler.id, izId), eq(izler.sahipId, sahipId), etkin(izler)));
		if (!ata) return null;
		const duraklar = await tx
			.select({ dugumId: izAdimlari.dugumId, not: izAdimlari.not, sira: izAdimlari.sira })
			.from(izAdimlari)
			.innerJoin(dugumler, eq(izAdimlari.dugumId, dugumler.id))
			.where(
				and(
					eq(izAdimlari.izId, izId),
					lte(izAdimlari.sira, ayrilmaSirasi),
					eq(dugumler.sahipId, sahipId),
					etkin(dugumler)
				)
			)
			.orderBy(asc(izAdimlari.sira));
		if (!duraklar.length) return null;
		const [yeni] = await tx
			.insert(izler)
			.values({
				sahipId,
				baslik: `${ata.baslik} (başka bir yol)`.slice(0, 120),
				gizlilik: 'ozel',
				ataIzId: izId,
				ayrilmaSirasi
			})
			.returning({ id: izler.id });
		await tx
			.insert(izAdimlari)
			.values(
				duraklar.map((d, i) => ({ izId: yeni.id, dugumId: d.dugumId, not: d.not, sira: i + 1 }))
			);
		return yeni.id;
	});
}

/** Bu izden ayrılan, izleyenin görebildiği çatallar (ayrıldıkları sırayla) */
export async function catallar(izId: string, izleyenId: string | null) {
	return db
		.select({ id: izler.id, baslik: izler.baslik, ayrilmaSirasi: izler.ayrilmaSirasi })
		.from(izler)
		.where(and(eq(izler.ataIzId, izId), gorunurluk(izler, izleyenId)))
		.orderBy(asc(izler.ayrilmaSirasi), desc(izler.guncelleme));
}

/** İzin atası (izleyen görebiliyorsa) */
export async function atasi(ataIzId: string | null, izleyenId: string | null) {
	if (!ataIzId) return null;
	const [a] = await db
		.select({ id: izler.id, baslik: izler.baslik })
		.from(izler)
		.where(and(eq(izler.id, ataIzId), gorunurluk(izler, izleyenId)));
	return a ?? null;
}
