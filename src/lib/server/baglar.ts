// Bağ veri erişimi: "bu beni şuna götürdü". Bağlar yalnızca kişinin kendi düğümleri arasında
// kurulur; bir bağ, iki ucu da izleyene görünürse görünür. Yazma sorguları sahip_id ile süzülür.
import { and, asc, count, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { sadelestir, satirIciBaglar } from '../metin';
import type { DugumTuru, EserTuru } from '../sabitler';
import { db } from './db';
import { baglar, dugumler } from './db/schema';
import type { BagBilgisi, BagVerisi } from './dogrulama';
import { etkin, gorunurluk, satirlar } from './dugumler';

const karsi = alias(dugumler, 'karsi');

/** Düğümün giden ("şuna götürdü") ve gelen ("buna getirdi") bağları; karşı uç görünür olmalı */
export async function dugumBaglari(dugumId: string, izleyenId: string | null) {
	const alanlar = {
		id: baglar.id,
		not: baglar.not,
		tur: baglar.tur,
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

export type YolDugumu = {
	id: string;
	baslik: string;
	tur: DugumTuru;
	eser_turu: EserTuru | null;
	derinlik: number;
};

/**
 * Bağları özyinelemeli izler. "geri": bu düğüme hangi yollardan gelindi (geldiğin yol);
 * "ileri": bu düğüm nelere kapı açtı (açtığı kapılar). Döngülere karşı geçilen düğümler dizide
 * tutulur; görünmeyen ya da çöp kutusundaki düğümlerden geçilmez.
 */
export async function yolBul(
	dugumId: string,
	izleyenId: string | null,
	yon: 'geri' | 'ileri',
	{ enFazlaDerinlik = 6, enFazla = 200 } = {}
): Promise<YolDugumu[]> {
	const izleyen = izleyenId ?? '00000000-0000-0000-0000-000000000000';
	// Sütun adları sabit listeden seçilir; kullanıcı girdisi değildir
	const sonraki = sql.raw(yon === 'geri' ? 'kaynak_id' : 'hedef_id');
	const onceki = sql.raw(yon === 'geri' ? 'hedef_id' : 'kaynak_id');
	const sonuc = await db.execute(sql`
		with recursive yol(id, derinlik, gecilen) as (
			select b.${sonraki}, 1, array[b.${onceki}, b.${sonraki}]
			from baglar b
			join dugumler d on d.id = b.${sonraki}
			where b.${onceki} = ${dugumId}
				and d.silinme is null
				and (d.sahip_id = ${izleyen} or d.gizlilik = 'herkes')
			union all
			select b.${sonraki}, y.derinlik + 1, y.gecilen || b.${sonraki}
			from yol y
			join baglar b on b.${onceki} = y.id
			join dugumler d on d.id = b.${sonraki}
			where y.derinlik < ${enFazlaDerinlik}
				and not b.${sonraki} = any(y.gecilen)
				and d.silinme is null
				and (d.sahip_id = ${izleyen} or d.gizlilik = 'herkes')
		)
		select d.id, d.baslik, d.tur, d.eser_turu, min(y.derinlik)::int as derinlik
		from yol y
		join dugumler d on d.id = y.id
		group by d.id, d.baslik, d.tur, d.eser_turu
		order by derinlik, d.baslik
		limit ${enFazla}
	`);
	return satirlar<YolDugumu>(sonuc);
}

/** Bu düğüme hangi yollardan gelindi? */
export function geldigiYol(dugumId: string, izleyenId: string | null) {
	return yolBul(dugumId, izleyenId, 'geri');
}

/** Bu düğüm, bağlar üzerinden dolaylı olarak nelere kapı açtı? */
export function actigiKapilar(dugumId: string, izleyenId: string | null) {
	return yolBul(dugumId, izleyenId, 'ileri');
}

export type BagKurmaSonucu = 'kuruldu' | 'zaten-var' | 'yetkisiz';

/** İki uç da bu kullanıcıya ait ve çöp kutusu dışında olmalı; aynı yönde ikinci bağ kurulmaz */
export async function bagKur(sahipId: string, veri: BagVerisi): Promise<BagKurmaSonucu> {
	if (veri.kaynakId === veri.hedefId) return 'yetkisiz';
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				or(eq(dugumler.id, veri.kaynakId), eq(dugumler.id, veri.hedefId))
			)
		);
	if (sayi !== 2) return 'yetkisiz';

	const eklenen = await db
		.insert(baglar)
		.values({ sahipId, ...veri })
		.onConflictDoNothing({ target: [baglar.kaynakId, baglar.hedefId] })
		.returning({ id: baglar.id });
	return eklenen.length ? 'kuruldu' : 'zaten-var';
}

export async function bagGuncelle(bagId: string, sahipId: string, bilgi: BagBilgisi) {
	const sonuc = await db
		.update(baglar)
		.set(bilgi)
		.where(and(eq(baglar.id, bagId), eq(baglar.sahipId, sahipId)))
		.returning({ id: baglar.id });
	return sonuc.length > 0;
}

/** Bağı siler; "Geri al" için silinen bağın bilgisini döner */
export async function bagSil(bagId: string, sahipId: string) {
	const [silinen] = await db
		.delete(baglar)
		.where(and(eq(baglar.id, bagId), eq(baglar.sahipId, sahipId)))
		.returning({
			kaynakId: baglar.kaynakId,
			hedefId: baglar.hedefId,
			not: baglar.not,
			tarih: baglar.tarih,
			tarihHassasiyeti: baglar.tarihHassasiyeti
		});
	return silinen ?? null;
}

/**
 * Bir düğümün, bağ yönüne bakmadan en çok `derinlik` adım uzaklıktaki komşuları (kendisi dahil).
 * Büyük haritalarda ağ görünümü yalnızca bu çevreyi yükler.
 */
export async function cevreDugumleri(
	sahipId: string,
	merkezId: string,
	derinlik = 2,
	enFazla = 400
): Promise<string[]> {
	const sonuc = satirlar<{ id: string }>(
		await db.execute(sql`
			with recursive cevre(id, d) as (
				select ${merkezId}::uuid, 0
				union
				select case when b.kaynak_id = c.id then b.hedef_id else b.kaynak_id end, c.d + 1
				from cevre c
				join baglar b on (b.kaynak_id = c.id or b.hedef_id = c.id) and b.sahip_id = ${sahipId}
				where c.d < ${derinlik}
			)
			select c.id from cevre c
			join dugumler d on d.id = c.id and d.sahip_id = ${sahipId} and d.silinme is null
			group by c.id
			order by min(c.d)
			limit ${enFazla}
		`)
	);
	return sonuc.map((s) => s.id);
}

/** En çok bağı olan düğüm (büyük haritada odak verilmediyse başlangıç noktası) */
export async function enBaglisi(sahipId: string): Promise<string | null> {
	const [s] = satirlar<{ id: string }>(
		await db.execute(sql`
			select d.id from dugumler d
			left join baglar b on b.kaynak_id = d.id or b.hedef_id = d.id
			where d.sahip_id = ${sahipId} and d.silinme is null
			group by d.id order by count(b.id) desc limit 1
		`)
	);
	return s?.id ?? null;
}

/**
 * Açıklamadaki [[Başlık]] işaretleri için, bu adlardaki (sadeleştirilmiş eşleşme) kendi
 * düğümlerine "götürdü" bağı kurar. Var olan bağlar ve bulunamayan adlar sessizce atlanır.
 */
export async function satirIciBaglariKur(
	sahipId: string,
	dugumId: string,
	aciklama: string | null
) {
	const basliklar = satirIciBaglar(aciklama ?? '');
	if (!basliklar.length) return 0;
	const adaylar = await db
		.select({ id: dugumler.id, baslik: dugumler.baslik })
		.from(dugumler)
		.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	let kurulan = 0;
	for (const b of basliklar) {
		const hedef = adaylar.find((a) => a.id !== dugumId && sadelestir(a.baslik) === sadelestir(b));
		if (!hedef) continue;
		const durum = await bagKur(sahipId, {
			kaynakId: dugumId,
			hedefId: hedef.id,
			not: null,
			tarih: null,
			tarihHassasiyeti: null
		});
		if (durum === 'kuruldu') kurulan++;
	}
	return kurulan;
}
