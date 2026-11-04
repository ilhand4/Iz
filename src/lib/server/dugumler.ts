// Düğüm ve bağ veri erişimi. Yetki kuralları burada uygulanır:
// - Okuma: sahibi her şeyi görür; başkaları yalnızca "herkes" düğümlerini.
// - Yazma: yalnızca sahibi (her sorgu sahip_id ile süzülür).
// - Çöp kutusundaki düğümler (silinme dolu) hiçbir okuma ve yazma sorgusunda görünmez.
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { DugumTuru, EserDurumu, EserTuru, Gizlilik, TarihHassasiyeti } from '../sabitler';
import { sadelestir } from '../metin';
import { buAyinTarihi } from '../tarih';
import { db } from './db';
import { agKonumlari, baglar, dugumler, kullanicilar } from './db/schema';
import type { BagBilgisi, BagVerisi, DugumVerisi, GetirenGirdisi, Konum } from './dogrulama';
import { imlecYaz, type Imlec } from './imlec';
import { likeKacir } from './yetki';

export { gorebilirMi } from './yetki';

type Islem = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Çöp kutusunda olmayan kayıtlar */
export function etkin(tablo: { silinme: AnyPgColumn }): SQL {
	return isNull(tablo.silinme);
}

/** gorebilirMi kuralının SQL karşılığı; çöp kutusundakiler kimseye görünmez */
export function gorunurluk(
	tablo: { sahipId: AnyPgColumn; gizlilik: AnyPgColumn; silinme: AnyPgColumn },
	izleyenId: string | null
): SQL {
	const herkes = eq(tablo.gizlilik, 'herkes');
	const kim = izleyenId ? (or(eq(tablo.sahipId, izleyenId), herkes) as SQL) : herkes;
	return and(kim, etkin(tablo)) as SQL;
}

/** Bu benzerliğin altındaki sonuçlar yazım hatası sayılmaz (pg_trgm word_similarity, 0–1) */
export const BENZERLIK_ESIGI = 0.45;

/**
 * Yazım hatasına dayanıklı arama: sadeleştirilmiş sorgunun her sözcüğü geçiyorsa ya da sorgu
 * metne trigram benzerliğiyle yeterince yakınsa eşleşir. Birebir eşleşenler önce, sonra
 * benzerliğe göre sıralanır. Sütun, şemadaki üretilmiş `arama_metni`dir.
 */
export function aramaKosulu(sutun: AnyPgColumn, sorgu: string) {
	const sade = sadelestir(sorgu).slice(0, 100);
	const sozcukler = sade.split(/\s+/).filter(Boolean);
	if (!sozcukler.length) return null;
	const tam = and(...sozcukler.map((s) => sql`${sutun} like ${`%${likeKacir(s)}%`}`)) as SQL;
	const benzerlik = sql`word_similarity(${sade}, ${sutun})`;
	return {
		kosul: or(tam, sql`${benzerlik} >= ${BENZERLIK_ESIGI}`) as SQL,
		sira: [sql`(${tam}) desc`, sql`${benzerlik} desc`]
	};
}

/** db.execute sonucunu satır dizisine çevirir (postgres.js dizi, PGlite { rows } döner) */
export function satirlar<T>(sonuc: unknown): T[] {
	return Array.isArray(sonuc) ? (sonuc as T[]) : ((sonuc as { rows: T[] }).rows ?? []);
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
	tarihHassasiyeti: TarihHassasiyeti | null;
	durum: EserDurumu | null;
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
	tarihHassasiyeti: dugumler.tarihHassasiyeti,
	durum: dugumler.durum
};

export async function dugumleriListele(
	sahipId: string,
	suzgec: { tur?: DugumTuru | null; q?: string; durumlar?: EserDurumu[]; limit?: number } = {}
): Promise<DugumOzeti[]> {
	const kosullar: SQL[] = [eq(dugumler.sahipId, sahipId), etkin(dugumler)];
	if (suzgec.tur) kosullar.push(eq(dugumler.tur, suzgec.tur));
	if (suzgec.durumlar?.length) kosullar.push(inArray(dugumler.durum, suzgec.durumlar));
	const arama = suzgec.q ? aramaKosulu(dugumler.aramaMetni, suzgec.q) : null;
	if (arama) kosullar.push(arama.kosul);
	return db
		.select(ozetAlanlari)
		.from(dugumler)
		.where(and(...kosullar))
		.orderBy(...(arama ? arama.sira : []), desc(dugumler.olusturma))
		.limit(suzgec.limit ?? 200);
}

export const DUGUM_SAYFA_BOYUTU = 60;

/**
 * Düğüm listesinin bir sayfası (yeniden eskiye). Aramada sonuçlar alaka sırasına göre gelir ve
 * sayfalanmaz (en alakalı 200 sonuç).
 */
export async function dugumSayfasi(
	sahipId: string,
	suzgec: { tur?: DugumTuru | null; q?: string; durumlar?: EserDurumu[] },
	imlec: Imlec | null,
	boyut = DUGUM_SAYFA_BOYUTU
): Promise<{ liste: DugumOzeti[]; sonraki: string | null }> {
	if (suzgec.q) return { liste: await dugumleriListele(sahipId, suzgec), sonraki: null };
	const kosullar: SQL[] = [eq(dugumler.sahipId, sahipId), etkin(dugumler)];
	if (suzgec.tur) kosullar.push(eq(dugumler.tur, suzgec.tur));
	if (suzgec.durumlar?.length) kosullar.push(inArray(dugumler.durum, suzgec.durumlar));
	if (imlec) {
		kosullar.push(
			sql`(${dugumler.olusturma}, ${dugumler.id}) < (${imlec.zaman}::timestamptz, ${imlec.id}::uuid)`
		);
	}
	const satirlar = await db
		.select({ ...ozetAlanlari, imlecZamani: sql<string>`${dugumler.olusturma}::text` })
		.from(dugumler)
		.where(and(...kosullar))
		.orderBy(desc(dugumler.olusturma), desc(dugumler.id))
		.limit(boyut + 1);
	const fazlasiVar = satirlar.length > boyut;
	const liste = satirlar.slice(0, boyut);
	const son = liste.at(-1);
	return {
		liste: liste.map(({ imlecZamani: _z, ...d }) => d),
		sonraki: fazlasiVar && son ? imlecYaz({ zaman: son.imlecZamani, id: son.id }) : null
	};
}

export type DugumSecenegi = {
	id: string;
	baslik: string;
	altBaslik: string | null;
	tur: DugumTuru;
};

/** Bağ kurarken ya da ize durak eklerken seçilebilecek, kullanıcının kendi düğümleri */
export async function dugumSecenekleri(
	sahipId: string,
	haricId?: string
): Promise<DugumSecenegi[]> {
	const kosullar: SQL[] = [eq(dugumler.sahipId, sahipId), etkin(dugumler)];
	if (haricId) kosullar.push(sql`${dugumler.id} <> ${haricId}`);
	return db
		.select({
			id: dugumler.id,
			baslik: dugumler.baslik,
			altBaslik: dugumler.altBaslik,
			tur: dugumler.tur
		})
		.from(dugumler)
		.where(and(...kosullar))
		.orderBy(asc(dugumler.baslik))
		.limit(2000);
}

/** Düğümü getirir; izleyen göremiyorsa null (var olduğunu da belli etmemek için) */
export async function dugumGetir(id: string, izleyenId: string | null) {
	const [sonuc] = await db
		.select({
			dugum: dugumler,
			sahip: {
				kullaniciAdi: kullanicilar.kullaniciAdi,
				ad: kullanicilar.ad,
				aramaMotorlari: kullanicilar.aramaMotorlari
			}
		})
		.from(dugumler)
		.innerJoin(kullanicilar, eq(dugumler.sahipId, kullanicilar.id))
		.where(and(eq(dugumler.id, id), gorunurluk(dugumler, izleyenId)));
	return sonuc ?? null;
}

export type DisBilgi = { disKaynak: string; disKimlik: string; gorselUrl: string | null };

export async function dugumOlustur(sahipId: string, veri: DugumVerisi & Partial<DisBilgi>) {
	const [dugum] = await db
		.insert(dugumler)
		.values({ ...veri, sahipId })
		.returning({ id: dugumler.id });
	return dugum;
}

export async function disKaynaktanBul(sahipId: string, disKaynak: string, disKimlik: string) {
	const [dugum] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.disKaynak, disKaynak),
				eq(dugumler.disKimlik, disKimlik),
				etkin(dugumler)
			)
		);
	return dugum ?? null;
}

export async function dugumGuncelle(id: string, sahipId: string, veri: DugumVerisi) {
	const sonuc = await db
		.update(dugumler)
		.set({ ...veri, guncelleme: new Date() })
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), etkin(dugumler)))
		.returning({ id: dugumler.id });
	return sonuc.length > 0;
}

/** Düğümü çöp kutusuna atar (30 gün içinde geri yüklenebilir) */
export async function dugumuCopeAt(id: string, sahipId: string) {
	const [sonuc] = await db
		.update(dugumler)
		.set({ silinme: new Date() })
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), etkin(dugumler)))
		.returning({ id: dugumler.id, baslik: dugumler.baslik });
	return sonuc ?? null;
}

/**
 * Eserin durumunu değiştirir. "Bitti" denince tarihi boşsa bu ay yazılır.
 * Eser değilse ya da düğüm bulunamazsa null döner.
 */
export async function durumGuncelle(id: string, sahipId: string, durum: EserDurumu | null) {
	const [d] = await db
		.select({ tur: dugumler.tur, eserTuru: dugumler.eserTuru, tarih: dugumler.tarih })
		.from(dugumler)
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	if (!d || d.tur !== 'eser') return null;

	const tarihEkle = durum === 'bitti' && !d.tarih ? buAyinTarihi() : null;
	await db
		.update(dugumler)
		.set({
			durum,
			guncelleme: new Date(),
			...(tarihEkle ? { tarih: tarihEkle, tarihHassasiyeti: 'ay' as const } : {})
		})
		.where(eq(dugumler.id, id));
	return { tarihEklendi: tarihEkle, eserTuru: d.eserTuru };
}

// ——— Düğümü, onu getirenle birlikte kaydetme ———

export type AnaGirdisi =
	| { kip: 'mevcut'; id: string; durum?: EserDurumu | null }
	| { kip: 'yeni'; veri: DugumVerisi & Partial<DisBilgi> };

export type KayitSonucu = {
	dugumId: string;
	/** Yeni düğüm mü oluşturuldu, yoksa haritadaki bir düğüm mü kullanıldı */
	yeniMi: boolean;
	getirenId: string | null;
	bagKuruldu: boolean;
};

async function sahibinEtkinDugumu(tx: Islem, id: string, sahipId: string) {
	const [d] = await tx
		.select({ id: dugumler.id, tur: dugumler.tur })
		.from(dugumler)
		.where(and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	return d ?? null;
}

/**
 * Düğüm ekleme akışının tamamı tek işlemde: ana düğüm (yeni ya da haritadaki), onu getiren düğüm
 * (haritadaki, yeni ya da yok) ve aralarındaki "beni buraya getirdi" bağı.
 * Seçilen düğümlerden biri kullanıcının değilse hiçbir şey yazılmaz ve 'yetkisiz' döner.
 */
export async function dugumVeGetireniKaydet(
	sahipId: string,
	ana: AnaGirdisi,
	getiren: GetirenGirdisi,
	bagNotu: string | null
): Promise<KayitSonucu | 'yetkisiz'> {
	return db.transaction(async (tx) => {
		// Önce okumalar ve yetki denetimleri; yazmalar ancak hepsi geçerse
		let anaMevcut: { id: string; tur: DugumTuru } | null = null;
		if (ana.kip === 'mevcut') {
			anaMevcut = await sahibinEtkinDugumu(tx, ana.id, sahipId);
			if (!anaMevcut) return 'yetkisiz';
		} else if (ana.veri.disKaynak && ana.veri.disKimlik) {
			// Aynı dış eser zaten haritadaysa yenisini oluşturma
			const [varolan] = await tx
				.select({ id: dugumler.id, tur: dugumler.tur })
				.from(dugumler)
				.where(
					and(
						eq(dugumler.sahipId, sahipId),
						eq(dugumler.disKaynak, ana.veri.disKaynak),
						eq(dugumler.disKimlik, ana.veri.disKimlik),
						etkin(dugumler)
					)
				);
			anaMevcut = varolan ?? null;
		}
		let getirenId: string | null = null;
		if (getiren.kip === 'mevcut') {
			const d = await sahibinEtkinDugumu(tx, getiren.id, sahipId);
			if (!d) return 'yetkisiz';
			getirenId = d.id;
		}

		let dugumId: string;
		let yeniMi = false;
		if (anaMevcut) {
			dugumId = anaMevcut.id;
			if (ana.kip === 'mevcut' && ana.durum !== undefined && anaMevcut.tur === 'eser') {
				await tx
					.update(dugumler)
					.set({ durum: ana.durum, guncelleme: new Date() })
					.where(eq(dugumler.id, dugumId));
			}
		} else if (ana.kip === 'yeni') {
			const [yeni] = await tx
				.insert(dugumler)
				.values({ ...ana.veri, sahipId })
				.returning({ id: dugumler.id });
			dugumId = yeni.id;
			yeniMi = true;
		} else {
			return 'yetkisiz';
		}

		if (getiren.kip === 'yeni') {
			const [yeni] = await tx
				.insert(dugumler)
				.values({
					sahipId,
					tur: getiren.tur,
					eserTuru: getiren.eserTuru,
					baslik: getiren.baslik,
					gizlilik: 'ozel'
				})
				.returning({ id: dugumler.id });
			getirenId = yeni.id;
		}

		let bagKuruldu = false;
		if (getirenId && getirenId !== dugumId) {
			const eklenen = await tx
				.insert(baglar)
				.values({ sahipId, kaynakId: getirenId, hedefId: dugumId, not: bagNotu })
				.onConflictDoNothing({ target: [baglar.kaynakId, baglar.hedefId] })
				.returning({ id: baglar.id });
			bagKuruldu = eklenen.length > 0;
		}
		return { dugumId, yeniMi, getirenId, bagKuruldu };
	});
}

// ——— Bağlar ———

const karsi = alias(dugumler, 'karsi');
const kaynakD = alias(dugumler, 'kaynak');
const hedefD = alias(dugumler, 'hedef');

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

// ——— Ağ ve zaman çizgisi görünümleri ———

export type HaritaDugumu = DugumOzeti & {
	yerAdi: string | null;
	/** Ağdaki kayıtlı konum (yoksa null) */
	x: number | null;
	y: number | null;
};
export type HaritaBagi = {
	id: string;
	kaynakId: string;
	hedefId: string;
	not: string | null;
};

/** Kullanıcının tüm düğümleri ve bağları: ağ ve zaman çizgisi aynı veriden çizilir */
export async function haritaVerisi(sahipId: string) {
	const [tumDugumler, tumBaglar] = await Promise.all([
		db
			.select({ ...ozetAlanlari, yerAdi: dugumler.yerAdi, x: agKonumlari.x, y: agKonumlari.y })
			.from(dugumler)
			.leftJoin(agKonumlari, eq(agKonumlari.dugumId, dugumler.id))
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
			.orderBy(asc(dugumler.tarih), asc(dugumler.baslik))
			.limit(5000),
		db
			.select({
				id: baglar.id,
				kaynakId: baglar.kaynakId,
				hedefId: baglar.hedefId,
				not: baglar.not
			})
			.from(baglar)
			.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
			.innerJoin(hedefD, eq(baglar.hedefId, hedefD.id))
			.where(and(eq(baglar.sahipId, sahipId), etkin(kaynakD), etkin(hedefD)))
			.limit(20000)
	]);
	return { dugumler: tumDugumler as HaritaDugumu[], baglar: tumBaglar as HaritaBagi[] };
}

/** Ağdaki düğüm konumlarını kaydeder; yalnızca kullanıcının kendi düğümleri yazılır */
export async function konumlariKaydet(sahipId: string, konumlar: Konum[]) {
	if (!konumlar.length) return 0;
	const sahipli = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				inArray(
					dugumler.id,
					konumlar.map((k) => k.id)
				)
			)
		);
	const izinli = new Set(sahipli.map((s) => s.id));
	const yazilacak = konumlar.filter((k) => izinli.has(k.id));
	if (!yazilacak.length) return 0;
	await db
		.insert(agKonumlari)
		.values(yazilacak.map((k) => ({ dugumId: k.id, x: k.x, y: k.y })))
		.onConflictDoUpdate({
			target: agKonumlari.dugumId,
			set: { x: sql`excluded.x`, y: sql`excluded.y`, guncelleme: new Date() }
		});
	return yazilacak.length;
}

// ——— Pano ———

export async function panoVerisi(sahipId: string) {
	const [turSayilari, sonDugumler, sonBaglar, [{ bagSayisi }]] = await Promise.all([
		db
			.select({ tur: dugumler.tur, sayi: count() })
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
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
			.where(and(eq(baglar.sahipId, sahipId), etkin(kaynakD), etkin(hedefD)))
			.orderBy(desc(baglar.olusturma))
			.limit(5),
		db
			.select({ bagSayisi: count() })
			.from(baglar)
			.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
			.innerJoin(hedefD, eq(baglar.hedefId, hedefD.id))
			.where(and(eq(baglar.sahipId, sahipId), etkin(kaynakD), etkin(hedefD)))
	]);
	const sayilar = Object.fromEntries(turSayilari.map((s) => [s.tur, s.sayi])) as Partial<
		Record<DugumTuru, number>
	>;
	return { sayilar, sonDugumler, sonBaglar, bagSayisi };
}

export type MerakOgesi = DugumOzeti & {
	/** Bu eseri sana getiren (ilk gelen bağ) */
	getiren: { id: string; baslik: string; tur: DugumTuru; not: string | null } | null;
};

/** Merak listesi: merak edilen ve sürmekte olan eserler, onları getirenle birlikte */
export async function merakListesi(sahipId: string, limit = 50): Promise<MerakOgesi[]> {
	const ogeler = await dugumleriListele(sahipId, { durumlar: ['merak', 'suruyor'], limit });
	if (!ogeler.length) return [];
	const gelenler = await db
		.select({
			hedefId: baglar.hedefId,
			not: baglar.not,
			kaynak: { id: kaynakD.id, baslik: kaynakD.baslik, tur: kaynakD.tur }
		})
		.from(baglar)
		.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
		.where(
			and(
				eq(baglar.sahipId, sahipId),
				etkin(kaynakD),
				inArray(
					baglar.hedefId,
					ogeler.map((o) => o.id)
				)
			)
		)
		.orderBy(asc(baglar.olusturma));
	const ilkGetiren = new Map<string, MerakOgesi['getiren']>();
	for (const g of gelenler) {
		if (!ilkGetiren.has(g.hedefId)) ilkGetiren.set(g.hedefId, { ...g.kaynak, not: g.not });
	}
	// Sürenler önce, sonra merak edilenler
	return ogeler
		.map((o) => ({ ...o, getiren: ilkGetiren.get(o.id) ?? null }))
		.sort((a, b) => (a.durum === b.durum ? 0 : a.durum === 'suruyor' ? -1 : 1));
}
