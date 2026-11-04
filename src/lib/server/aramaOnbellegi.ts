// Eser araması için veritabanı önbelleği (eserArama.ts → KaliciOnbellek). ~24 saat geçerli;
// süresi dolanlar ara ara topluca silinir.
import { lt, sql } from 'drizzle-orm';
import { db } from './db';
import { eserAramaOnbellegi } from './db/schema';
import type { EserSonucu, KaliciOnbellek } from './eserArama';

const SURE_MS = 24 * 60 * 60 * 1000;
let yazmaSayaci = 0;

export const aramaOnbellegi: KaliciOnbellek = {
	async oku(anahtar) {
		const [satir] = await db
			.select({ sonuclar: eserAramaOnbellegi.sonuclar, zaman: eserAramaOnbellegi.zaman })
			.from(eserAramaOnbellegi)
			.where(sql`${eserAramaOnbellegi.anahtar} = ${anahtar}`);
		if (!satir || Date.now() - satir.zaman.getTime() > SURE_MS) return null;
		return satir.sonuclar as EserSonucu[];
	},
	async yaz(anahtar, sonuclar) {
		await db
			.insert(eserAramaOnbellegi)
			.values({ anahtar, sonuclar, zaman: new Date() })
			.onConflictDoUpdate({
				target: eserAramaOnbellegi.anahtar,
				set: { sonuclar, zaman: new Date() }
			});
		// Her 100 yazmada bir eskileri temizle
		if (++yazmaSayaci % 100 === 0) {
			await db
				.delete(eserAramaOnbellegi)
				.where(lt(eserAramaOnbellegi.zaman, new Date(Date.now() - SURE_MS)));
		}
	}
};
