// Geçiş anahtarları (passkey / WebAuthn) ile şifresiz giriş. @simplewebauthn/server doğrular;
// meydan okumalar (challenge) tek süreçli bellekte, kısa ömürlü ve tek kullanımlıktır (çerezdeki
// rastgele kimlikle eşlenir). Çok sunuculu yayında PostgreSQL'e taşınır (hız sınırıyla birlikte).
import { randomBytes } from 'node:crypto';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransport,
	RegistrationResponseJSON
} from '@simplewebauthn/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import { gecisAnahtarlari, kullanicilar } from './db/schema';

export const MEYDAN_CEREZI = 'iz_meydan';
const MEYDAN_SURESI_MS = 5 * 60 * 1000;
const RP_ADI = 'İz';

type Meydan = { deger: string; kullaniciId: string | null; bitis: number };
const meydanlar = new Map<string, Meydan>();

function meydanSakla(deger: string, kullaniciId: string | null) {
	const simdi = Date.now();
	// Bellek şişmesin: süresi dolanları at
	if (meydanlar.size > 1000) {
		for (const [k, m] of meydanlar) if (m.bitis < simdi) meydanlar.delete(k);
	}
	const kimlik = randomBytes(24).toString('base64url');
	meydanlar.set(kimlik, { deger, kullaniciId, bitis: simdi + MEYDAN_SURESI_MS });
	return kimlik;
}

/** Meydan okumayı alır ve hemen siler (tek kullanımlık) */
function meydanAl(kimlik: string | undefined, kullaniciId: string | null) {
	if (!kimlik) return null;
	const m = meydanlar.get(kimlik);
	meydanlar.delete(kimlik);
	if (!m || m.bitis < Date.now() || m.kullaniciId !== kullaniciId) return null;
	return m.deger;
}

const aktarimlariAyir = (a: string | null) =>
	(a ? a.split(',') : undefined) as AuthenticatorTransport[] | undefined;

export async function anahtarlariListele(kullaniciId: string) {
	return db
		.select({
			id: gecisAnahtarlari.id,
			ad: gecisAnahtarlari.ad,
			olusturma: gecisAnahtarlari.olusturma,
			sonKullanim: gecisAnahtarlari.sonKullanim
		})
		.from(gecisAnahtarlari)
		.where(eq(gecisAnahtarlari.kullaniciId, kullaniciId))
		.orderBy(asc(gecisAnahtarlari.olusturma));
}

export async function anahtarSil(kullaniciId: string, id: string) {
	const silinen = await db
		.delete(gecisAnahtarlari)
		.where(and(eq(gecisAnahtarlari.id, id), eq(gecisAnahtarlari.kullaniciId, kullaniciId)))
		.returning({ id: gecisAnahtarlari.id });
	return silinen.length > 0;
}

// ——— Kayıt ———

export async function kayitSecenekleri(kullaniciId: string, rpID: string) {
	const [k] = await db
		.select({ kullaniciAdi: kullanicilar.kullaniciAdi, ad: kullanicilar.ad })
		.from(kullanicilar)
		.where(eq(kullanicilar.id, kullaniciId));
	const mevcut = await db
		.select({ id: gecisAnahtarlari.id, aktarimlar: gecisAnahtarlari.aktarimlar })
		.from(gecisAnahtarlari)
		.where(eq(gecisAnahtarlari.kullaniciId, kullaniciId));
	const secenekler = await generateRegistrationOptions({
		rpName: RP_ADI,
		rpID,
		userName: k.kullaniciAdi,
		userDisplayName: k.ad,
		userID: new TextEncoder().encode(kullaniciId),
		attestationType: 'none',
		excludeCredentials: mevcut.map((m) => ({
			id: m.id,
			transports: aktarimlariAyir(m.aktarimlar)
		})),
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
	});
	return { secenekler, meydanKimligi: meydanSakla(secenekler.challenge, kullaniciId) };
}

export async function kayitDogrula(
	kullaniciId: string,
	yanit: RegistrationResponseJSON,
	meydanKimligi: string | undefined,
	beklenen: { koken: string; rpID: string },
	ad: string
): Promise<boolean> {
	const meydan = meydanAl(meydanKimligi, kullaniciId);
	if (!meydan) return false;
	let sonuc;
	try {
		sonuc = await verifyRegistrationResponse({
			response: yanit,
			expectedChallenge: meydan,
			expectedOrigin: beklenen.koken,
			expectedRPID: beklenen.rpID,
			requireUserVerification: false
		});
	} catch {
		return false;
	}
	if (!sonuc.verified || !sonuc.registrationInfo) return false;
	const { credential } = sonuc.registrationInfo;
	await db
		.insert(gecisAnahtarlari)
		.values({
			id: credential.id,
			kullaniciId,
			acikAnahtar: Buffer.from(credential.publicKey).toString('base64url'),
			sayac: credential.counter,
			aktarimlar: credential.transports?.join(',') ?? null,
			ad: ad.slice(0, 80) || 'Geçiş anahtarı'
		})
		.onConflictDoNothing();
	return true;
}

// ——— Giriş ———

export async function girisSecenekleri(rpID: string) {
	// Keşfedilebilir kimlik bilgisi: kullanıcı adı sorulmaz, tarayıcı anahtarları listeler
	const secenekler = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
	return { secenekler, meydanKimligi: meydanSakla(secenekler.challenge, null) };
}

/** Doğrulanırsa kullanıcının kimliğini döner */
export async function girisDogrula(
	yanit: AuthenticationResponseJSON,
	meydanKimligi: string | undefined,
	beklenen: { koken: string; rpID: string }
): Promise<string | null> {
	const meydan = meydanAl(meydanKimligi, null);
	if (!meydan || typeof yanit?.id !== 'string') return null;
	const [anahtar] = await db
		.select()
		.from(gecisAnahtarlari)
		.where(eq(gecisAnahtarlari.id, yanit.id));
	if (!anahtar) return null;
	let sonuc;
	try {
		sonuc = await verifyAuthenticationResponse({
			response: yanit,
			expectedChallenge: meydan,
			expectedOrigin: beklenen.koken,
			expectedRPID: beklenen.rpID,
			requireUserVerification: false,
			credential: {
				id: anahtar.id,
				publicKey: new Uint8Array(Buffer.from(anahtar.acikAnahtar, 'base64url')),
				counter: anahtar.sayac,
				transports: aktarimlariAyir(anahtar.aktarimlar)
			}
		});
	} catch {
		return null;
	}
	if (!sonuc.verified) return null;
	await db
		.update(gecisAnahtarlari)
		.set({ sayac: sonuc.authenticationInfo.newCounter, sonKullanim: new Date() })
		.where(eq(gecisAnahtarlari.id, anahtar.id));
	return anahtar.kullaniciId;
}
