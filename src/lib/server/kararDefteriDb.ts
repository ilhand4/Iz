// Karar Defteri veri erişimi. Defter kişiseldir: düğüm herkese açık olsa da gerekçe, güven ve
// sonuç yalnızca sahibine gösterilir. Yazma sorguları sahip_id ile süzülür.
import { and, asc, desc, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { brierPuani, kalibrasyon, type KararSonucu } from '../kararDefteri';
import { db } from './db';
import { dugumler, kararlar } from './db/schema';
import type { KararDefteriVerisi } from './dogrulama';
import { etkin } from './dugumler';

async function sahibinKarari(sahipId: string, dugumId: string) {
	const [d] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.id, dugumId),
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.tur, 'karar'),
				etkin(dugumler)
			)
		);
	return !!d;
}

export async function kararGetir(sahipId: string, dugumId: string) {
	if (!(await sahibinKarari(sahipId, dugumId))) return null;
	const [k] = await db.select().from(kararlar).where(eq(kararlar.dugumId, dugumId));
	return k ?? null;
}

export async function kararKaydet(sahipId: string, dugumId: string, veri: KararDefteriVerisi) {
	if (!(await sahibinKarari(sahipId, dugumId))) return false;
	await db
		.insert(kararlar)
		.values({ dugumId, ...veri })
		.onConflictDoUpdate({ target: kararlar.dugumId, set: { ...veri, guncelleme: new Date() } });
	return true;
}

export async function sonucKaydet(
	sahipId: string,
	dugumId: string,
	sonuc: KararSonucu,
	not: string | null
) {
	if (!(await sahibinKarari(sahipId, dugumId))) return false;
	await db
		.insert(kararlar)
		.values({ dugumId, sonuc, sonucNotu: not, sonucTarihi: new Date() })
		.onConflictDoUpdate({
			target: kararlar.dugumId,
			set: { sonuc, sonucNotu: not, sonucTarihi: new Date(), guncelleme: new Date() }
		});
	return true;
}

function istanbulBugun(simdi = new Date()) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(simdi);
}

/** Sonucunu sorma zamanı gelmiş, henüz sonuçlanmamış kararlar */
export async function zamaniGelenKararlar(sahipId: string, simdi = new Date()) {
	return db
		.select({
			dugumId: kararlar.dugumId,
			baslik: dugumler.baslik,
			sorulacak: kararlar.sorulacak,
			beklenti: kararlar.beklenti,
			guven: kararlar.guven
		})
		.from(kararlar)
		.innerJoin(dugumler, eq(kararlar.dugumId, dugumler.id))
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				isNull(kararlar.sonuc),
				isNotNull(kararlar.sorulacak),
				lte(kararlar.sorulacak, istanbulBugun(simdi))
			)
		)
		.orderBy(asc(kararlar.sorulacak))
		.limit(20);
}

export async function zamaniGelenSayisi(sahipId: string, simdi = new Date()) {
	const [{ sayi }] = await db
		.select({ sayi: sql<number>`count(*)::int` })
		.from(kararlar)
		.innerJoin(dugumler, eq(kararlar.dugumId, dugumler.id))
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				isNull(kararlar.sonuc),
				lte(kararlar.sorulacak, istanbulBugun(simdi))
			)
		);
	return sayi;
}

/** Kullanıcının tüm karar düğümleri, defter bilgileriyle (sonuçlanmamışlar önce) */
export async function kararListesi(sahipId: string) {
	const liste = await db
		.select({
			dugumId: dugumler.id,
			baslik: dugumler.baslik,
			tarih: dugumler.tarih,
			tarihHassasiyeti: dugumler.tarihHassasiyeti,
			beklenti: kararlar.beklenti,
			guven: kararlar.guven,
			sorulacak: kararlar.sorulacak,
			sonuc: kararlar.sonuc,
			sonucNotu: kararlar.sonucNotu
		})
		.from(dugumler)
		.leftJoin(kararlar, eq(kararlar.dugumId, dugumler.id))
		.where(and(eq(dugumler.sahipId, sahipId), eq(dugumler.tur, 'karar'), etkin(dugumler)))
		.orderBy(desc(dugumler.tarih))
		.limit(500);
	const sonuclanan = liste
		.filter((k) => k.sonuc && k.guven !== null)
		.map((k) => ({ guven: k.guven!, sonuc: k.sonuc as KararSonucu }));
	return {
		liste,
		dilimler: kalibrasyon(sonuclanan),
		brier: brierPuani(sonuclanan),
		sonuclananSayisi: sonuclanan.length
	};
}
