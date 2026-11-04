// Tek kullanımlık e-posta bağlantıları: şifre sıfırlama (1 saat) ve e-posta doğrulama (3 gün).
// Veritabanında jetonun yalnızca SHA-256 özeti tutulur. Yeni jeton aynı amaçlı eskilerini geçersiz kılar.
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from './db';
import { epostaJetonlari, kullanicilar, oturumlar } from './db/schema';
import { jetonOzeti, jetonUret } from './oturum';
import { epostaGonder } from './posta';
import { sifreOzetle } from './sifre';

export type JetonAmaci = 'sifre_sifirlama' | 'eposta_dogrulama';

const SURE_MS: Record<JetonAmaci, number> = {
	sifre_sifirlama: 60 * 60 * 1000,
	eposta_dogrulama: 3 * 24 * 60 * 60 * 1000
};

async function jetonOlustur(kullaniciId: string, amac: JetonAmaci, eposta: string) {
	const jeton = jetonUret();
	await db.transaction(async (tx) => {
		await tx
			.delete(epostaJetonlari)
			.where(and(eq(epostaJetonlari.kullaniciId, kullaniciId), eq(epostaJetonlari.amac, amac)));
		await tx.insert(epostaJetonlari).values({
			id: jetonOzeti(jeton),
			kullaniciId,
			amac,
			eposta,
			bitis: new Date(Date.now() + SURE_MS[amac])
		});
	});
	return jeton;
}

/** Geçerli (süresi dolmamış, kullanılmamış, adresi hâlâ hesabınki olan) jetonun sahibi */
export async function jetonCoz(jeton: string, amac: JetonAmaci) {
	if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return null;
	const [satir] = await db
		.select({
			id: epostaJetonlari.id,
			kullaniciId: epostaJetonlari.kullaniciId,
			eposta: epostaJetonlari.eposta,
			hesapEpostasi: kullanicilar.eposta
		})
		.from(epostaJetonlari)
		.innerJoin(kullanicilar, eq(epostaJetonlari.kullaniciId, kullanicilar.id))
		.where(
			and(
				eq(epostaJetonlari.id, jetonOzeti(jeton)),
				eq(epostaJetonlari.amac, amac),
				gt(epostaJetonlari.bitis, new Date()),
				isNull(epostaJetonlari.kullanildi)
			)
		);
	if (!satir || satir.eposta !== satir.hesapEpostasi) return null;
	return satir;
}

/**
 * Şifre sıfırlama bağlantısı gönderir. Adres kayıtlı değilse sessizce hiçbir şey yapmaz:
 * yanıt her durumda aynıdır (hesap varlığı anlaşılmasın).
 */
export async function sifirlamaGonder(eposta: string, koken: string) {
	const [k] = await db
		.select({ id: kullanicilar.id, ad: kullanicilar.ad })
		.from(kullanicilar)
		.where(eq(kullanicilar.eposta, eposta));
	if (!k) return;
	const jeton = await jetonOlustur(k.id, 'sifre_sifirlama', eposta);
	await epostaGonder({
		kime: eposta,
		konu: 'İz: şifre sıfırlama',
		metin: [
			`Merhaba ${k.ad},`,
			'',
			'Şifreni sıfırlamak için aşağıdaki bağlantıyı aç. Bağlantı bir saat geçerli ve tek kullanımlık.',
			`${koken}/sifre-sifirla?jeton=${jeton}`,
			'',
			'Bu isteği sen yapmadıysan bu iletiyi yok sayabilirsin; şifren değişmez.'
		].join('\n')
	});
}

/** Şifreyi jetonla değiştirir; jeton kullanılmış sayılır ve tüm oturumlar kapanır */
export async function sifreyiSifirla(jeton: string, yeniSifre: string): Promise<boolean> {
	const kayit = await jetonCoz(jeton, 'sifre_sifirlama');
	if (!kayit) return false;
	const ozet = await sifreOzetle(yeniSifre);
	return db.transaction(async (tx) => {
		// Aynı jetonla eşzamanlı iki istekten yalnızca biri geçsin
		const isaretlenen = await tx
			.update(epostaJetonlari)
			.set({ kullanildi: new Date() })
			.where(and(eq(epostaJetonlari.id, kayit.id), isNull(epostaJetonlari.kullanildi)))
			.returning({ id: epostaJetonlari.id });
		if (!isaretlenen.length) return false;
		await tx
			.update(kullanicilar)
			.set({ sifreOzeti: ozet, epostaDogrulandi: new Date() })
			.where(eq(kullanicilar.id, kayit.kullaniciId));
		await tx.delete(oturumlar).where(eq(oturumlar.kullaniciId, kayit.kullaniciId));
		return true;
	});
}

/** E-posta doğrulama bağlantısı gönderir (kayıtta, e-posta değişince ya da istenince) */
export async function dogrulamaGonder(kullaniciId: string, koken: string) {
	const [k] = await db
		.select({ ad: kullanicilar.ad, eposta: kullanicilar.eposta })
		.from(kullanicilar)
		.where(eq(kullanicilar.id, kullaniciId));
	if (!k) return;
	const jeton = await jetonOlustur(kullaniciId, 'eposta_dogrulama', k.eposta);
	await epostaGonder({
		kime: k.eposta,
		konu: 'İz: e-posta adresini doğrula',
		metin: [
			`Merhaba ${k.ad},`,
			'',
			'Bu adresin sana ait olduğunu doğrulamak için bağlantıyı aç (3 gün geçerli):',
			`${koken}/eposta-dogrula?jeton=${jeton}`
		].join('\n')
	});
}

/** Doğrulama jetonunu kullanır; başarılıysa doğrulanan adresi döner */
export async function epostayiDogrula(jeton: string): Promise<string | null> {
	const kayit = await jetonCoz(jeton, 'eposta_dogrulama');
	if (!kayit) return null;
	await db.transaction(async (tx) => {
		await tx
			.update(epostaJetonlari)
			.set({ kullanildi: new Date() })
			.where(eq(epostaJetonlari.id, kayit.id));
		await tx
			.update(kullanicilar)
			.set({ epostaDogrulandi: new Date() })
			.where(eq(kullanicilar.id, kayit.kullaniciId));
	});
	return kayit.eposta;
}

/** E-posta değiştirildiğinde eski adrese bilgi iletisi */
export async function epostaDegistiBildir(eskiEposta: string, yeniEposta: string) {
	await epostaGonder({
		kime: eskiEposta,
		konu: 'İz: e-posta adresin değiştirildi',
		metin: [
			`İz hesabının e-posta adresi ${yeniEposta} olarak değiştirildi.`,
			'Bu değişikliği sen yapmadıysan hemen şifreni sıfırla ve bize yaz.'
		].join('\n')
	});
}
