// Dijital vasiyet: kullanıcı güvendiği bir İz kullanıcısını varis seçer. Kendisi belirlediği süre
// (3/6/12/24 ay) boyunca hiç gelmezse arşivinin tamamı (özel olanlar dahil, salt okunur) varise açılır.
// Sayaç `kullanicilar.son_etkinlik`; her oturum kullanımında (en çok saatte bir) sıfırlanır.
// Erişim kuralı dugumler.ts → varisSql (gorunurluk'un içinde). Varis bekleyen vasiyeti de görür
// (kendisine güvenildiğini bilsin), ama süre dolana kadar hiçbir içeriğe erişemez.
import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { kullanicilar, vasiyetler } from './db/schema';

export const BEKLEME_AYLARI = [3, 6, 12, 24] as const;

const varis = alias(kullanicilar, 'varis');
const sahip = alias(kullanicilar, 'sahip');

export async function vasiyetGetir(sahipId: string) {
	const [v] = await db
		.select({
			beklemeAy: vasiyetler.beklemeAy,
			olusturma: vasiyetler.olusturma,
			varis: { ad: varis.ad, kullaniciAdi: varis.kullaniciAdi }
		})
		.from(vasiyetler)
		.innerJoin(varis, eq(vasiyetler.varisId, varis.id))
		.where(eq(vasiyetler.sahipId, sahipId));
	return v ?? null;
}

export async function vasiyetKaydet(
	sahipId: string,
	kullaniciAdi: string,
	beklemeAy: number
): Promise<'yok' | 'kendisi' | 'tamam'> {
	const [v] = await db
		.select({ id: kullanicilar.id })
		.from(kullanicilar)
		.where(eq(kullanicilar.kullaniciAdi, kullaniciAdi.trim().replace(/^@/, '').toLowerCase()));
	if (!v) return 'yok';
	if (v.id === sahipId) return 'kendisi';
	await db
		.insert(vasiyetler)
		.values({ sahipId, varisId: v.id, beklemeAy })
		.onConflictDoUpdate({
			target: vasiyetler.sahipId,
			set: { varisId: v.id, beklemeAy, olusturma: new Date() }
		});
	return 'tamam';
}

export async function vasiyetSil(sahipId: string) {
	await db.delete(vasiyetler).where(eq(vasiyetler.sahipId, sahipId));
}

const acikMi = sql<boolean>`${sahip.sonEtkinlik} < now() - make_interval(months => ${vasiyetler.beklemeAy})`;

/** Bu kullanıcıyı varis seçenler; süresi dolanlar açık */
export async function banaEmanetler(varisId: string) {
	return db
		.select({
			ad: sahip.ad,
			kullaniciAdi: sahip.kullaniciAdi,
			beklemeAy: vasiyetler.beklemeAy,
			acik: acikMi
		})
		.from(vasiyetler)
		.innerJoin(sahip, eq(vasiyetler.sahipId, sahip.id))
		.where(eq(vasiyetler.varisId, varisId))
		.orderBy(sahip.ad);
}

/** Süresi dolmuş bir emanetin sahibi; değilse null */
export async function acikEmanet(varisId: string, kullaniciAdi: string) {
	const [e] = await db
		.select({ sahipId: sahip.id, ad: sahip.ad, kullaniciAdi: sahip.kullaniciAdi })
		.from(vasiyetler)
		.innerJoin(sahip, eq(vasiyetler.sahipId, sahip.id))
		.where(and(eq(vasiyetler.varisId, varisId), eq(sahip.kullaniciAdi, kullaniciAdi), acikMi));
	return e ?? null;
}
