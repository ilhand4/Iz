// Şifre sıfırlama ve e-posta doğrulama bağlantıları (PGlite üzerinde).
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});
vi.spyOn(console, 'info').mockImplementation(() => {});

const { db } = await import('./db/index.ts');
const { epostaJetonlari, kullanicilar, oturumlar } = await import('./db/schema.ts');
const jetonlar = await import('./epostaJetonu.ts');
const { sonIletiler } = await import('./posta.ts');
const { sifreDogrula, sifreOzetle } = await import('./sifre.ts');

const KOKEN = 'http://localhost:4173';
let ali: string;

/** Son iletideki bağlantıdan jetonu çıkarır */
function sonJeton() {
	const m = /jeton=([A-Za-z0-9_-]{43})/.exec(sonIletiler.at(-1)?.metin ?? '');
	if (!m) throw new Error('iletide jeton yok');
	return m[1];
}

beforeAll(async () => {
	const [k] = await db
		.insert(kullanicilar)
		.values({
			kullaniciAdi: 'ali',
			eposta: 'ali@iz.test',
			ad: 'Ali',
			sifreOzeti: await sifreOzetle('eski-sifre-123')
		})
		.returning({ id: kullanicilar.id });
	ali = k.id;
});

describe('şifre sıfırlama', () => {
	it('kayıtlı olmayan adrese ileti gitmez (yanıt yine aynıdır)', async () => {
		const once = sonIletiler.length;
		await jetonlar.sifirlamaGonder('yok@iz.test', KOKEN);
		expect(sonIletiler.length).toBe(once);
	});

	it('bağlantı tek kullanımlıktır, şifreyi değiştirir ve tüm oturumları kapatır', async () => {
		await db
			.insert(oturumlar)
			.values({ id: 'x'.repeat(64), kullaniciId: ali, bitis: new Date(Date.now() + 1e8) });
		await jetonlar.sifirlamaGonder('ali@iz.test', KOKEN);
		const ileti = sonIletiler.at(-1)!;
		expect(ileti.kime).toBe('ali@iz.test');
		expect(ileti.metin).toContain(`${KOKEN}/sifre-sifirla?jeton=`);
		const jeton = sonJeton();

		// Veritabanında jetonun kendisi değil özeti durur
		const satirlar = await db.select().from(epostaJetonlari);
		expect(satirlar.map((s) => s.id)).not.toContain(jeton);

		expect(await jetonlar.jetonCoz(jeton, 'eposta_dogrulama')).toBeNull();
		expect(await jetonlar.jetonCoz(jeton, 'sifre_sifirlama')).toMatchObject({ kullaniciId: ali });
		expect(await jetonlar.sifreyiSifirla(jeton, 'yeni-sifre-456')).toBe(true);
		expect(await jetonlar.sifreyiSifirla(jeton, 'baska-sifre-789')).toBe(false);

		const [k] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, ali));
		expect(await sifreDogrula(k.sifreOzeti, 'yeni-sifre-456')).toBe(true);
		expect(await db.select().from(oturumlar)).toHaveLength(0);
	});

	it('yeni bağlantı eskisini geçersiz kılar; süresi dolan bağlantı çalışmaz', async () => {
		await jetonlar.sifirlamaGonder('ali@iz.test', KOKEN);
		const eski = sonJeton();
		await jetonlar.sifirlamaGonder('ali@iz.test', KOKEN);
		const yeni = sonJeton();
		expect(await jetonlar.jetonCoz(eski, 'sifre_sifirlama')).toBeNull();
		expect(await jetonlar.jetonCoz(yeni, 'sifre_sifirlama')).not.toBeNull();

		await db.update(epostaJetonlari).set({ bitis: new Date(Date.now() - 1000) });
		expect(await jetonlar.jetonCoz(yeni, 'sifre_sifirlama')).toBeNull();
		expect(await jetonlar.jetonCoz('kisa', 'sifre_sifirlama')).toBeNull();
	});
});

describe('e-posta doğrulama', () => {
	it('bağlantı adresi doğrular; adres değiştiyse eski bağlantı geçmez', async () => {
		await jetonlar.dogrulamaGonder(ali, KOKEN);
		const jeton = sonJeton();
		expect(await jetonlar.epostayiDogrula(jeton)).toBe('ali@iz.test');
		expect(await jetonlar.epostayiDogrula(jeton)).toBeNull();
		const [k] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, ali));
		expect(k.epostaDogrulandi).toBeInstanceOf(Date);

		await jetonlar.dogrulamaGonder(ali, KOKEN);
		const ikinci = sonJeton();
		await db
			.update(kullanicilar)
			.set({ eposta: 'ali.yeni@iz.test' })
			.where(eq(kullanicilar.id, ali));
		expect(await jetonlar.epostayiDogrula(ikinci)).toBeNull();
	});
});
