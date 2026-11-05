// Aile arşivi ve kitap: anı, kişi ve yer düğümleri; fotoğrafları ve seslerin metniyle, tarih sırasıyla.
// Grup arşivi yalnızca üyelerin "grup" gizlilikli düğümlerinden oluşur (herkese açıklar da değil:
// aile arşivi aileye özeldir). Kişisel kitap sahibinin tüm (mühürsüz) düğümleridir.
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { DugumTuru } from '../sabitler';
import { db } from './db';
import { dugumler, fotograflar, grupUyeleri, kullanicilar, sesler } from './db/schema';
import { etkin, muhursuz } from './dugumler';
import { uyeMi } from './gruplar';

const ARSIV_TURLERI: DugumTuru[] = ['ani', 'kisi', 'yer'];
const EN_FAZLA = 500;

async function dugumleriTopla(kosul: ReturnType<typeof and>, yil: number | null) {
	const liste = await db
		.select({
			id: dugumler.id,
			tur: dugumler.tur,
			baslik: dugumler.baslik,
			altBaslik: dugumler.altBaslik,
			aciklama: dugumler.aciklama,
			tarih: dugumler.tarih,
			tarihHassasiyeti: dugumler.tarihHassasiyeti,
			yerAdi: dugumler.yerAdi,
			yazar: kullanicilar.ad
		})
		.from(dugumler)
		.innerJoin(kullanicilar, eq(dugumler.sahipId, kullanicilar.id))
		.where(
			and(
				kosul,
				etkin(dugumler),
				muhursuz(dugumler),
				inArray(dugumler.tur, ARSIV_TURLERI),
				yil ? sql`extract(year from ${dugumler.tarih}) = ${yil}` : undefined
			)
		)
		// Tarihsizler sona
		.orderBy(sql`${dugumler.tarih} asc nulls last`, asc(dugumler.baslik))
		.limit(EN_FAZLA);
	const idler = liste.map((d) => d.id);
	if (!idler.length) return [];
	const [fotolar, metinler] = await Promise.all([
		db
			.select({
				id: fotograflar.id,
				dugumId: fotograflar.dugumId,
				donem: fotograflar.donem,
				yil: fotograflar.yil,
				aciklama: fotograflar.aciklama,
				kaynak: fotograflar.kaynak
			})
			.from(fotograflar)
			.where(inArray(fotograflar.dugumId, idler))
			.orderBy(asc(fotograflar.olusturma)),
		db
			.select({ dugumId: sesler.dugumId, metin: sesler.metin })
			.from(sesler)
			.where(and(inArray(sesler.dugumId, idler), isNotNull(sesler.metin)))
			.orderBy(asc(sesler.olusturma))
	]);
	return liste.map((d) => ({
		...d,
		fotolar: fotolar.filter((f) => f.dugumId === d.id),
		anlatilar: metinler.filter((m) => m.dugumId === d.id).map((m) => m.metin!)
	}));
}

/** Grup arşivi; izleyen üye değilse null */
export async function grupArsivi(grupId: string, izleyenId: string, yil: number | null = null) {
	if (!(await uyeMi(grupId, izleyenId))) return null;
	const uyeler = db
		.select({ id: grupUyeleri.kullaniciId })
		.from(grupUyeleri)
		.where(eq(grupUyeleri.grupId, grupId));
	return dugumleriTopla(and(inArray(dugumler.sahipId, uyeler), eq(dugumler.gizlilik, 'grup')), yil);
}

/** Kişisel kitap: sahibinin tüm anı, kişi ve yer düğümleri */
export async function kisiselArsiv(sahipId: string, yil: number | null = null) {
	return dugumleriTopla(and(eq(dugumler.sahipId, sahipId)), yil);
}

export type ArsivOgesi = Awaited<ReturnType<typeof kisiselArsiv>>[number];
