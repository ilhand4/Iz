// "Senin izin beni buraya götürdü": başkasının görebildiğin düğümünden kendi düğümüne bağ ve
// uygulama içi bildirimler. Gizlilik: her listede iki ucun da izleyene görünür olması gerekir;
// bildirim, bağı kuranın düğümü alıcıya görünmüyorsa başlığını göstermez.
import { aliasedTable, and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { bildirimKutusu, disBaglar, dugumler, gruplar, kullanicilar, sorular } from './db/schema';
import { gorunurluk } from './dugumler';

const kaynakD = aliasedTable(dugumler, 'dis_kaynak');
const hedefD = aliasedTable(dugumler, 'dis_hedef');

export type DisBagSonucu = 'kuruldu' | 'zaten-var' | 'yetkisiz';

/**
 * Kaynak, kullanıcının görebildiği başkasına ait bir düğüm; hedef, kullanıcının kendi düğümü
 * olmalı. Kaynağın sahibine bildirim gider.
 */
export async function disBagKur(
	kullaniciId: string,
	kaynakId: string,
	hedefId: string,
	not: string | null
): Promise<DisBagSonucu> {
	return db.transaction(async (tx) => {
		const [kaynak] = await tx
			.select({ sahipId: dugumler.sahipId })
			.from(dugumler)
			.where(and(eq(dugumler.id, kaynakId), gorunurluk(dugumler, kullaniciId)));
		if (!kaynak || kaynak.sahipId === kullaniciId) return 'yetkisiz';
		const [hedef] = await tx
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(
				and(eq(dugumler.id, hedefId), eq(dugumler.sahipId, kullaniciId), isNull(dugumler.silinme))
			);
		if (!hedef) return 'yetkisiz';
		const [bag] = await tx
			.insert(disBaglar)
			.values({ sahipId: kullaniciId, kaynakId, hedefId, not })
			.onConflictDoNothing()
			.returning({ id: disBaglar.id });
		if (!bag) return 'zaten-var';
		await tx
			.insert(bildirimKutusu)
			.values({ aliciId: kaynak.sahipId, tur: 'dis_bag', aktorId: kullaniciId, disBagId: bag.id });
		return 'kuruldu';
	});
}

/** Yalnızca bağı kuran kaldırabilir */
export async function disBagSil(kullaniciId: string, bagId: string) {
	const silinen = await db
		.delete(disBaglar)
		.where(and(eq(disBaglar.id, bagId), eq(disBaglar.sahipId, kullaniciId)))
		.returning({ id: disBaglar.id });
	return silinen.length > 0;
}

/** Bu düğüme (izleyenin görebildiği) başkalarının düğümlerinden gelen dış bağlar */
export async function gelenDisBaglar(dugumId: string, izleyenId: string | null) {
	return db
		.select({
			id: disBaglar.id,
			not: disBaglar.not,
			sahibiBenMiyim: sql<boolean>`${disBaglar.sahipId} = ${izleyenId ?? null}`,
			dugum: { id: kaynakD.id, baslik: kaynakD.baslik, tur: kaynakD.tur },
			kisi: { ad: kullanicilar.ad, kullaniciAdi: kullanicilar.kullaniciAdi }
		})
		.from(disBaglar)
		.innerJoin(kaynakD, eq(disBaglar.kaynakId, kaynakD.id))
		.innerJoin(kullanicilar, eq(kaynakD.sahipId, kullanicilar.id))
		.where(and(eq(disBaglar.hedefId, dugumId), gorunurluk(kaynakD, izleyenId)))
		.orderBy(desc(disBaglar.olusturma))
		.limit(50);
}

/**
 * Bu düğümden başkalarının kendi düğümlerine kurduğu dış bağlar: görünür hedefler listelenir,
 * görünmeyenler yalnızca sayılır ("2 kişi daha buradan yola çıktı").
 */
export async function gidenDisBaglar(dugumId: string, izleyenId: string | null) {
	const [gorunur, [{ toplam }]] = await Promise.all([
		db
			.select({
				id: disBaglar.id,
				not: disBaglar.not,
				dugum: { id: hedefD.id, baslik: hedefD.baslik, tur: hedefD.tur },
				kisi: { ad: kullanicilar.ad, kullaniciAdi: kullanicilar.kullaniciAdi }
			})
			.from(disBaglar)
			.innerJoin(hedefD, eq(disBaglar.hedefId, hedefD.id))
			.innerJoin(kullanicilar, eq(disBaglar.sahipId, kullanicilar.id))
			.where(and(eq(disBaglar.kaynakId, dugumId), gorunurluk(hedefD, izleyenId)))
			.orderBy(desc(disBaglar.olusturma))
			.limit(50),
		db
			.select({ toplam: count() })
			.from(disBaglar)
			.innerJoin(hedefD, eq(disBaglar.hedefId, hedefD.id))
			.where(and(eq(disBaglar.kaynakId, dugumId), isNull(hedefD.silinme)))
	]);
	return { gorunur, gizliSayisi: Math.max(0, toplam - gorunur.length) };
}

// ——— Bildirim kutusu ———

export async function okunmamisSayisi(kullaniciId: string) {
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(bildirimKutusu)
		.where(and(eq(bildirimKutusu.aliciId, kullaniciId), isNull(bildirimKutusu.okundu)));
	return sayi;
}

/** Son bildirimler; kişi ve düğüm bilgisi yalnızca alıcıya görünüyorsa */
export async function bildirimleriGetir(kullaniciId: string, limit = 50) {
	const satirlar = await db
		.select({
			id: bildirimKutusu.id,
			tur: bildirimKutusu.tur,
			okundu: bildirimKutusu.okundu,
			olusturma: bildirimKutusu.olusturma,
			aktor: { ad: kullanicilar.ad, kullaniciAdi: kullanicilar.kullaniciAdi },
			grup: { id: gruplar.id, ad: gruplar.ad },
			kaynak: { id: kaynakD.id, baslik: kaynakD.baslik },
			hedef: {
				id: hedefD.id,
				baslik: hedefD.baslik,
				gorunur: sql<boolean>`(${gorunurluk(hedefD, kullaniciId)})`
			},
			not: disBaglar.not,
			soru: { id: sorular.id, aliciAdi: sorular.aliciAdi, metin: sorular.metin }
		})
		.from(bildirimKutusu)
		.leftJoin(kullanicilar, eq(bildirimKutusu.aktorId, kullanicilar.id))
		.leftJoin(gruplar, eq(bildirimKutusu.grupId, gruplar.id))
		.leftJoin(sorular, eq(bildirimKutusu.soruId, sorular.id))
		.leftJoin(disBaglar, eq(bildirimKutusu.disBagId, disBaglar.id))
		.leftJoin(kaynakD, eq(disBaglar.kaynakId, kaynakD.id))
		.leftJoin(hedefD, eq(disBaglar.hedefId, hedefD.id))
		.where(eq(bildirimKutusu.aliciId, kullaniciId))
		.orderBy(desc(bildirimKutusu.olusturma))
		.limit(limit);
	return satirlar.map((b) => ({
		...b,
		// Bağı kuranın düğümü alıcıya görünmüyorsa başlığı ve notu gösterilmez
		hedef: b.hedef?.id && b.hedef.gorunur ? { id: b.hedef.id, baslik: b.hedef.baslik } : null,
		not: b.hedef?.gorunur ? b.not : null
	}));
}

export async function hepsiniOku(kullaniciId: string) {
	await db
		.update(bildirimKutusu)
		.set({ okundu: new Date() })
		.where(and(eq(bildirimKutusu.aliciId, kullaniciId), isNull(bildirimKutusu.okundu)));
}

/** Gruba biri katılınca diğer yöneticilere haber */
export async function grupKatilimBildir(grupId: string, katilanId: string) {
	await db.execute(sql`
		insert into bildirim_kutusu (alici_id, tur, aktor_id, grup_id)
		select kullanici_id, 'grup_katilim', ${katilanId}, ${grupId}
		from grup_uyeleri
		where grup_id = ${grupId} and rol = 'yonetici' and kullanici_id <> ${katilanId}
	`);
}
