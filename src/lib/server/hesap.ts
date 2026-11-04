// Hesap ayarları ve oturum yönetimi. Şifre gerektiren her işlem önce şifreyi doğrular;
// şifre değişince diğer tüm oturumlar kapanır (çalınmış oturum varsa düşsün).
import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { db } from './db';
import { kullanicilar, oturumlar } from './db/schema';
import type { ProfilVerisi } from './dogrulama';
import { sifreDogrula, sifreOzetle } from './sifre';

export async function hesapGetir(id: string) {
	const [k] = await db
		.select({
			kullaniciAdi: kullanicilar.kullaniciAdi,
			eposta: kullanicilar.eposta,
			ad: kullanicilar.ad,
			hakkinda: kullanicilar.hakkinda,
			aramaMotorlari: kullanicilar.aramaMotorlari,
			epostaDogrulandi: kullanicilar.epostaDogrulandi,
			olusturma: kullanicilar.olusturma
		})
		.from(kullanicilar)
		.where(eq(kullanicilar.id, id));
	return k ?? null;
}

export async function profilGuncelle(id: string, veri: ProfilVerisi) {
	await db.update(kullanicilar).set(veri).where(eq(kullanicilar.id, id));
}

async function sifreDogruMu(id: string, sifre: string) {
	const [k] = await db
		.select({ sifreOzeti: kullanicilar.sifreOzeti })
		.from(kullanicilar)
		.where(eq(kullanicilar.id, id));
	return !!k && (await sifreDogrula(k.sifreOzeti, sifre));
}

/** Şifreyi değiştirir ve şu anki oturum dışındaki tüm oturumları kapatır */
export async function sifreDegistir(
	id: string,
	mevcutSifre: string,
	yeniSifre: string,
	mevcutOturumId: string | null
): Promise<'tamam' | 'yanlis'> {
	if (!(await sifreDogruMu(id, mevcutSifre))) return 'yanlis';
	const ozet = await sifreOzetle(yeniSifre);
	await db.transaction(async (tx) => {
		await tx.update(kullanicilar).set({ sifreOzeti: ozet }).where(eq(kullanicilar.id, id));
		await tx
			.delete(oturumlar)
			.where(
				mevcutOturumId
					? and(eq(oturumlar.kullaniciId, id), ne(oturumlar.id, mevcutOturumId))
					: eq(oturumlar.kullaniciId, id)
			);
	});
	return 'tamam';
}

/**
 * E-postayı değiştirir (şifreyle onaylanır). Yeni adres doğrulanmamış sayılır; doğrulama bağlantısı
 * ve eski adrese bilgi iletisi rota tarafından gönderilir.
 */
export async function epostaDegistir(
	id: string,
	sifre: string,
	yeniEposta: string
): Promise<'tamam' | 'yanlis' | 'kullaniliyor'> {
	if (!(await sifreDogruMu(id, sifre))) return 'yanlis';
	const [baskasi] = await db
		.select({ id: kullanicilar.id })
		.from(kullanicilar)
		.where(and(eq(kullanicilar.eposta, yeniEposta), ne(kullanicilar.id, id)));
	if (baskasi) return 'kullaniliyor';
	try {
		await db
			.update(kullanicilar)
			.set({ eposta: yeniEposta, epostaDogrulandi: null })
			.where(eq(kullanicilar.id, id));
	} catch (hata) {
		// Aynı anda başka bir hesap aynı adresi aldıysa tekil dizin yakalar
		const h = hata as { code?: string; cause?: { code?: string } };
		if (h?.code === '23505' || h?.cause?.code === '23505') return 'kullaniliyor';
		throw hata;
	}
	return 'tamam';
}

/** Hesabı ve tüm verisini kalıcı olarak siler (düğümler, bağlar, izler, oturumlar zincirleme) */
export async function hesabiSil(id: string, sifre: string): Promise<'tamam' | 'yanlis'> {
	if (!(await sifreDogruMu(id, sifre))) return 'yanlis';
	await db.delete(kullanicilar).where(eq(kullanicilar.id, id));
	return 'tamam';
}

// ——— Oturumlar ———

export async function oturumlariListele(kullaniciId: string, mevcutOturumId: string | null) {
	const liste = await db
		.select({
			id: oturumlar.id,
			cihaz: oturumlar.cihaz,
			olusturma: oturumlar.olusturma,
			sonKullanim: oturumlar.sonKullanim
		})
		.from(oturumlar)
		.where(and(eq(oturumlar.kullaniciId, kullaniciId), gt(oturumlar.bitis, new Date())))
		.orderBy(desc(oturumlar.sonKullanim));
	// Oturum kimliği jetonun özetidir; sayfaya yine de yalnızca kısa bir parçası gönderilir
	return liste
		.map((o) => ({ ...o, id: o.id.slice(0, 16), mevcut: o.id === mevcutOturumId }))
		.sort((a, b) => Number(b.mevcut) - Number(a.mevcut));
}

/** Kısa kimliğiyle (ilk 16 karakter) kullanıcının kendi oturumlarından birini kapatır */
export async function oturumuKapat(kullaniciId: string, kisaId: string) {
	if (!/^[0-9a-f]{16}$/.test(kisaId)) return false;
	const liste = await db
		.select({ id: oturumlar.id })
		.from(oturumlar)
		.where(eq(oturumlar.kullaniciId, kullaniciId));
	const hedef = liste.find((o) => o.id.startsWith(kisaId));
	if (!hedef) return false;
	await db.delete(oturumlar).where(eq(oturumlar.id, hedef.id));
	return true;
}

export async function digerOturumlariKapat(kullaniciId: string, mevcutOturumId: string) {
	const silinen = await db
		.delete(oturumlar)
		.where(and(eq(oturumlar.kullaniciId, kullaniciId), ne(oturumlar.id, mevcutOturumId)))
		.returning({ id: oturumlar.id });
	return silinen.length;
}
