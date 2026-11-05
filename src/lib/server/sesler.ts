// Sesli anılar: yükleme, saklama, sunma ve metin düzeltme. Dosyalar `~/.iz/yuklemeler/sesler/`.
// Ses, yüzü olmayan ama kimliği taşıyan kişisel veridir: düğüm herkese açık olsa bile ses yalnızca
// sahibine ve (düğüm grup ya da herkese açıksa) grup arkadaşlarına açıktır; profilde/gömmede yoktur.
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, count, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { DUGUM_BASINA_SES, SESLI_TURLER, sesTuru } from '../ses';
import { db } from './db';
import { dugumler, sesler } from './db/schema';
import { yuklemeKlasoru } from './depolama';
import { etkin, grupArkadasiSql, muhursuz, varisSql } from './dugumler';
import { kuyrugaEkle, kuyrukAyarla } from './yaziyaDokme';

let klasor = yuklemeKlasoru('sesler');
const dosyaAdlari = new Map<string, string>();

export function sesKlasoruAyarla(yeni: string) {
	klasor = yeni;
}

const dosyaYolu = (id: string, uzanti: string) => join(klasor, `${id}.${uzanti}`);

// Kuyruk dosyanın yolunu buradan öğrenir
kuyrukAyarla({ yol: (id) => dosyaAdlari.get(id) ?? '' });

async function kaydet(id: string, uzanti: string, icerik: Uint8Array) {
	await mkdir(klasor, { recursive: true });
	const yol = dosyaYolu(id, uzanti);
	await writeFile(yol, icerik);
	dosyaAdlari.set(id, yol);
}

/** Sesi düğüm görünürlüğüne göre görebilir mi (herkese açıklık sese geçmez) */
function sesGorunurlugu(izleyenId: string | null): SQL {
	if (!izleyenId) return sql`false`;
	return or(
		eq(dugumler.sahipId, izleyenId),
		and(
			inArray(dugumler.gizlilik, ['grup', 'herkes']),
			grupArkadasiSql(dugumler.sahipId, izleyenId)
		),
		varisSql(dugumler.sahipId, izleyenId)
	) as SQL;
}

export async function sesEkle(
	sahipId: string,
	dugumId: string,
	icerik: Uint8Array
): Promise<'yetkisiz' | 'gecersiz' | 'dolu' | { id: string }> {
	const [d] = await db
		.select({ tur: dugumler.tur })
		.from(dugumler)
		.where(and(eq(dugumler.id, dugumId), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
	if (!d || !SESLI_TURLER.includes(d.tur)) return 'yetkisiz';
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(sesler)
		.where(eq(sesler.dugumId, dugumId));
	if (sayi >= DUGUM_BASINA_SES) return 'dolu';
	const uzanti = sesTuru(icerik);
	if (!uzanti) return 'gecersiz';
	return yeniSes({ sahipId, dugumId }, uzanti, icerik);
}

/** Yakının soru yanıtındaki ses: sorunun sahibine ait, düğüme bağlı değil */
export async function soruSesiEkle(sahipId: string, soruId: string, icerik: Uint8Array) {
	const uzanti = sesTuru(icerik);
	if (!uzanti) return 'gecersiz' as const;
	return yeniSes({ sahipId, soruId }, uzanti, icerik);
}

async function yeniSes(
	bag: { sahipId: string; dugumId?: string; soruId?: string },
	uzanti: string,
	icerik: Uint8Array
) {
	const [satir] = await db
		.insert(sesler)
		.values({ ...bag, uzanti, boyut: icerik.length })
		.returning({ id: sesler.id });
	try {
		await kaydet(satir.id, uzanti, icerik);
	} catch (e) {
		await db.delete(sesler).where(eq(sesler.id, satir.id));
		throw e;
	}
	kuyrugaEkle(satir.id);
	return { id: satir.id };
}

export async function sesleriListele(dugumId: string, izleyenId: string | null) {
	return db
		.select({
			id: sesler.id,
			sure: sesler.sure,
			metin: sesler.metin,
			durum: sesler.durum,
			olusturma: sesler.olusturma
		})
		.from(sesler)
		.innerJoin(dugumler, eq(sesler.dugumId, dugumler.id))
		.where(
			and(
				eq(sesler.dugumId, dugumId),
				etkin(dugumler),
				muhursuz(dugumler),
				sesGorunurlugu(izleyenId)
			)
		)
		.orderBy(asc(sesler.olusturma));
}

/** Sunulacak dosya; izleyen göremiyorsa null */
export async function sesDosyasi(id: string, izleyenId: string | null) {
	if (!izleyenId) return null;
	const [satir] = await db
		.select({ uzanti: sesler.uzanti, dugumId: sesler.dugumId, sahipId: sesler.sahipId })
		.from(sesler)
		.leftJoin(dugumler, eq(sesler.dugumId, dugumler.id))
		.where(
			and(
				eq(sesler.id, id),
				or(
					// Soru yanıtı sesleri yalnızca sorunun sahibine
					and(isNull(sesler.dugumId), eq(sesler.sahipId, izleyenId)),
					and(etkin(dugumler), muhursuz(dugumler), sesGorunurlugu(izleyenId))
				)
			)
		);
	if (!satir) return null;
	return { yol: dosyaYolu(id, satir.uzanti), uzanti: satir.uzanti };
}

export async function sesMetniGuncelle(id: string, sahipId: string, metin: string | null) {
	const s = await db
		.update(sesler)
		.set({ metin })
		.where(and(eq(sesler.id, id), eq(sesler.sahipId, sahipId)))
		.returning({ dugumId: sesler.dugumId });
	return s[0] ?? null;
}

/** Hata ya da kapalı durumdaki sesi yeniden yazıya dökmeyi dener */
export async function yenidenDene(id: string, sahipId: string) {
	const [s] = await db
		.update(sesler)
		.set({ durum: 'bekliyor', hata: null })
		.where(
			and(eq(sesler.id, id), eq(sesler.sahipId, sahipId), inArray(sesler.durum, ['hata', 'kapali']))
		)
		.returning({ id: sesler.id, uzanti: sesler.uzanti });
	if (!s) return false;
	dosyaAdlari.set(s.id, dosyaYolu(s.id, s.uzanti));
	kuyrugaEkle(s.id);
	return true;
}

export async function sesSil(id: string, sahipId: string) {
	const [s] = await db
		.delete(sesler)
		.where(and(eq(sesler.id, id), eq(sesler.sahipId, sahipId)))
		.returning({ uzanti: sesler.uzanti, dugumId: sesler.dugumId });
	if (!s) return null;
	await rm(dosyaYolu(id, s.uzanti), { force: true });
	return s;
}

/** Satırı kalmamış ses dosyalarını siler (10 dk pay) */
export async function sahipsizSesleriTemizle() {
	let dosyalar: string[];
	try {
		dosyalar = await readdir(klasor);
	} catch {
		return 0;
	}
	const idler = dosyalar
		.map((d) => /^([0-9a-f-]{36})\.\w+$/.exec(d)?.[1])
		.filter((x): x is string => !!x);
	if (!idler.length) return 0;
	const kalan = new Set(
		(await db.select({ id: sesler.id }).from(sesler).where(inArray(sesler.id, idler))).map(
			(s) => s.id
		)
	);
	let silinen = 0;
	for (const d of dosyalar) {
		const id = /^([0-9a-f-]{36})\.\w+$/.exec(d)?.[1];
		if (!id || kalan.has(id)) continue;
		const yol = join(klasor, d);
		if (Date.now() - (await stat(yol)).mtimeMs < 10 * 60 * 1000) continue;
		await rm(yol, { force: true });
		silinen++;
	}
	return silinen;
}

/** Sunucu açılınca: yarım kalan ve bekleyen kayıtları yeniden sıraya al */
export async function sesKuyrugunuBaslat() {
	const bekleyen = await db
		.select({ id: sesler.id, uzanti: sesler.uzanti })
		.from(sesler)
		.where(inArray(sesler.durum, ['bekliyor', 'isleniyor']));
	for (const b of bekleyen) {
		dosyaAdlari.set(b.id, dosyaYolu(b.id, b.uzanti));
		kuyrugaEkle(b.id);
	}
	return bekleyen.length;
}
