import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { dev } from '$app/env';
import { db } from './db';
import { kullanicilar, oturumlar } from './db/schema';

export const OTURUM_CEREZI = 'iz_oturum';
const GUN_MS = 24 * 60 * 60 * 1000;
export const OTURUM_SURESI_MS = 30 * GUN_MS;
/** Bitişe bu kadar kala oturum kendiliğinden uzatılır */
const UZATMA_ESIGI_MS = 15 * GUN_MS;

export type OturumKullanicisi = { id: string; kullaniciAdi: string; ad: string };

/** 256 bit rastgele jeton; çereze yalnızca bu yazılır */
export function jetonUret(): string {
	return randomBytes(32).toString('base64url');
}

/** Veritabanında jetonun kendisi değil özeti tutulur: veritabanı sızarsa oturumlar çalınamaz */
export function jetonOzeti(jeton: string): string {
	return createHash('sha256').update(jeton).digest('hex');
}

export async function oturumAc(jeton: string, kullaniciId: string) {
	const oturum = {
		id: jetonOzeti(jeton),
		kullaniciId,
		bitis: new Date(Date.now() + OTURUM_SURESI_MS)
	};
	await db.insert(oturumlar).values(oturum);
	return oturum;
}

export async function oturumDogrula(jeton: string) {
	const oturumId = jetonOzeti(jeton);
	const [sonuc] = await db
		.select({
			kullanici: {
				id: kullanicilar.id,
				kullaniciAdi: kullanicilar.kullaniciAdi,
				ad: kullanicilar.ad
			},
			oturum: { id: oturumlar.id, bitis: oturumlar.bitis }
		})
		.from(oturumlar)
		.innerJoin(kullanicilar, eq(oturumlar.kullaniciId, kullanicilar.id))
		.where(eq(oturumlar.id, oturumId));

	if (!sonuc) return { oturum: null, kullanici: null };

	const { oturum, kullanici } = sonuc;
	if (Date.now() >= oturum.bitis.getTime()) {
		await db.delete(oturumlar).where(eq(oturumlar.id, oturum.id));
		return { oturum: null, kullanici: null };
	}

	if (Date.now() >= oturum.bitis.getTime() - UZATMA_ESIGI_MS) {
		oturum.bitis = new Date(Date.now() + OTURUM_SURESI_MS);
		await db.update(oturumlar).set({ bitis: oturum.bitis }).where(eq(oturumlar.id, oturum.id));
	}

	return { oturum, kullanici };
}

export async function oturumKapat(oturumId: string) {
	await db.delete(oturumlar).where(eq(oturumlar.id, oturumId));
}

export function oturumCereziYaz(cookies: Cookies, jeton: string, bitis: Date) {
	cookies.set(OTURUM_CEREZI, jeton, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: bitis
	});
}

export function oturumCereziSil(cookies: Cookies) {
	cookies.delete(OTURUM_CEREZI, { path: '/' });
}
