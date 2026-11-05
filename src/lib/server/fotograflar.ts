// Fotoğraf yükleme, saklama ve sunma. Dosyalar diskte (`yuklemeler/fotograflar/`), satırlar veritabanında.
// Yüklenen her görsel yeniden kodlanır: EXIF (GPS konumu, cihaz bilgisi) silinir, yönü düzeltilir,
// en çok 2000 piksele küçültülür. Görünürlük düğümün görünürlüğüdür (gölge ve çöptekiler dahil değil).
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import sharp from 'sharp';
import { DUGUM_BASINA_FOTO, FOTOGRAFLI_TURLER } from '../fotograf';
import { db } from './db';
import { dugumler, fotograflar } from './db/schema';
import type { FotoBilgisi } from './dogrulama';
import { etkin, gorunurluk } from './dugumler';

let klasor = resolve('yuklemeler', 'fotograflar');

/** Testler geçici bir klasör kullanır */
export function fotoKlasoruAyarla(yeni: string) {
	klasor = yeni;
}

const dosyaYolu = (id: string, kucuk = false) => join(klasor, `${id}${kucuk ? '-k' : ''}.webp`);

const KABUL_EDILEN = new Set(['jpeg', 'png', 'webp', 'avif', 'tiff']);
const EN_BUYUK_KENAR = 2000;
const KUCUK_KENAR = 640;

/** Görseli doğrular ve iki boyutta WebP'ye çevirir; görsel değilse null */
export async function fotoIsle(girdi: Uint8Array) {
	try {
		const kaynak = sharp(girdi, { limitInputPixels: 80_000_000, failOn: 'error' });
		const bilgi = await kaynak.metadata();
		if (!bilgi.format || !KABUL_EDILEN.has(bilgi.format)) return null;
		// rotate(): EXIF yönünü uygular. Meta veri varsayılan olarak çıktıya yazılmaz.
		const buyuk = await kaynak
			.clone()
			.rotate()
			.resize({
				width: EN_BUYUK_KENAR,
				height: EN_BUYUK_KENAR,
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({ quality: 82 })
			.toBuffer({ resolveWithObject: true });
		const kucuk = await kaynak
			.clone()
			.rotate()
			.resize({ width: KUCUK_KENAR, height: KUCUK_KENAR, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 76 })
			.toBuffer();
		return {
			buyuk: buyuk.data,
			kucuk,
			genislik: buyuk.info.width,
			yukseklik: buyuk.info.height
		};
	} catch {
		return null;
	}
}

export async function fotoEkle(
	sahipId: string,
	dugumId: string,
	bilgi: FotoBilgisi,
	girdi: Uint8Array
): Promise<'yetkisiz' | 'gecersiz' | 'dolu' | { id: string }> {
	const [dugum] = await db
		.select({ tur: dugumler.tur })
		.from(dugumler)
		.where(and(eq(dugumler.id, dugumId), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	if (!dugum || !FOTOGRAFLI_TURLER.includes(dugum.tur)) return 'yetkisiz';
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(fotograflar)
		.where(eq(fotograflar.dugumId, dugumId));
	if (sayi >= DUGUM_BASINA_FOTO) return 'dolu';

	const islenmis = await fotoIsle(girdi);
	if (!islenmis) return 'gecersiz';

	// Önce satır, sonra dosya: dosya yazılamazsa satır geri alınır (sahipsiz dosya taraması
	// yalnızca satırı olmayan dosyaları siler)
	const [satir] = await db
		.insert(fotograflar)
		.values({
			sahipId,
			dugumId,
			...bilgi,
			genislik: islenmis.genislik,
			yukseklik: islenmis.yukseklik,
			boyut: islenmis.buyuk.length
		})
		.returning({ id: fotograflar.id });
	try {
		await mkdir(klasor, { recursive: true });
		await writeFile(dosyaYolu(satir.id), islenmis.buyuk);
		await writeFile(dosyaYolu(satir.id, true), islenmis.kucuk);
	} catch (e) {
		await db.delete(fotograflar).where(eq(fotograflar.id, satir.id));
		throw e;
	}
	return { id: satir.id };
}

/** Düğümün fotoğrafları (izleyen düğümü görebiliyorsa) */
export async function fotograflariListele(dugumId: string, izleyenId: string | null) {
	return db
		.select({
			id: fotograflar.id,
			donem: fotograflar.donem,
			yil: fotograflar.yil,
			aciklama: fotograflar.aciklama,
			kaynak: fotograflar.kaynak,
			hak: fotograflar.hak,
			genislik: fotograflar.genislik,
			yukseklik: fotograflar.yukseklik
		})
		.from(fotograflar)
		.innerJoin(dugumler, eq(fotograflar.dugumId, dugumler.id))
		.where(and(eq(fotograflar.dugumId, dugumId), gorunurluk(dugumler, izleyenId)))
		.orderBy(asc(fotograflar.olusturma));
}

/** Sunulacak dosyanın yolu; izleyen göremiyorsa null. `herkeseAcik`: önbellek başlığı için */
export async function fotoDosyasi(id: string, izleyenId: string | null, kucuk: boolean) {
	const [satir] = await db
		.select({ gizlilik: dugumler.gizlilik })
		.from(fotograflar)
		.innerJoin(dugumler, eq(fotograflar.dugumId, dugumler.id))
		.where(and(eq(fotograflar.id, id), gorunurluk(dugumler, izleyenId)));
	if (!satir) return null;
	return { yol: dosyaYolu(id, kucuk), herkeseAcik: satir.gizlilik === 'herkes' };
}

export async function fotoSil(id: string, sahipId: string) {
	const silinen = await db
		.delete(fotograflar)
		.where(and(eq(fotograflar.id, id), eq(fotograflar.sahipId, sahipId)))
		.returning({ id: fotograflar.id, dugumId: fotograflar.dugumId });
	if (!silinen.length) return null;
	await Promise.all([rm(dosyaYolu(id), { force: true }), rm(dosyaYolu(id, true), { force: true })]);
	return silinen[0];
}

let sonTarama = 0;

/**
 * Satırı kalmamış dosyaları siler (hesap silme, düğümün kalıcı silinmesi zincirleme satırları
 * siler ama diskteki dosyaları silemez). Yeni yazılan dosyalara dokunmamak için 10 dakikalık pay
 * bırakılır; `zorla` yoksa en çok saatte bir çalışır.
 */
export async function sahipsizFotograflariTemizle(zorla = false) {
	const simdi = Date.now();
	if (!zorla && simdi - sonTarama < 60 * 60 * 1000) return 0;
	sonTarama = simdi;
	let dosyalar: string[];
	try {
		dosyalar = await readdir(klasor);
	} catch {
		return 0;
	}
	const kimlikler = [
		...new Set(
			dosyalar.map((d) => /^([0-9a-f-]{36})(?:-k)?\.webp$/.exec(d)?.[1]).filter((x) => !!x)
		)
	] as string[];
	const kalanlar = new Set<string>();
	for (let i = 0; i < kimlikler.length; i += 1000) {
		const parca = kimlikler.slice(i, i + 1000);
		const var_ = await db
			.select({ id: fotograflar.id })
			.from(fotograflar)
			.where(inArray(fotograflar.id, parca));
		for (const v of var_) kalanlar.add(v.id);
	}
	let silinen = 0;
	for (const d of dosyalar) {
		const id = /^([0-9a-f-]{36})(?:-k)?\.webp$/.exec(d)?.[1];
		if (!id || kalanlar.has(id)) continue;
		const yol = join(klasor, d);
		const { mtimeMs } = await stat(yol);
		if (simdi - mtimeMs < 10 * 60 * 1000) continue;
		await rm(yol, { force: true });
		silinen++;
	}
	return silinen;
}
