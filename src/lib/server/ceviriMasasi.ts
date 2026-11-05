// Çeviri Masası veri katmanı. Erişim:
// - görme: masanın gizliliği (sahip / grup arkadaşı / herkes)
// - paragraf ekleme, masa ayarları: yalnızca sahibi
// - çeviri ekleme: sahibi ve (masa grup ya da herkese açıksa) grup arkadaşları
// - oy ve yorum: masayı gören her girişli kullanıcı; silme: yazarı ya da masanın sahibi
// Telif kuralı (kullanıcı kararı): alıntı dayanaklı çeviri içeren paragraf sayısı masada en çok 5.
import { and, asc, count, desc, eq, inArray, max, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ALINTI_PARAGRAF_SINIRI, PARAGRAF_BASINA_CEVIRI } from '../ceviri';
import { db } from './db';
import {
	ceviriler,
	ceviriMasalari,
	ceviriOylari,
	ceviriParagraflari,
	ceviriYorumlari,
	dugumler,
	kullanicilar
} from './db/schema';
import type { CeviriVerisi, MasaVerisi } from './dogrulama';
import { etkin, grupArkadasiSql } from './dugumler';

function masaGorunurlugu(izleyenId: string | null): SQL {
	const herkes = eq(ceviriMasalari.gizlilik, 'herkes');
	if (!izleyenId) return herkes;
	return or(
		eq(ceviriMasalari.sahipId, izleyenId),
		herkes,
		and(eq(ceviriMasalari.gizlilik, 'grup'), grupArkadasiSql(ceviriMasalari.sahipId, izleyenId))
	) as SQL;
}

/** Çeviri ekleyebilir mi: sahibi ya da (grup/herkes masasında) grup arkadaşı */
function katkiSql(izleyenId: string): SQL {
	return or(
		eq(ceviriMasalari.sahipId, izleyenId),
		and(
			inArray(ceviriMasalari.gizlilik, ['grup', 'herkes']),
			grupArkadasiSql(ceviriMasalari.sahipId, izleyenId)
		)
	) as SQL;
}

async function eserDogrula(sahipId: string, eserId: string | null) {
	if (!eserId) return null;
	const [e] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.id, eserId),
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.tur, 'eser'),
				etkin(dugumler)
			)
		);
	return e?.id ?? null;
}

export async function masaOlustur(sahipId: string, veri: MasaVerisi) {
	const [m] = await db
		.insert(ceviriMasalari)
		.values({ ...veri, sahipId, eserId: await eserDogrula(sahipId, veri.eserId) })
		.returning({ id: ceviriMasalari.id });
	return m.id;
}

export async function masaGuncelle(id: string, sahipId: string, veri: MasaVerisi) {
	const s = await db
		.update(ceviriMasalari)
		.set({ ...veri, eserId: await eserDogrula(sahipId, veri.eserId) })
		.where(and(eq(ceviriMasalari.id, id), eq(ceviriMasalari.sahipId, sahipId)))
		.returning({ id: ceviriMasalari.id });
	return s.length > 0;
}

export async function masaSil(id: string, sahipId: string) {
	const s = await db
		.delete(ceviriMasalari)
		.where(and(eq(ceviriMasalari.id, id), eq(ceviriMasalari.sahipId, sahipId)))
		.returning({ id: ceviriMasalari.id });
	return s.length > 0;
}

/** Kendi masaları ve grup arkadaşlarının (grup/herkes) masaları */
export async function masalarim(kullaniciId: string) {
	const paragrafSayisi = db
		.select({ masaId: ceviriParagraflari.masaId, sayi: count().as('paragraf_sayisi') })
		.from(ceviriParagraflari)
		.groupBy(ceviriParagraflari.masaId)
		.as('ps');
	return db
		.select({
			id: ceviriMasalari.id,
			baslik: ceviriMasalari.baslik,
			ozgunDil: ceviriMasalari.ozgunDil,
			gizlilik: ceviriMasalari.gizlilik,
			sahibiMi: sql<boolean>`${ceviriMasalari.sahipId} = ${kullaniciId}`,
			sahip: kullanicilar.ad,
			paragraf: sql<number>`coalesce(${paragrafSayisi.sayi}, 0)::int`
		})
		.from(ceviriMasalari)
		.innerJoin(kullanicilar, eq(ceviriMasalari.sahipId, kullanicilar.id))
		.leftJoin(paragrafSayisi, eq(paragrafSayisi.masaId, ceviriMasalari.id))
		.where(
			or(
				eq(ceviriMasalari.sahipId, kullaniciId),
				and(
					inArray(ceviriMasalari.gizlilik, ['grup', 'herkes']),
					grupArkadasiSql(ceviriMasalari.sahipId, kullaniciId)
				)
			)
		)
		.orderBy(desc(ceviriMasalari.olusturma))
		.limit(200);
}

/** Masanın tamamı: paragraflar, çeviriler, oylar ve yorumlar; göremiyorsa null */
export async function masaGetir(id: string, izleyenId: string | null) {
	const [m] = await db
		.select({
			masa: {
				id: ceviriMasalari.id,
				baslik: ceviriMasalari.baslik,
				ozgunDil: ceviriMasalari.ozgunDil,
				aciklama: ceviriMasalari.aciklama,
				gizlilik: ceviriMasalari.gizlilik,
				eserId: ceviriMasalari.eserId
			},
			sahip: { ad: kullanicilar.ad, kullaniciAdi: kullanicilar.kullaniciAdi },
			sahibiMi: izleyenId
				? sql<boolean>`${ceviriMasalari.sahipId} = ${izleyenId}`
				: sql<boolean>`false`,
			katki: izleyenId ? sql<boolean>`${katkiSql(izleyenId)}` : sql<boolean>`false`
		})
		.from(ceviriMasalari)
		.innerJoin(kullanicilar, eq(ceviriMasalari.sahipId, kullanicilar.id))
		.where(and(eq(ceviriMasalari.id, id), masaGorunurlugu(izleyenId)));
	if (!m) return null;

	const [eser, paragraflar] = await Promise.all([
		m.masa.eserId
			? db
					.select({ id: dugumler.id, baslik: dugumler.baslik, gizlilik: dugumler.gizlilik })
					.from(dugumler)
					.where(and(eq(dugumler.id, m.masa.eserId), etkin(dugumler)))
			: Promise.resolve([]),
		db
			.select({
				id: ceviriParagraflari.id,
				sira: ceviriParagraflari.sira,
				yer: ceviriParagraflari.yer,
				ozgun: ceviriParagraflari.ozgun
			})
			.from(ceviriParagraflari)
			.where(eq(ceviriParagraflari.masaId, id))
			.orderBy(asc(ceviriParagraflari.sira))
	]);
	const pIdler = paragraflar.map((p) => p.id);
	const cevrList = pIdler.length
		? await db
				.select({
					id: ceviriler.id,
					paragrafId: ceviriler.paragrafId,
					metin: ceviriler.metin,
					cevirmen: ceviriler.cevirmen,
					yayinevi: ceviriler.yayinevi,
					yil: ceviriler.yil,
					dayanak: ceviriler.dayanak,
					ekleyen: kullanicilar.ad,
					benimMi: izleyenId
						? sql<boolean>`${ceviriler.ekleyenId} = ${izleyenId}`
						: sql<boolean>`false`
				})
				.from(ceviriler)
				.innerJoin(kullanicilar, eq(ceviriler.ekleyenId, kullanicilar.id))
				.where(inArray(ceviriler.paragrafId, pIdler))
				.orderBy(asc(ceviriler.yil), asc(ceviriler.olusturma))
		: [];
	const cIdler = cevrList.map((c) => c.id);
	const [oylar, yorumlar] = cIdler.length
		? await Promise.all([
				db
					.select({
						ceviriId: ceviriOylari.ceviriId,
						kullaniciId: ceviriOylari.kullaniciId
					})
					.from(ceviriOylari)
					.where(inArray(ceviriOylari.ceviriId, cIdler)),
				db
					.select({
						id: ceviriYorumlari.id,
						ceviriId: ceviriYorumlari.ceviriId,
						metin: ceviriYorumlari.metin,
						olusturma: ceviriYorumlari.olusturma,
						yazar: kullanicilar.ad,
						benimMi: izleyenId
							? sql<boolean>`${ceviriYorumlari.yazarId} = ${izleyenId}`
							: sql<boolean>`false`
					})
					.from(ceviriYorumlari)
					.innerJoin(kullanicilar, eq(ceviriYorumlari.yazarId, kullanicilar.id))
					.where(inArray(ceviriYorumlari.ceviriId, cIdler))
					.orderBy(asc(ceviriYorumlari.olusturma))
			])
		: [[], []];

	// Eser bağlantısı yalnızca izleyen o eser düğümünü görebiliyorsa (sahibi ya da açık eser)
	const e = eser[0];
	const eserGorunur = e && (m.sahibiMi || e.gizlilik === 'herkes');
	return {
		masa: m.masa,
		sahip: m.sahip,
		sahibiMi: m.sahibiMi,
		katkiYapabilir: m.katki,
		eser: eserGorunur ? { id: e.id, baslik: e.baslik } : null,
		alintiParagraf: new Set(cevrList.filter((c) => c.dayanak === 'alinti').map((c) => c.paragrafId))
			.size,
		paragraflar: paragraflar.map((p) => ({
			...p,
			ceviriler: cevrList
				.filter((c) => c.paragrafId === p.id)
				.map((c) => ({
					...c,
					oy: oylar.filter((o) => o.ceviriId === c.id).length,
					benimOyum:
						!!izleyenId && oylar.some((o) => o.ceviriId === c.id && o.kullaniciId === izleyenId),
					yorumlar: yorumlar.filter((y) => y.ceviriId === c.id)
				}))
		}))
	};
}

export async function paragrafEkle(
	masaId: string,
	sahipId: string,
	veri: { yer: string | null; ozgun: string | null }
) {
	return db.transaction(async (tx) => {
		const [m] = await tx
			.select({ id: ceviriMasalari.id })
			.from(ceviriMasalari)
			.where(and(eq(ceviriMasalari.id, masaId), eq(ceviriMasalari.sahipId, sahipId)))
			.for('update');
		if (!m) return null;
		const [{ enBuyuk }] = await tx
			.select({ enBuyuk: max(ceviriParagraflari.sira) })
			.from(ceviriParagraflari)
			.where(eq(ceviriParagraflari.masaId, masaId));
		const [p] = await tx
			.insert(ceviriParagraflari)
			.values({ masaId, sira: (enBuyuk ?? 0) + 1, ...veri })
			.returning({ id: ceviriParagraflari.id });
		return p.id;
	});
}

export async function paragrafSil(paragrafId: string, sahipId: string) {
	const s = await db
		.delete(ceviriParagraflari)
		.where(
			and(
				eq(ceviriParagraflari.id, paragrafId),
				inArray(
					ceviriParagraflari.masaId,
					db
						.select({ id: ceviriMasalari.id })
						.from(ceviriMasalari)
						.where(eq(ceviriMasalari.sahipId, sahipId))
				)
			)
		)
		.returning({ id: ceviriParagraflari.id });
	return s.length > 0;
}

export async function ceviriEkle(
	paragrafId: string,
	kullaniciId: string,
	veri: CeviriVerisi
): Promise<'yetkisiz' | 'dolu' | 'alinti-siniri' | { id: string }> {
	return db.transaction(async (tx) => {
		const [p] = await tx
			.select({ masaId: ceviriParagraflari.masaId })
			.from(ceviriParagraflari)
			.innerJoin(ceviriMasalari, eq(ceviriParagraflari.masaId, ceviriMasalari.id))
			.where(and(eq(ceviriParagraflari.id, paragrafId), katkiSql(kullaniciId)))
			.for('update', { of: ceviriMasalari });
		if (!p) return 'yetkisiz';
		const mevcut = await tx
			.select({ dayanak: ceviriler.dayanak })
			.from(ceviriler)
			.where(eq(ceviriler.paragrafId, paragrafId));
		if (mevcut.length >= PARAGRAF_BASINA_CEVIRI) return 'dolu';
		if (veri.dayanak === 'alinti' && !mevcut.some((c) => c.dayanak === 'alinti')) {
			const [{ sayi }] = await tx
				.select({ sayi: sql<number>`count(distinct ${ceviriler.paragrafId})::int` })
				.from(ceviriler)
				.innerJoin(ceviriParagraflari, eq(ceviriler.paragrafId, ceviriParagraflari.id))
				.where(and(eq(ceviriParagraflari.masaId, p.masaId), eq(ceviriler.dayanak, 'alinti')));
			if (sayi >= ALINTI_PARAGRAF_SINIRI) return 'alinti-siniri';
		}
		const [c] = await tx
			.insert(ceviriler)
			.values({ paragrafId, ekleyenId: kullaniciId, ...veri })
			.returning({ id: ceviriler.id });
		return { id: c.id };
	});
}

/** Masa sahibinin kimliği (silme yetkisi için) */
function masaSahibiSql(ceviriSutun: AnyPgColumn, kullaniciId: string) {
	return sql`exists (select 1 from ceviri_paragraflari p join ceviri_masalari m on m.id = p.masa_id
		join ceviriler c on c.paragraf_id = p.id where c.id = ${ceviriSutun} and m.sahip_id = ${kullaniciId})`;
}

export async function ceviriSil(id: string, kullaniciId: string) {
	const s = await db
		.delete(ceviriler)
		.where(
			and(
				eq(ceviriler.id, id),
				or(eq(ceviriler.ekleyenId, kullaniciId), masaSahibiSql(ceviriler.id, kullaniciId))
			)
		)
		.returning({ id: ceviriler.id });
	return s.length > 0;
}

/** Masayı görebiliyor mu (oy ve yorum için) */
async function ceviriGorunur(ceviriId: string, kullaniciId: string) {
	const [c] = await db
		.select({ paragrafId: ceviriler.paragrafId })
		.from(ceviriler)
		.innerJoin(ceviriParagraflari, eq(ceviriler.paragrafId, ceviriParagraflari.id))
		.innerJoin(ceviriMasalari, eq(ceviriParagraflari.masaId, ceviriMasalari.id))
		.where(and(eq(ceviriler.id, ceviriId), masaGorunurlugu(kullaniciId)));
	return c ?? null;
}

/** Paragraf başına tek oy; aynı çeviriye ikinci tıklama oyu geri alır */
export async function oyVer(ceviriId: string, kullaniciId: string) {
	const c = await ceviriGorunur(ceviriId, kullaniciId);
	if (!c) return null;
	const [var_] = await db
		.select({ ceviriId: ceviriOylari.ceviriId })
		.from(ceviriOylari)
		.where(
			and(eq(ceviriOylari.paragrafId, c.paragrafId), eq(ceviriOylari.kullaniciId, kullaniciId))
		);
	if (var_?.ceviriId === ceviriId) {
		await db
			.delete(ceviriOylari)
			.where(
				and(eq(ceviriOylari.paragrafId, c.paragrafId), eq(ceviriOylari.kullaniciId, kullaniciId))
			);
		return 'geri-alindi' as const;
	}
	await db
		.insert(ceviriOylari)
		.values({ paragrafId: c.paragrafId, kullaniciId, ceviriId })
		.onConflictDoUpdate({
			target: [ceviriOylari.paragrafId, ceviriOylari.kullaniciId],
			set: { ceviriId, olusturma: new Date() }
		});
	return 'verildi' as const;
}

export async function yorumEkle(ceviriId: string, kullaniciId: string, metin: string) {
	if (!(await ceviriGorunur(ceviriId, kullaniciId))) return false;
	await db.insert(ceviriYorumlari).values({ ceviriId, yazarId: kullaniciId, metin });
	return true;
}

export async function yorumSil(id: string, kullaniciId: string) {
	const s = await db
		.delete(ceviriYorumlari)
		.where(
			and(
				eq(ceviriYorumlari.id, id),
				or(
					eq(ceviriYorumlari.yazarId, kullaniciId),
					masaSahibiSql(ceviriYorumlari.ceviriId, kullaniciId)
				)
			)
		)
		.returning({ id: ceviriYorumlari.id });
	return s.length > 0;
}

/** Eser düğümünün masaları (düğüm sayfasında; izleyenin görebildikleri) */
export async function eserinMasalari(eserId: string, izleyenId: string | null) {
	return db
		.select({ id: ceviriMasalari.id, baslik: ceviriMasalari.baslik })
		.from(ceviriMasalari)
		.where(and(eq(ceviriMasalari.eserId, eserId), masaGorunurlugu(izleyenId)))
		.orderBy(asc(ceviriMasalari.olusturma));
}

/** Masa formundaki eser seçici için sahibin eserleri */
export async function eserSecenekleri(sahipId: string) {
	return db
		.select({ id: dugumler.id, baslik: dugumler.baslik })
		.from(dugumler)
		.where(and(eq(dugumler.sahipId, sahipId), eq(dugumler.tur, 'eser'), etkin(dugumler)))
		.orderBy(asc(dugumler.baslik))
		.limit(2000);
}
