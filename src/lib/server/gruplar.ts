// Gruplar: aile, arkadaşlar, kitap kulübü. Üyeler birbirlerinin "grup" gizliliğindeki içeriğini
// görür ve grubun ortak izlerine kendi düğümlerinden durak ekleyebilir.
// Davet bir bağlantıyla yapılır (e-posta gerekmez): 7 gün geçerli, yönetici yeniler ya da kapatır.
import { and, asc, count, eq, gt, isNotNull, ne } from 'drizzle-orm';
import { db } from './db';
import { grupUyeleri, gruplar, izler, kullanicilar } from './db/schema';
import { etkin } from './dugumler';
import { izleriListele } from './izler';
import { jetonOzeti, jetonUret } from './oturum';

const DAVET_SURESI_MS = 7 * 24 * 60 * 60 * 1000;

export type Rol = 'yonetici' | 'uye';

export async function grupOlustur(
	kullaniciId: string,
	veri: { ad: string; aciklama: string | null }
) {
	return db.transaction(async (tx) => {
		const [g] = await tx.insert(gruplar).values(veri).returning({ id: gruplar.id });
		await tx.insert(grupUyeleri).values({ grupId: g.id, kullaniciId, rol: 'yonetici' });
		return g.id;
	});
}

export async function gruplarim(kullaniciId: string) {
	const benim = await db
		.select({ id: gruplar.id, ad: gruplar.ad, aciklama: gruplar.aciklama, rol: grupUyeleri.rol })
		.from(grupUyeleri)
		.innerJoin(gruplar, eq(grupUyeleri.grupId, gruplar.id))
		.where(eq(grupUyeleri.kullaniciId, kullaniciId))
		.orderBy(asc(gruplar.ad));
	if (!benim.length) return [];
	const sayilar = await db
		.select({ grupId: grupUyeleri.grupId, sayi: count() })
		.from(grupUyeleri)
		.groupBy(grupUyeleri.grupId);
	const sayi = new Map(sayilar.map((s) => [s.grupId, s.sayi]));
	return benim.map((g) => ({ ...g, rol: g.rol as Rol, uyeSayisi: sayi.get(g.id) ?? 1 }));
}

async function rolu(grupId: string, kullaniciId: string): Promise<Rol | null> {
	const [u] = await db
		.select({ rol: grupUyeleri.rol })
		.from(grupUyeleri)
		.where(and(eq(grupUyeleri.grupId, grupId), eq(grupUyeleri.kullaniciId, kullaniciId)));
	return (u?.rol as Rol | undefined) ?? null;
}

/** Grubun ayrıntısı; yalnızca üyeler görebilir (değilse null → 404) */
export async function grupGetir(grupId: string, kullaniciId: string) {
	const benimRolum = await rolu(grupId, kullaniciId);
	if (!benimRolum) return null;
	const [g] = await db
		.select({
			id: gruplar.id,
			ad: gruplar.ad,
			aciklama: gruplar.aciklama,
			davetBitis: gruplar.davetBitis,
			olusturma: gruplar.olusturma
		})
		.from(gruplar)
		.where(eq(gruplar.id, grupId));
	if (!g) return null;
	const uyeler = await db
		.select({
			id: kullanicilar.id,
			ad: kullanicilar.ad,
			kullaniciAdi: kullanicilar.kullaniciAdi,
			rol: grupUyeleri.rol,
			katilma: grupUyeleri.katilma
		})
		.from(grupUyeleri)
		.innerJoin(kullanicilar, eq(grupUyeleri.kullaniciId, kullanicilar.id))
		.where(eq(grupUyeleri.grupId, grupId))
		.orderBy(asc(grupUyeleri.katilma));
	const davetAcik = !!g.davetBitis && g.davetBitis.getTime() > Date.now();
	return {
		grup: { ...g, davetAcik },
		uyeler: uyeler.map((u) => ({ ...u, rol: u.rol as Rol, ben: u.id === kullaniciId })),
		rolum: benimRolum
	};
}

/** Grubun (çöpte olmayan) ortak izleri, üyenin gördüğü hâliyle */
export async function ortakIzler(grupId: string, kullaniciId: string) {
	const idler = await db
		.select({ id: izler.id })
		.from(izler)
		.where(and(eq(izler.ortakGrupId, grupId), etkin(izler)));
	return izleriListele(null, { izleyenId: kullaniciId, idler: idler.map((i) => i.id) });
}

/** Grup arkadaşlarının, kullanıcının üye olduğu gruplarla ortak izleri (izler sayfası için) */
export async function gruplarimdakiOrtakIzler(kullaniciId: string) {
	const idler = await db
		.select({ id: izler.id })
		.from(izler)
		.innerJoin(grupUyeleri, eq(grupUyeleri.grupId, izler.ortakGrupId))
		.where(
			and(
				eq(grupUyeleri.kullaniciId, kullaniciId),
				ne(izler.sahipId, kullaniciId),
				isNotNull(izler.ortakGrupId),
				etkin(izler)
			)
		);
	return izleriListele(null, { izleyenId: kullaniciId, idler: idler.map((i) => i.id), limit: 50 });
}

export async function grupGuncelle(
	grupId: string,
	kullaniciId: string,
	veri: { ad: string; aciklama: string | null }
) {
	if ((await rolu(grupId, kullaniciId)) !== 'yonetici') return false;
	await db.update(gruplar).set(veri).where(eq(gruplar.id, grupId));
	return true;
}

/** Yeni davet bağlantısı üretir (eskisi geçersiz olur); jetonu yalnızca bir kez döner */
export async function davetYenile(grupId: string, kullaniciId: string) {
	if ((await rolu(grupId, kullaniciId)) !== 'yonetici') return null;
	const jeton = jetonUret();
	await db
		.update(gruplar)
		.set({ davetOzeti: jetonOzeti(jeton), davetBitis: new Date(Date.now() + DAVET_SURESI_MS) })
		.where(eq(gruplar.id, grupId));
	return jeton;
}

export async function davetKapat(grupId: string, kullaniciId: string) {
	if ((await rolu(grupId, kullaniciId)) !== 'yonetici') return false;
	await db
		.update(gruplar)
		.set({ davetOzeti: null, davetBitis: null })
		.where(eq(gruplar.id, grupId));
	return true;
}

/** Davet jetonunun grubu (geçerliyse) */
export async function davetCoz(jeton: string) {
	if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return null;
	const [g] = await db
		.select({ id: gruplar.id, ad: gruplar.ad, aciklama: gruplar.aciklama })
		.from(gruplar)
		.where(and(eq(gruplar.davetOzeti, jetonOzeti(jeton)), gt(gruplar.davetBitis, new Date())));
	if (!g) return null;
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(grupUyeleri)
		.where(eq(grupUyeleri.grupId, g.id));
	return { ...g, uyeSayisi: sayi };
}

export async function davetleKatil(jeton: string, kullaniciId: string) {
	const g = await davetCoz(jeton);
	if (!g) return null;
	await db
		.insert(grupUyeleri)
		.values({ grupId: g.id, kullaniciId, rol: 'uye' })
		.onConflictDoNothing();
	return g.id;
}

/** Yönetici bir üyeyi çıkarır (kendini değil; ayrılmak için gruptanAyril) */
export async function uyeCikar(grupId: string, yoneticiId: string, uyeId: string) {
	if (uyeId === yoneticiId || (await rolu(grupId, yoneticiId)) !== 'yonetici') return false;
	const silinen = await db
		.delete(grupUyeleri)
		.where(and(eq(grupUyeleri.grupId, grupId), eq(grupUyeleri.kullaniciId, uyeId)))
		.returning({ k: grupUyeleri.kullaniciId });
	return silinen.length > 0;
}

export async function yoneticiYap(grupId: string, yoneticiId: string, uyeId: string) {
	if ((await rolu(grupId, yoneticiId)) !== 'yonetici') return false;
	const guncel = await db
		.update(grupUyeleri)
		.set({ rol: 'yonetici' })
		.where(and(eq(grupUyeleri.grupId, grupId), eq(grupUyeleri.kullaniciId, uyeId)))
		.returning({ k: grupUyeleri.kullaniciId });
	return guncel.length > 0;
}

/**
 * Gruptan ayrılır. Son yönetici ayrılırsa en eski üye yönetici olur; son üye ayrılırsa grup
 * silinir (ortak izler sahiplerinde kalır, yalnızca ortaklıkları kalkar).
 */
export async function gruptanAyril(grupId: string, kullaniciId: string) {
	return db.transaction(async (tx) => {
		const silinen = await tx
			.delete(grupUyeleri)
			.where(and(eq(grupUyeleri.grupId, grupId), eq(grupUyeleri.kullaniciId, kullaniciId)))
			.returning({ rol: grupUyeleri.rol });
		if (!silinen.length) return false;
		const kalanlar = await tx
			.select({ kullaniciId: grupUyeleri.kullaniciId, rol: grupUyeleri.rol })
			.from(grupUyeleri)
			.where(eq(grupUyeleri.grupId, grupId))
			.orderBy(asc(grupUyeleri.katilma));
		if (!kalanlar.length) {
			await tx.delete(gruplar).where(eq(gruplar.id, grupId));
		} else if (!kalanlar.some((k) => k.rol === 'yonetici')) {
			await tx
				.update(grupUyeleri)
				.set({ rol: 'yonetici' })
				.where(
					and(eq(grupUyeleri.grupId, grupId), eq(grupUyeleri.kullaniciId, kalanlar[0].kullaniciId))
				);
		}
		return true;
	});
}

export async function grupSil(grupId: string, kullaniciId: string) {
	if ((await rolu(grupId, kullaniciId)) !== 'yonetici') return false;
	await db.delete(gruplar).where(eq(gruplar.id, grupId));
	return true;
}

/** Kullanıcı bu grubun üyesi mi? (ortak iz seçimi doğrulaması için) */
export async function uyeMi(grupId: string, kullaniciId: string) {
	return (await rolu(grupId, kullaniciId)) !== null;
}
