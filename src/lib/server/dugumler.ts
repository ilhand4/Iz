// Düğüm ve bağ veri erişimi. Yetki kuralları burada uygulanır:
// - Okuma: sahibi her şeyi görür; başkaları yalnızca "herkes" düğümlerini.
// - Yazma: yalnızca sahibi (her sorgu sahip_id ile süzülür).
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { DugumTuru, EserTuru, Gizlilik } from '../sabitler';
import { db } from './db';
import { baglar, dugumler, kullanicilar } from './db/schema';
import type { BagVerisi, DugumVerisi } from './dogrulama';
import { likeKacir } from './yetki';

export { gorebilirMi } from './yetki';

/** gorebilirMi kuralının SQL karşılığı */
function gorunurluk(
	tablo: { sahipId: AnyPgColumn; gizlilik: AnyPgColumn },
	izleyenId: string | null
): SQL {
	const herkes = eq(tablo.gizlilik, 'herkes');
	return izleyenId ? (or(eq(tablo.sahipId, izleyenId), herkes) as SQL) : herkes;
}

export type DugumOzeti = {
	id: string;
	tur: DugumTuru;
	eserTuru: EserTuru | null;
	baslik: string;
	altBaslik: string | null;
	gorselUrl: string | null;
	gizlilik: Gizlilik;
	tarih: string | null;
	tarihHassasiyeti: 'gun' | 'ay' | 'yil' | null;
};

const ozetAlanlari = {
	id: dugumler.id,
	tur: dugumler.tur,
	eserTuru: dugumler.eserTuru,
	baslik: dugumler.baslik,
	altBaslik: dugumler.altBaslik,
	gorselUrl: dugumler.gorselUrl,
	gizlilik: dugumler.gizlilik,
	tarih: dugumler.tarih,
	tarihHassasiyeti: dugumler.tarihHassasiyeti
};

export async function dugumleriListele(
	sahipId: string,
	suzgec: { tur?: DugumTuru | null; q?: string; limit?: number } = {}
): Promise<DugumOzeti[]> {
	const kosullar: SQL[] = [eq(dugumler.sahipId, sahipId)];
	if (suzgec.tur) kosullar.push(eq(dugumler.tur, suzgec.tur));
	if (suzgec.q) {
		const desen = `%${likeKacir(suzgec.q)}%`;
		kosullar.push(or(ilike(dugumler.baslik, desen), ilike(dugumler.altBaslik, desen)) as SQL);
	}
	return db
		.select(ozetAlanlari)
		.from(dugumler)
		.where(and(...kosullar))
		.orderBy(desc(dugumler.olusturma))
		.limit(suzgec.limit ?? 200);
}

/** Bağ kurarken hedef seçimi için kullanıcının kendi düğümleri */
export async function hedefSecenekleri(sahipId: string, haricId: string) {
	return db
		.select({ id: dugumler.id, baslik: dugumler.baslik, tur: dugumler.tur })
		.from(dugumler)
		.where(and(eq(dugumler.sahipId, sahipId), sql`${dugumler.id} <> ${haricId}`))
		.orderBy(asc(dugumler.baslik))
		.limit(1000);
}

/** Düğümü getirir; izleyen göremiyorsa null (var olduğunu da belli etmemek için) */
export async function dugumGetir(id: string, izleyenId: string | null) {
	const [sonuc] = await db
		.select({
			dugum: dugumler,
			sahip: { kullaniciAdi: kullanicilar.kullaniciAdi, ad: kullanicilar.ad }
		})
		.from(dugumler)
		.innerJoin(kullanicilar, eq(dugumler.sahipId, kullanicilar.id))
		.where(and(eq(dugumler.id, id), gorunurluk(dugumler, izleyenId)));
	return sonuc ?? null;
}

export async function dugumOlustur(sahipId: string, veri: DugumVerisi & Partial<DisBilgi>) {
	const [dugum] = await db
		.insert(dugumler)
		.values({ ...veri, sahipId })
		.returning({ id: dugumler.id });
	return dugum;
}

export type DisBilgi = { disKaynak: string; disKimlik: string; gorselUrl: string | null };

export async function disKaynaktanBul(sahipId: string, disKaynak: string, disKimlik: string) {
	const [dugum] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.disKaynak, disKaynak),
				eq(dugumler.disKimlik, disKimlik)
			)
		);
	return dugum ?? null;
}

export async function dugumGuncelle(id: string, sahipId: string, veri: DugumVerisi) {
	const sonuc = await db
		.update(dugumler)
		.set({ ...veri, guncelleme: new Date() })
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId)))
		.returning({ id: dugumler.id });
	return sonuc.length > 0;
}

export async function dugumSil(id: string, sahipId: string) {
	const sonuc = await db
		.delete(dugumler)
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId)))
		.returning({ id: dugumler.id });
	return sonuc.length > 0;
}

// ——— Bağlar ———

const karsi = alias(dugumler, 'karsi');

/** Düğümün giden ("şuna götürdü") ve gelen ("buna getirdi") bağları; karşı uç görünür olmalı */
export async function dugumBaglari(dugumId: string, izleyenId: string | null) {
	const alanlar = {
		id: baglar.id,
		not: baglar.not,
		tarih: baglar.tarih,
		tarihHassasiyeti: baglar.tarihHassasiyeti,
		dugum: {
			id: karsi.id,
			baslik: karsi.baslik,
			tur: karsi.tur,
			eserTuru: karsi.eserTuru
		}
	};
	const [giden, gelen] = await Promise.all([
		db
			.select(alanlar)
			.from(baglar)
			.innerJoin(karsi, eq(baglar.hedefId, karsi.id))
			.where(and(eq(baglar.kaynakId, dugumId), gorunurluk(karsi, izleyenId)))
			.orderBy(asc(baglar.olusturma)),
		db
			.select(alanlar)
			.from(baglar)
			.innerJoin(karsi, eq(baglar.kaynakId, karsi.id))
			.where(and(eq(baglar.hedefId, dugumId), gorunurluk(karsi, izleyenId)))
			.orderBy(asc(baglar.olusturma))
	]);
	return { giden, gelen };
}

/**
 * Bu düğüme hangi yollardan gelindi? Bağları geriye doğru özyinelemeli izler.
 * Döngülere karşı geçilen düğümler dizide tutulur; görünmeyen düğümlerden geçilmez.
 */
export async function geldigiYol(dugumId: string, izleyenId: string | null, enFazlaDerinlik = 6) {
	const izleyen = izleyenId ?? '00000000-0000-0000-0000-000000000000';
	const satirlar = await db.execute<{
		id: string;
		baslik: string;
		tur: DugumTuru;
		eser_turu: EserTuru | null;
		derinlik: number;
	}>(sql`
		with recursive yol(id, derinlik, gecilen) as (
			select b.kaynak_id, 1, array[b.hedef_id, b.kaynak_id]
			from baglar b
			join dugumler d on d.id = b.kaynak_id
			where b.hedef_id = ${dugumId}
				and (d.sahip_id = ${izleyen} or d.gizlilik = 'herkes')
			union all
			select b.kaynak_id, y.derinlik + 1, y.gecilen || b.kaynak_id
			from yol y
			join baglar b on b.hedef_id = y.id
			join dugumler d on d.id = b.kaynak_id
			where y.derinlik < ${enFazlaDerinlik}
				and not b.kaynak_id = any(y.gecilen)
				and (d.sahip_id = ${izleyen} or d.gizlilik = 'herkes')
		)
		select d.id, d.baslik, d.tur, d.eser_turu, min(y.derinlik)::int as derinlik
		from yol y
		join dugumler d on d.id = y.id
		group by d.id, d.baslik, d.tur, d.eser_turu
		order by derinlik, d.baslik
		limit 50
	`);
	return [...satirlar];
}

export type BagKurmaSonucu = 'kuruldu' | 'zaten-var' | 'yetkisiz';

export async function bagKur(
	sahipId: string,
	kaynakId: string,
	veri: BagVerisi
): Promise<BagKurmaSonucu> {
	// İki uç da bu kullanıcıya ait olmalı
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				or(eq(dugumler.id, kaynakId), eq(dugumler.id, veri.hedefId))
			)
		);
	if (sayi !== 2) return 'yetkisiz';

	const eklenen = await db
		.insert(baglar)
		.values({ sahipId, kaynakId, ...veri })
		.onConflictDoNothing({ target: [baglar.kaynakId, baglar.hedefId] })
		.returning({ id: baglar.id });
	return eklenen.length ? 'kuruldu' : 'zaten-var';
}

export async function bagSil(bagId: string, sahipId: string) {
	const sonuc = await db
		.delete(baglar)
		.where(and(eq(baglar.id, bagId), eq(baglar.sahipId, sahipId)))
		.returning({ id: baglar.id });
	return sonuc.length > 0;
}

// ——— Pano ———

const kaynakD = alias(dugumler, 'kaynak');
const hedefD = alias(dugumler, 'hedef');

export async function panoVerisi(sahipId: string) {
	const [turSayilari, sonDugumler, sonBaglar, [{ bagSayisi }]] = await Promise.all([
		db
			.select({ tur: dugumler.tur, sayi: count() })
			.from(dugumler)
			.where(eq(dugumler.sahipId, sahipId))
			.groupBy(dugumler.tur),
		dugumleriListele(sahipId, { limit: 6 }),
		db
			.select({
				id: baglar.id,
				not: baglar.not,
				kaynak: { id: kaynakD.id, baslik: kaynakD.baslik, tur: kaynakD.tur },
				hedef: { id: hedefD.id, baslik: hedefD.baslik, tur: hedefD.tur }
			})
			.from(baglar)
			.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
			.innerJoin(hedefD, eq(baglar.hedefId, hedefD.id))
			.where(eq(baglar.sahipId, sahipId))
			.orderBy(desc(baglar.olusturma))
			.limit(5),
		db.select({ bagSayisi: count() }).from(baglar).where(eq(baglar.sahipId, sahipId))
	]);
	const sayilar = Object.fromEntries(turSayilari.map((s) => [s.tur, s.sayi])) as Partial<
		Record<DugumTuru, number>
	>;
	return { sayilar, sonDugumler, sonBaglar, bagSayisi };
}
