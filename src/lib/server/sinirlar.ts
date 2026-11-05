// Kalıcı hız sınırları: denemeler PostgreSQL'de (UNLOGGED tablo) tutulur; sunucu yeniden başlasa
// ya da birden çok süreçle çalışsa da sınırlar korunur. Kayan pencere mantığı hizSiniri.ts ile aynı.
// Veritabanı hata verirse istek engellenmez (kullanılabilirlik), hata günlüğe yazılır.
import { and, asc, count, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from './db';
import { hizKayitlari } from './db/schema';

export class KaliciHizSiniri {
	constructor(
		private readonly ad: string,
		private readonly limit: number,
		private readonly pencereMs: number
	) {}

	async dene(anahtar: string): Promise<{ izin: boolean; beklemeSaniye: number }> {
		try {
			return await db.transaction(async (tx) => {
				const esik = new Date(Date.now() - this.pencereMs);
				// Aynı anahtar için eşzamanlı denemeler sıraya girsin
				await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${this.ad + ':' + anahtar}))`);
				const kosul = and(eq(hizKayitlari.ad, this.ad), eq(hizKayitlari.anahtar, anahtar));
				await tx.delete(hizKayitlari).where(and(kosul, lt(hizKayitlari.zaman, esik)));
				const [{ sayi }] = await tx
					.select({ sayi: count() })
					.from(hizKayitlari)
					.where(and(kosul, gt(hizKayitlari.zaman, esik)));
				if (sayi >= this.limit) {
					const [enEski] = await tx
						.select({ zaman: hizKayitlari.zaman })
						.from(hizKayitlari)
						.where(kosul)
						.orderBy(asc(hizKayitlari.zaman))
						.limit(1);
					const bekleme = enEski
						? Math.ceil((enEski.zaman.getTime() + this.pencereMs - Date.now()) / 1000)
						: 1;
					return { izin: false, beklemeSaniye: Math.max(1, bekleme) };
				}
				await tx.insert(hizKayitlari).values({ ad: this.ad, anahtar });
				return { izin: true, beklemeSaniye: 0 };
			});
		} catch (hata) {
			console.error('Hız sınırı denetlenemedi', hata);
			return { izin: true, beklemeSaniye: 0 };
		}
	}

	async sifirla(anahtar: string) {
		await db
			.delete(hizKayitlari)
			.where(and(eq(hizKayitlari.ad, this.ad), eq(hizKayitlari.anahtar, anahtar)))
			.catch(() => {});
	}
}

const DAKIKA = 60_000;

/** Kişi başına: aynı IP + e-posta için 15 dakikada 5 deneme */
export const girisSiniri = new KaliciHizSiniri('giris', 5, 15 * DAKIKA);
/** IP başına: 15 dakikada 30 giriş denemesi (geçiş anahtarı dahil) */
export const ipGirisSiniri = new KaliciHizSiniri('ip_giris', 30, 15 * DAKIKA);
/** IP başına: saatte 10 kayıt */
export const kayitSiniri = new KaliciHizSiniri('kayit', 10, 60 * DAKIKA);
/** Kullanıcı başına: ayarlarda şifre gerektiren işlemler 15 dakikada 10 deneme */
export const hesapSiniri = new KaliciHizSiniri('hesap', 10, 15 * DAKIKA);
/** Kullanıcı başına: saatte 5 içe aktarma */
export const iceAktarmaSiniri = new KaliciHizSiniri('ice_aktarma', 5, 60 * DAKIKA);
/** Fotoğraf yükleme: kullanıcı başına saatte 40 */
export const fotoSiniri = new KaliciHizSiniri('foto', 40, 60 * DAKIKA);
/** Ses yükleme: kullanıcı başına saatte 30 */
export const sesSiniri = new KaliciHizSiniri('ses', 30, 60 * DAKIKA);
/** Hesapsız soru yanıtı: IP başına saatte 20 */
export const yanitSiniri = new KaliciHizSiniri('yanit', 20, 60 * DAKIKA);
/** IP başına: saatte 5 şifre sıfırlama isteği */
export const sifirlamaSiniri = new KaliciHizSiniri('sifirlama', 5, 60 * DAKIKA);
/** E-posta adresi başına: saatte 3 sıfırlama iletisi */
export const sifirlamaEpostaSiniri = new KaliciHizSiniri('sifirlama_eposta', 3, 60 * DAKIKA);
/** Kullanıcı başına: saatte 3 doğrulama iletisi */
export const dogrulamaSiniri = new KaliciHizSiniri('dogrulama', 3, 60 * DAKIKA);
