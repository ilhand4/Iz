// Çöp kutusu: silinen düğüm ve izler 30 gün burada bekler, sonra kalıcı olarak silinir.
// Süresi dolanlar, sahibi çöp kutusuna ya da panoya baktığında temizlenir (zamanlanmış iş gerekmez).
import { and, count, desc, eq, isNotNull, lt } from 'drizzle-orm';
import { COP_KUTUSU_GUN } from '../sabitler';
import { db } from './db';
import { dugumler, izler } from './db/schema';

const GUN_MS = 24 * 60 * 60 * 1000;

export type CopTuru = 'dugum' | 'iz';
export type GeriYuklemeSonucu = 'geri-yuklendi' | 'bulunamadi' | 'cakisma';

function sinir() {
	return new Date(Date.now() - COP_KUTUSU_GUN * GUN_MS);
}

/** Bir öğenin kalıcı silinmesine kaç gün kaldığı */
export function kalanGun(silinme: Date, simdi: Date = new Date()): number {
	const gecen = (simdi.getTime() - silinme.getTime()) / GUN_MS;
	return Math.max(0, Math.ceil(COP_KUTUSU_GUN - gecen));
}

function benzersizlikIhlali(hata: unknown): boolean {
	const h = hata as { code?: string; cause?: { code?: string } };
	return h?.code === '23505' || h?.cause?.code === '23505';
}

export async function suresiDolanlariTemizle(sahipId: string) {
	await db
		.delete(dugumler)
		.where(and(eq(dugumler.sahipId, sahipId), lt(dugumler.silinme, sinir())));
	await db.delete(izler).where(and(eq(izler.sahipId, sahipId), lt(izler.silinme, sinir())));
}

export async function copKutusu(sahipId: string) {
	await suresiDolanlariTemizle(sahipId);
	const [silinenDugumler, silinenIzler] = await Promise.all([
		db
			.select({
				id: dugumler.id,
				baslik: dugumler.baslik,
				tur: dugumler.tur,
				eserTuru: dugumler.eserTuru,
				silinme: dugumler.silinme
			})
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), isNotNull(dugumler.silinme)))
			.orderBy(desc(dugumler.silinme)),
		db
			.select({ id: izler.id, baslik: izler.baslik, silinme: izler.silinme })
			.from(izler)
			.where(and(eq(izler.sahipId, sahipId), isNotNull(izler.silinme)))
			.orderBy(desc(izler.silinme))
	]);
	const kalan = <T extends { silinme: Date | null }>(o: T) => ({
		...o,
		kalanGun: kalanGun(o.silinme ?? new Date())
	});
	return { dugumler: silinenDugumler.map(kalan), izler: silinenIzler.map(kalan) };
}

/** Çöp kutusundaki tek bir öğenin başlığı (silme sonrası "Geri al" baloncuğu için) */
export async function copOgesi(sahipId: string, tur: CopTuru, id: string) {
	const tablo = tur === 'dugum' ? dugumler : izler;
	const [satir] = await db
		.select({ id: tablo.id, baslik: tablo.baslik })
		.from(tablo)
		.where(and(eq(tablo.id, id), eq(tablo.sahipId, sahipId), isNotNull(tablo.silinme)));
	return satir ? { tur, ...satir } : null;
}

export async function copSayisi(sahipId: string): Promise<number> {
	const [[d], [i]] = await Promise.all([
		db
			.select({ sayi: count() })
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), isNotNull(dugumler.silinme))),
		db
			.select({ sayi: count() })
			.from(izler)
			.where(and(eq(izler.sahipId, sahipId), isNotNull(izler.silinme)))
	]);
	return d.sayi + i.sayi;
}

/**
 * Öğeyi çöp kutusundan geri yükler. Aynı dış eser bu arada yeniden eklendiyse
 * (tekil dizin ihlali) 'cakisma' döner.
 */
export async function geriYukle(
	sahipId: string,
	tur: CopTuru,
	id: string
): Promise<{ sonuc: GeriYuklemeSonucu; baslik?: string }> {
	try {
		const [satir] =
			tur === 'dugum'
				? await db
						.update(dugumler)
						.set({ silinme: null })
						.where(
							and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), isNotNull(dugumler.silinme))
						)
						.returning({ baslik: dugumler.baslik })
				: await db
						.update(izler)
						.set({ silinme: null })
						.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId), isNotNull(izler.silinme)))
						.returning({ baslik: izler.baslik });
		return satir ? { sonuc: 'geri-yuklendi', baslik: satir.baslik } : { sonuc: 'bulunamadi' };
	} catch (hata) {
		if (benzersizlikIhlali(hata)) return { sonuc: 'cakisma' };
		throw hata;
	}
}

/** Çöp kutusundaki bir öğeyi hemen ve kalıcı olarak siler */
export async function kaliciSil(sahipId: string, tur: CopTuru, id: string) {
	const silinen =
		tur === 'dugum'
			? await db
					.delete(dugumler)
					.where(
						and(eq(dugumler.id, id), eq(dugumler.sahipId, sahipId), isNotNull(dugumler.silinme))
					)
					.returning({ id: dugumler.id })
			: await db
					.delete(izler)
					.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId), isNotNull(izler.silinme)))
					.returning({ id: izler.id });
	return silinen.length > 0;
}

export async function copuBosalt(sahipId: string) {
	await db.delete(dugumler).where(and(eq(dugumler.sahipId, sahipId), isNotNull(dugumler.silinme)));
	await db.delete(izler).where(and(eq(izler.sahipId, sahipId), isNotNull(izler.silinme)));
}
