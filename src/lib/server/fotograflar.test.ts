// Fotoğraf katmanı (PGlite + geçici klasör): EXIF silme, görünürlük, sınır, silme ve sahipsiz dosyalar.
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const f = await import('./fotograflar.ts');

let klasor: string;
let ali: string;
let ayse: string;
let ozelYer: string;
let acikYer: string;
let eser: string;

const bilgi = {
	donem: 'eski' as const,
	yil: 1965,
	aciklama: null,
	kaynak: null,
	hak: 'aile' as const
};

/** GPS bilgisi gömülü, 3000×2000 bir JPEG */
async function gpsliJpeg() {
	return sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#7a5c3a' } })
		.jpeg()
		.withExif({
			IFD0: { Make: 'Telefon' },
			IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '40/1 59/1 0/1' }
		})
		.toBuffer();
}

beforeAll(async () => {
	// Windows'ta sharp'ın dosya önbelleği geçici klasörü kilitlemesin
	sharp.cache(false);
	klasor = await mkdtemp(join(tmpdir(), 'iz-foto-'));
	f.fotoKlasoruAyarla(klasor);
	const k = await db
		.insert(kullanicilar)
		.values([
			{ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' },
			{ kullaniciAdi: 'ayse', eposta: 'ayse@iz.test', ad: 'Ayşe', sifreOzeti: 'x' }
		])
		.returning({ id: kullanicilar.id });
	[ali, ayse] = k.map((x) => x.id);
	const d = await db
		.insert(dugumler)
		.values([
			{ sahipId: ali, tur: 'yer', baslik: 'Moda' },
			{ sahipId: ali, tur: 'yer', baslik: 'Kreuzberg', gizlilik: 'herkes' },
			{ sahipId: ali, tur: 'eser', eserTuru: 'kitap', baslik: 'Kitap' }
		])
		.returning({ id: dugumler.id });
	[ozelYer, acikYer, eser] = d.map((x) => x.id);
});

afterAll(async () => {
	await rm(klasor, { recursive: true, force: true });
});

describe('fotoğraflar', () => {
	it('görseli küçültür, EXIF ve GPS bilgisini siler', async () => {
		const sonuc = await f.fotoEkle(ali, ozelYer, bilgi, await gpsliJpeg());
		if (typeof sonuc === 'string') throw new Error(sonuc);
		const dosya = (await f.fotoDosyasi(sonuc.id, ali, false))!;
		const meta = await sharp(dosya.yol).metadata();
		expect([meta.format, meta.width, meta.height]).toEqual(['webp', 2000, 1333]);
		expect(meta.exif).toBeUndefined();
		const kucuk = await sharp((await f.fotoDosyasi(sonuc.id, ali, true))!.yol).metadata();
		expect(kucuk.width).toBe(640);
	});

	it('görsel olmayanı, başkasının düğümünü ve fotoğrafsız türü reddeder', async () => {
		const metin = new TextEncoder().encode('bu bir fotoğraf değil');
		expect(await f.fotoEkle(ali, ozelYer, bilgi, metin)).toBe('gecersiz');
		expect(await f.fotoEkle(ayse, ozelYer, bilgi, await gpsliJpeg())).toBe('yetkisiz');
		expect(await f.fotoEkle(ali, eser, bilgi, await gpsliJpeg())).toBe('yetkisiz');
	});

	it('görünürlük düğümünkidir', async () => {
		const acik = await f.fotoEkle(ali, acikYer, { ...bilgi, donem: 'yeni' }, await gpsliJpeg());
		if (typeof acik === 'string') throw new Error(acik);
		expect(await f.fotograflariListele(ozelYer, ayse)).toEqual([]);
		expect(await f.fotograflariListele(ozelYer, ali)).toHaveLength(1);
		expect(await f.fotograflariListele(acikYer, null)).toHaveLength(1);
		const [ozelFoto] = await f.fotograflariListele(ozelYer, ali);
		expect(await f.fotoDosyasi(ozelFoto.id, null, false)).toBeNull();
		expect(await f.fotoDosyasi(acik.id, null, true)).not.toBeNull();
	});

	it('yalnızca sahibi siler; dosyalar da gider', async () => {
		const [foto] = await f.fotograflariListele(acikYer, ali);
		expect(await f.fotoSil(foto.id, ayse)).toBeNull();
		expect(await f.fotoSil(foto.id, ali)).toMatchObject({ dugumId: acikYer });
		expect((await readdir(klasor)).some((d) => d.startsWith(foto.id))).toBe(false);
	});

	it('satırı kalmamış eski dosyaları temizler, yenilere dokunmaz', async () => {
		const yetim = join(klasor, '00000000-0000-4000-8000-000000000000.webp');
		const taze = join(klasor, '11111111-1111-4111-8111-111111111111-k.webp');
		await writeFile(yetim, 'x');
		await writeFile(taze, 'x');
		const eski = new Date(Date.now() - 60 * 60 * 1000);
		await utimes(yetim, eski, eski);
		expect(await f.sahipsizFotograflariTemizle(true)).toBe(1);
		const kalan = await readdir(klasor);
		expect(kalan).toContain('11111111-1111-4111-8111-111111111111-k.webp');
		expect(kalan).not.toContain('00000000-0000-4000-8000-000000000000.webp');
		// Gerçek fotoğrafın dosyaları duruyor
		expect(kalan.filter((d) => !d.startsWith('1111')).length).toBe(2);
	});
});
