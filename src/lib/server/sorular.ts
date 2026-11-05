// Yakınlara soru: bağlantıyla, hesap açmadan yanıt. Jeton yalnızca SHA-256 özeti olarak saklanır
// (oturum jetonlarıyla aynı yöntem). Bağlantı 60 gün geçerli ve bir kez yanıtlanır. Yanıt (metin ve
// ses) sorunun sahibinin özel arşivine girer; sahibi isterse ondan özel bir anı düğümü oluşturur.
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { SORU_GECERLILIK_GUN } from '../sorular';
import { db } from './db';
import { baglar, bildirimKutusu, dugumler, kullanicilar, sesler, sorular } from './db/schema';
import { etkin } from './dugumler';
import { jetonOzeti, jetonUret } from './oturum';
import { soruSesiEkle } from './sesler';

export async function soruOlustur(
	sahipId: string,
	veri: { aliciAdi: string; metin: string; kisiId: string | null }
) {
	let kisiId: string | null = null;
	if (veri.kisiId) {
		const [k] = await db
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(
				and(
					eq(dugumler.id, veri.kisiId),
					eq(dugumler.sahipId, sahipId),
					eq(dugumler.tur, 'kisi'),
					etkin(dugumler)
				)
			);
		kisiId = k?.id ?? null;
	}
	const jeton = jetonUret();
	const [s] = await db
		.insert(sorular)
		.values({
			sahipId,
			kisiId,
			aliciAdi: veri.aliciAdi,
			metin: veri.metin,
			jetonOzeti: jetonOzeti(jeton),
			sonGecerlilik: new Date(Date.now() + SORU_GECERLILIK_GUN * 86400_000)
		})
		.returning({ id: sorular.id });
	return { id: s.id, jeton };
}

export async function sorulariListele(sahipId: string) {
	const liste = await db
		.select({
			id: sorular.id,
			aliciAdi: sorular.aliciAdi,
			metin: sorular.metin,
			kisiId: sorular.kisiId,
			yanitMetni: sorular.yanitMetni,
			yanitlanma: sorular.yanitlanma,
			sonGecerlilik: sorular.sonGecerlilik,
			aniId: sorular.aniId,
			olusturma: sorular.olusturma
		})
		.from(sorular)
		.where(eq(sorular.sahipId, sahipId))
		.orderBy(desc(sorular.olusturma))
		.limit(200);
	const sesListesi = await db
		.select({ id: sesler.id, soruId: sesler.soruId, metin: sesler.metin, durum: sesler.durum })
		.from(sesler)
		.where(eq(sesler.sahipId, sahipId));
	return liste.map((s) => ({ ...s, sesler: sesListesi.filter((x) => x.soruId === s.id) }));
}

/** Yanıt sayfası için: soruyu ve soranın adını verir (geçersiz/süresi dolmuşsa null) */
export async function jetonlaSoru(jeton: string) {
	if (!/^[A-Za-z0-9_-]{40,60}$/.test(jeton)) return null;
	const [s] = await db
		.select({
			id: sorular.id,
			sahipId: sorular.sahipId,
			aliciAdi: sorular.aliciAdi,
			metin: sorular.metin,
			yanitlanma: sorular.yanitlanma,
			soran: kullanicilar.ad
		})
		.from(sorular)
		.innerJoin(kullanicilar, eq(sorular.sahipId, kullanicilar.id))
		.where(and(eq(sorular.jetonOzeti, jetonOzeti(jeton)), gt(sorular.sonGecerlilik, new Date())));
	return s ?? null;
}

export async function yanitKaydet(
	jeton: string,
	yanit: { metin: string | null; ses: Uint8Array | null }
): Promise<'yok' | 'yanitlanmis' | 'gecersiz-ses' | 'tamam'> {
	const s = await jetonlaSoru(jeton);
	if (!s) return 'yok';
	if (s.yanitlanma) return 'yanitlanmis';
	// Aynı anda iki gönderim olursa yalnızca biri yazılır
	const guncellenen = await db
		.update(sorular)
		.set({ yanitMetni: yanit.metin, yanitlanma: new Date() })
		.where(and(eq(sorular.id, s.id), isNull(sorular.yanitlanma)))
		.returning({ id: sorular.id });
	if (!guncellenen.length) return 'yanitlanmis';
	if (yanit.ses) {
		const sonuc = await soruSesiEkle(s.sahipId, s.id, yanit.ses);
		if (sonuc === 'gecersiz') {
			// Ses okunamadıysa ve metin de yoksa yanıt geri alınır, yeniden denenebilir
			if (!yanit.metin) {
				await db
					.update(sorular)
					.set({ yanitMetni: null, yanitlanma: null })
					.where(eq(sorular.id, s.id));
			}
			return 'gecersiz-ses';
		}
	}
	await db.insert(bildirimKutusu).values({ aliciId: s.sahipId, tur: 'soru_yaniti', soruId: s.id });
	return 'tamam';
}

/**
 * Yanıttan özel bir anı düğümü oluşturur: açıklama = yazılı yanıt + sesin metni; ses anıya taşınır;
 * soru bir kişi düğümüne sorulduysa ondan anıya bağ kurulur.
 */
export async function yanittanAni(sahipId: string, soruId: string) {
	return db.transaction(async (tx) => {
		const [s] = await tx
			.select()
			.from(sorular)
			.where(and(eq(sorular.id, soruId), eq(sorular.sahipId, sahipId)))
			.for('update');
		if (!s || !s.yanitlanma) return null;
		if (s.aniId) return s.aniId;
		const sesListesi = await tx
			.select({ id: sesler.id, metin: sesler.metin })
			.from(sesler)
			.where(eq(sesler.soruId, soruId));
		const aciklama = [
			`Soru: ${s.metin}`,
			s.yanitMetni ?? '',
			...sesListesi.map((x) => x.metin ?? '')
		]
			.filter(Boolean)
			.join('\n\n')
			.slice(0, 5000);
		const baslik = `${s.aliciAdi} anlatıyor: ${s.metin}`.slice(0, 200);
		const [ani] = await tx
			.insert(dugumler)
			.values({ sahipId, tur: 'ani', baslik, aciklama, gizlilik: 'ozel' })
			.returning({ id: dugumler.id });
		if (sesListesi.length) {
			await tx.update(sesler).set({ dugumId: ani.id }).where(eq(sesler.soruId, soruId));
		}
		if (s.kisiId) {
			await tx
				.insert(baglar)
				.values({ sahipId, kaynakId: s.kisiId, hedefId: ani.id, not: 'Anlattı' })
				.onConflictDoNothing();
		}
		await tx.update(sorular).set({ aniId: ani.id }).where(eq(sorular.id, soruId));
		return ani.id;
	});
}

export async function soruSil(sahipId: string, soruId: string) {
	const s = await db
		.delete(sorular)
		.where(and(eq(sorular.id, soruId), eq(sorular.sahipId, sahipId)))
		.returning({ id: sorular.id });
	return s.length > 0;
}
