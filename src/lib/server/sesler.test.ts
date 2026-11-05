// Sesli anılar ve anlatıdan öneriler (PGlite + geçici klasör; yazıya dökme sahte işleyiciyle).
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { baglar, dugumler, grupUyeleri, gruplar, kullanicilar } = await import('./db/schema.ts');
const s = await import('./sesler.ts');
const k = await import('./yaziyaDokme.ts');
const o = await import('./oneriler.ts');

let klasor: string;
let ali: string;
let ayse: string;
let cem: string;
let ani: string;
let acikAni: string;
const id: Record<string, string> = {};

/** En küçük geçerli WebM başlığı (EBML imzası) */
const webm = () => new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(64).fill(1)]);

beforeAll(async () => {
	klasor = await mkdtemp(join(tmpdir(), 'iz-ses-'));
	s.sesKlasoruAyarla(klasor);
	const kisiler = await db
		.insert(kullanicilar)
		.values(
			['ali', 'ayse', 'cem'].map((ad) => ({
				kullaniciAdi: ad,
				eposta: `${ad}@iz.test`,
				ad,
				sifreOzeti: 'x'
			}))
		)
		.returning({ id: kullanicilar.id });
	[ali, ayse, cem] = kisiler.map((x) => x.id);
	// Ali ile Ayşe aynı grupta; Cem değil
	const [g] = await db.insert(gruplar).values({ ad: 'Aile' }).returning({ id: gruplar.id });
	await db.insert(grupUyeleri).values([
		{ grupId: g.id, kullaniciId: ali },
		{ grupId: g.id, kullaniciId: ayse }
	]);
	const d = await db
		.insert(dugumler)
		.values([
			{ sahipId: ali, tur: 'ani', baslik: 'Kuzguncuk yazı', aciklama: 'Bahçede erik vardı.' },
			{ sahipId: ali, tur: 'ani', baslik: 'Açık anı', gizlilik: 'herkes' },
			{ sahipId: ali, tur: 'yer', baslik: 'Kadıköy' },
			{ sahipId: ali, tur: 'eser', eserTuru: 'kitap', baslik: 'Kitap' }
		])
		.returning({ id: dugumler.id, baslik: dugumler.baslik });
	for (const x of d) id[x.baslik] = x.id;
	ani = id['Kuzguncuk yazı'];
	acikAni = id['Açık anı'];
});

afterAll(async () => {
	await rm(klasor, { recursive: true, force: true });
});

describe('sesli anılar', () => {
	it('türü baytlarından tanır; yalnızca sahibinin uygun düğümüne ekler', async () => {
		expect(await s.sesEkle(ali, ani, new TextEncoder().encode('ses değil, metin dosyası'))).toBe(
			'gecersiz'
		);
		expect(await s.sesEkle(ayse, ani, webm())).toBe('yetkisiz');
		expect(await s.sesEkle(ali, id['Kitap'], webm())).toBe('yetkisiz');
	});

	it('kaydı kuyruğa alır, yazıya döker; elle yazılan metnin üzerine yazmaz', async () => {
		k.kuyrukAyarla({
			isleyici: async () => ({
				metin: "1965 yazında Kadıköy'den Kuzguncuk'a taşındık. Mehmet amcanın kahvesi vardı.",
				sure: 12
			})
		});
		const sonuc = await s.sesEkle(ali, ani, webm());
		if (typeof sonuc === 'string') throw new Error(sonuc);
		await k.kuyrukBosalana();
		const [ses] = await s.sesleriListele(ani, ali);
		expect(ses).toMatchObject({ durum: 'tamam', sure: 12 });
		expect(ses.metin).toContain('Kuzguncuk');
		expect(await readdir(klasor)).toEqual([`${sonuc.id}.webm`]);

		// Elle düzeltilen metin yeniden dökmede korunur
		await s.sesMetniGuncelle(sonuc.id, ali, 'Elle düzeltilmiş metin.');
		k.kuyrukAyarla({ isleyici: async () => 'kapali' });
		const ikinci = await s.sesEkle(ali, ani, webm());
		if (typeof ikinci === 'string') throw new Error(ikinci);
		await k.kuyrukBosalana();
		const liste = await s.sesleriListele(ani, ali);
		expect(liste.map((x) => [x.durum, x.metin])).toEqual([
			['tamam', 'Elle düzeltilmiş metin.'],
			['kapali', null]
		]);
		// Araç yokken "kapalı" olan yeniden denenebilir; hata verirse "hata" olur
		k.kuyrukAyarla({
			isleyici: async () => {
				throw new Error('whisper çöktü');
			}
		});
		expect(await s.yenidenDene(ikinci.id, ali)).toBe(true);
		await k.kuyrukBosalana();
		expect((await s.sesleriListele(ani, ali))[1].durum).toBe('hata');
		expect(await s.sesSil(ikinci.id, ali)).not.toBeNull();
	});

	it('ses herkese açılmaz: yalnızca sahibi ve grup arkadaşları', async () => {
		k.kuyrukAyarla({ isleyici: async () => ({ metin: '', sure: 1 }) });
		const sonuc = await s.sesEkle(ali, acikAni, webm());
		if (typeof sonuc === 'string') throw new Error(sonuc);
		await k.kuyrukBosalana();
		expect(await s.sesleriListele(acikAni, ali)).toHaveLength(1);
		expect(await s.sesleriListele(acikAni, ayse)).toHaveLength(1);
		expect(await s.sesleriListele(acikAni, cem)).toEqual([]);
		expect(await s.sesleriListele(acikAni, null)).toEqual([]);
		expect(await s.sesDosyasi(sonuc.id, null)).toBeNull();
		expect(await s.sesDosyasi(sonuc.id, cem)).toBeNull();
		expect(await s.sesDosyasi(sonuc.id, ayse)).not.toBeNull();
		// Özel düğümdeki ses grup arkadaşına da kapalı
		const [ozel] = await s.sesleriListele(ani, ali);
		expect(await s.sesDosyasi(ozel.id, ayse)).toBeNull();
	});

	it('zaman kapsülündeki ses açılış gününe kadar sahibine de görünmez', async () => {
		await db.update(dugumler).set({ muhurTarihi: '2099-01-01' }).where(eq(dugumler.id, ani));
		expect(await s.sesleriListele(ani, ali)).toEqual([]);
		await db.update(dugumler).set({ muhurTarihi: null }).where(eq(dugumler.id, ani));
		expect((await s.sesleriListele(ani, ali)).length).toBeGreaterThan(0);
	});
});

describe('anlatıdan öneriler', () => {
	it('açıklama ve ses metninden kişi, yer ve yıl önerir; seçilenleri uygular', async () => {
		const [ses] = await s.sesleriListele(ani, ali);
		await s.sesMetniGuncelle(
			ses.id,
			ali,
			"1965 yazında Kadıköy'den Kuzguncuk'a taşındık. Mehmet amcanın kahvesi vardı."
		);
		const oneri = (await o.anlatiOnerileri(ali, ani))!;
		expect(oneri.eslesenler.map((e) => e.baslik)).toEqual(['Kadıköy']);
		expect(oneri.yeniler.map((y) => [y.ad, y.tur])).toEqual(
			expect.arrayContaining([
				['Kuzguncuk', 'yer'],
				['Mehmet amca', 'kisi']
			])
		);
		expect(oneri.yillar).toEqual([1965]);
		expect(await o.anlatiOnerileri(ayse, ani)).toBeNull();

		const sonuc = await o.onerileriUygula(ali, ani, {
			baglanacak: [id['Kadıköy'], id['Kitap'], ani],
			yeniler: [{ ad: 'Mehmet amca', tur: 'kisi' }],
			yil: 1965
		});
		expect(sonuc).toEqual({ yeni: 1, bag: 3, yil: true });
		const [d] = await db.select().from(dugumler).where(eq(dugumler.id, ani));
		expect([d.tarih, d.tarihHassasiyeti]).toEqual(['1965-01-01', 'yil']);
		const gelen = await db.select().from(baglar).where(eq(baglar.hedefId, ani));
		expect(gelen.every((b) => b.not === o.ONERI_NOTU && b.kaynakId !== ani)).toBe(true);
		// İkinci kez: bağlı olanlar işaretlenir, yeniden kurulmaz
		const tekrar = (await o.anlatiOnerileri(ali, ani))!;
		expect(tekrar.eslesenler.find((e) => e.baslik === 'Kadıköy')?.bagli).toBe(true);
		expect(tekrar.tarihVar).toBe(true);
		// Başkası uygulayamaz
		expect(
			await o.onerileriUygula(ayse, ani, { baglanacak: [], yeniler: [], yil: null })
		).toBeNull();
	});
});
