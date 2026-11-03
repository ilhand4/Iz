// İz (sıralı, anlatılabilir yol) veri erişimi.
// Okuma: sahibi her izi görür; başkaları yalnızca "herkes" izlerini ve bu izlerde yalnızca
// kendilerine görünür düğümleri (diğer duraklar "gizli durak" olarak döner).
// Yazma: yalnızca sahibi; duraklar yalnızca sahibin kendi düğümlerinden oluşur.
import { and, asc, count, desc, eq, inArray, max, notInArray, sql } from 'drizzle-orm';
import type { DugumTuru, EserTuru, Gizlilik, TarihHassasiyeti } from '../sabitler';
import { db } from './db';
import { baglar, dugumler, izAdimlari, izler, kullanicilar } from './db/schema';
import type { IzVerisi } from './dogrulama';
import { gorunurluk } from './dugumler';
import { gorebilirMi } from './yetki';

type Islem = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ——— Listeleme ———

export type IzOzeti = {
	id: string;
	baslik: string;
	aciklama: string | null;
	gizlilik: Gizlilik;
	guncelleme: Date;
	durakSayisi: number;
	/** Önizleme için ilk duraklar */
	duraklar: { id: string; baslik: string; tur: DugumTuru }[];
	ilkDurak: { id: string; baslik: string } | null;
	sonDurak: { id: string; baslik: string } | null;
};

export async function izleriListele(sahipId: string, limit = 100): Promise<IzOzeti[]> {
	const liste = await db
		.select({
			id: izler.id,
			baslik: izler.baslik,
			aciklama: izler.aciklama,
			gizlilik: izler.gizlilik,
			guncelleme: izler.guncelleme
		})
		.from(izler)
		.where(eq(izler.sahipId, sahipId))
		.orderBy(desc(izler.guncelleme))
		.limit(limit);
	if (!liste.length) return [];

	const adimlar = await db
		.select({
			izId: izAdimlari.izId,
			dugum: { id: dugumler.id, baslik: dugumler.baslik, tur: dugumler.tur }
		})
		.from(izAdimlari)
		.innerJoin(dugumler, eq(izAdimlari.dugumId, dugumler.id))
		.where(
			inArray(
				izAdimlari.izId,
				liste.map((i) => i.id)
			)
		)
		.orderBy(asc(izAdimlari.izId), asc(izAdimlari.sira));

	const gruplar = new Map<string, IzOzeti['duraklar']>();
	for (const a of adimlar) {
		const grup = gruplar.get(a.izId) ?? [];
		grup.push(a.dugum);
		gruplar.set(a.izId, grup);
	}
	return liste.map((iz) => {
		const duraklar = gruplar.get(iz.id) ?? [];
		return {
			...iz,
			durakSayisi: duraklar.length,
			duraklar: duraklar.slice(0, 6),
			ilkDurak: duraklar[0] ?? null,
			sonDurak: duraklar.length > 1 ? duraklar[duraklar.length - 1] : null
		};
	});
}

export async function izSayisi(sahipId: string): Promise<number> {
	const [{ sayi }] = await db.select({ sayi: count() }).from(izler).where(eq(izler.sahipId, sahipId));
	return sayi;
}

// ——— Tek iz ———

export type IzDuragi = {
	adimId: string;
	sira: number;
	not: string | null;
	dugum: {
		id: string;
		tur: DugumTuru;
		eserTuru: EserTuru | null;
		baslik: string;
		altBaslik: string | null;
		gorselUrl: string | null;
		tarih: string | null;
		tarihHassasiyeti: TarihHassasiyeti | null;
		gizlilik: Gizlilik;
	};
	/** Bu duraktan bir sonrakine giden bağ (varsa): "nasıl götürdü" notu */
	sonrakineBag: { id: string; not: string | null } | null;
};

export type GizliDurak = { adimId: string; sira: number; gizli: true };

export type IzAyrintisi = {
	iz: {
		id: string;
		baslik: string;
		aciklama: string | null;
		gizlilik: Gizlilik;
		olusturma: Date;
		guncelleme: Date;
	};
	sahip: { kullaniciAdi: string; ad: string };
	sahibiMi: boolean;
	duraklar: (IzDuragi | GizliDurak)[];
	/** Herkese açık izde, başkalarının göremeyeceği durak sayısı (yalnızca sahibine bilgi) */
	gorunmeyenDurakSayisi: number;
};

export function gizliMi(durak: IzDuragi | GizliDurak): durak is GizliDurak {
	return 'gizli' in durak;
}

/** İzi getirir; izleyen göremiyorsa null */
export async function izGetir(id: string, izleyenId: string | null): Promise<IzAyrintisi | null> {
	const [kayit] = await db
		.select({
			iz: izler,
			sahip: { kullaniciAdi: kullanicilar.kullaniciAdi, ad: kullanicilar.ad }
		})
		.from(izler)
		.innerJoin(kullanicilar, eq(izler.sahipId, kullanicilar.id))
		.where(and(eq(izler.id, id), gorunurluk(izler, izleyenId)));
	if (!kayit) return null;

	const sahibiMi = kayit.iz.sahipId === izleyenId;
	const adimlar = await db
		.select({
			adimId: izAdimlari.id,
			sira: izAdimlari.sira,
			not: izAdimlari.not,
			sahipId: dugumler.sahipId,
			dugum: {
				id: dugumler.id,
				tur: dugumler.tur,
				eserTuru: dugumler.eserTuru,
				baslik: dugumler.baslik,
				altBaslik: dugumler.altBaslik,
				gorselUrl: dugumler.gorselUrl,
				tarih: dugumler.tarih,
				tarihHassasiyeti: dugumler.tarihHassasiyeti,
				gizlilik: dugumler.gizlilik
			}
		})
		.from(izAdimlari)
		.innerJoin(dugumler, eq(izAdimlari.dugumId, dugumler.id))
		.where(eq(izAdimlari.izId, id))
		.orderBy(asc(izAdimlari.sira));

	// Ardışık duraklar arasındaki bağlar
	const idler = adimlar.map((a) => a.dugum.id);
	const aradakiler =
		idler.length > 1
			? await db
					.select({ id: baglar.id, kaynakId: baglar.kaynakId, hedefId: baglar.hedefId, not: baglar.not })
					.from(baglar)
					.where(and(inArray(baglar.kaynakId, idler), inArray(baglar.hedefId, idler)))
			: [];
	const bagBul = (kaynak: string, hedef: string) =>
		aradakiler.find((b) => b.kaynakId === kaynak && b.hedefId === hedef) ?? null;

	const gorunurMu = (a: (typeof adimlar)[number]) =>
		gorebilirMi({ sahipId: a.sahipId, gizlilik: a.dugum.gizlilik }, izleyenId);

	const duraklar = adimlar.map((a, i): IzDuragi | GizliDurak => {
		if (!gorunurMu(a)) return { adimId: a.adimId, sira: a.sira, gizli: true };
		const sonraki = adimlar[i + 1];
		const bag = sonraki && gorunurMu(sonraki) ? bagBul(a.dugum.id, sonraki.dugum.id) : null;
		return {
			adimId: a.adimId,
			sira: a.sira,
			not: a.not,
			dugum: a.dugum,
			sonrakineBag: bag ? { id: bag.id, not: bag.not } : null
		};
	});

	const { sahipId: _sahipId, ...iz } = kayit.iz;
	return {
		iz,
		sahip: kayit.sahip,
		sahibiMi,
		duraklar,
		gorunmeyenDurakSayisi:
			sahibiMi && iz.gizlilik === 'herkes'
				? adimlar.filter((a) => a.dugum.gizlilik !== 'herkes').length
				: 0
	};
}

// ——— Oluşturma, düzenleme, silme ———

export type IzEklemeSonucu = 'eklendi' | 'zaten-var' | 'yetkisiz';

export async function izOlustur(sahipId: string, veri: IzVerisi, ilkDugumId?: string | null) {
	return db.transaction(async (tx) => {
		const [iz] = await tx
			.insert(izler)
			.values({ ...veri, sahipId })
			.returning({ id: izler.id });
		if (ilkDugumId) {
			const [dugum] = await tx
				.select({ id: dugumler.id })
				.from(dugumler)
				.where(and(eq(dugumler.id, ilkDugumId), eq(dugumler.sahipId, sahipId)));
			if (dugum) await tx.insert(izAdimlari).values({ izId: iz.id, dugumId: dugum.id, sira: 1 });
		}
		return iz;
	});
}

export async function izGuncelle(id: string, sahipId: string, veri: IzVerisi) {
	const sonuc = await db
		.update(izler)
		.set({ ...veri, guncelleme: new Date() })
		.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId)))
		.returning({ id: izler.id });
	return sonuc.length > 0;
}

export async function izSil(id: string, sahipId: string) {
	const sonuc = await db
		.delete(izler)
		.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId)))
		.returning({ id: izler.id });
	return sonuc.length > 0;
}

/** İzi kilitleyerek sahipliğini doğrular (aynı ize eşzamanlı durak eklemeleri sıraya girer) */
async function iziKilitle(tx: Islem, izId: string, sahipId: string) {
	const [iz] = await tx
		.select({ id: izler.id })
		.from(izler)
		.where(and(eq(izler.id, izId), eq(izler.sahipId, sahipId)))
		.for('update');
	return !!iz;
}

async function guncellendi(tx: Islem, izId: string) {
	await tx.update(izler).set({ guncelleme: new Date() }).where(eq(izler.id, izId));
}

/**
 * Durakların sırasını verilen düzene göre yazar.
 * (iz_id, sira) tekil olduğu için önce hepsi geçici olarak kaydırılır, sonra 1'den numaralanır.
 */
async function siraYaz(tx: Islem, izId: string, siraliIdler: string[]) {
	await tx
		.update(izAdimlari)
		.set({ sira: sql`${izAdimlari.sira} + 1000000` })
		.where(eq(izAdimlari.izId, izId));
	for (const [i, adimId] of siraliIdler.entries()) {
		await tx
			.update(izAdimlari)
			.set({ sira: i + 1 })
			.where(and(eq(izAdimlari.id, adimId), eq(izAdimlari.izId, izId)));
	}
}

async function siraliAdimIdleri(tx: Islem, izId: string) {
	const adimlar = await tx
		.select({ id: izAdimlari.id })
		.from(izAdimlari)
		.where(eq(izAdimlari.izId, izId))
		.orderBy(asc(izAdimlari.sira));
	return adimlar.map((a) => a.id);
}

export async function durakEkle(
	izId: string,
	sahipId: string,
	dugumId: string,
	not: string | null = null
): Promise<IzEklemeSonucu> {
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return 'yetkisiz';
		const [dugum] = await tx
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(and(eq(dugumler.id, dugumId), eq(dugumler.sahipId, sahipId)));
		if (!dugum) return 'yetkisiz';

		const [{ enBuyuk }] = await tx
			.select({ enBuyuk: max(izAdimlari.sira) })
			.from(izAdimlari)
			.where(eq(izAdimlari.izId, izId));
		const eklenen = await tx
			.insert(izAdimlari)
			.values({ izId, dugumId, sira: (enBuyuk ?? 0) + 1, not })
			.onConflictDoNothing({ target: [izAdimlari.izId, izAdimlari.dugumId] })
			.returning({ id: izAdimlari.id });
		if (!eklenen.length) return 'zaten-var';
		await guncellendi(tx, izId);
		return 'eklendi';
	});
}

/** Durağın ait olduğu iz bu kullanıcınınsa iz kimliğini döner */
async function durakIzi(adimId: string, sahipId: string) {
	const [adim] = await db
		.select({ izId: izAdimlari.izId })
		.from(izAdimlari)
		.innerJoin(izler, eq(izAdimlari.izId, izler.id))
		.where(and(eq(izAdimlari.id, adimId), eq(izler.sahipId, sahipId)));
	return adim?.izId ?? null;
}

export async function durakCikar(adimId: string, sahipId: string) {
	const izId = await durakIzi(adimId, sahipId);
	if (!izId) return false;
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return false;
		await tx.delete(izAdimlari).where(eq(izAdimlari.id, adimId));
		await siraYaz(tx, izId, await siraliAdimIdleri(tx, izId));
		await guncellendi(tx, izId);
		return true;
	});
}

/** Durakları yeni düzene sokar; liste izdeki durakların tam ve tekrarsız bir sıralaması olmalı */
export async function duraklariSirala(izId: string, sahipId: string, siraliIdler: string[]) {
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return false;
		const mevcut = new Set(await siraliAdimIdleri(tx, izId));
		const gecerli =
			siraliIdler.length === mevcut.size &&
			new Set(siraliIdler).size === siraliIdler.length &&
			siraliIdler.every((id) => mevcut.has(id));
		if (!gecerli) return false;
		await siraYaz(tx, izId, siraliIdler);
		await guncellendi(tx, izId);
		return true;
	});
}

/** Durağı bir yukarı ya da aşağı taşır (klavye ve JavaScript'siz kullanım için) */
export async function durakTasi(adimId: string, sahipId: string, yon: 'yukari' | 'asagi') {
	const izId = await durakIzi(adimId, sahipId);
	if (!izId) return false;
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return false;
		const sirali = await siraliAdimIdleri(tx, izId);
		const i = sirali.indexOf(adimId);
		const j = yon === 'yukari' ? i - 1 : i + 1;
		if (i < 0 || j < 0 || j >= sirali.length) return true;
		[sirali[i], sirali[j]] = [sirali[j], sirali[i]];
		await siraYaz(tx, izId, sirali);
		await guncellendi(tx, izId);
		return true;
	});
}

export async function durakNotuKaydet(adimId: string, sahipId: string, not: string | null) {
	const izId = await durakIzi(adimId, sahipId);
	if (!izId) return false;
	await db.update(izAdimlari).set({ not }).where(eq(izAdimlari.id, adimId));
	await db.update(izler).set({ guncelleme: new Date() }).where(eq(izler.id, izId));
	return true;
}

// ——— Düğüm sayfası ve öneriler ———

/** Bir düğümün durak olduğu, izleyenin görebildiği izler */
export async function dugumunIzleri(dugumId: string, izleyenId: string | null) {
	return db
		.select({ id: izler.id, baslik: izler.baslik, gizlilik: izler.gizlilik })
		.from(izAdimlari)
		.innerJoin(izler, eq(izAdimlari.izId, izler.id))
		.where(and(eq(izAdimlari.dugumId, dugumId), gorunurluk(izler, izleyenId)))
		.orderBy(desc(izler.guncelleme))
		.limit(50);
}

/** Bu düğümün henüz durak olmadığı, kullanıcının kendi izleri ("İze ekle" için) */
export async function izSecenekleri(sahipId: string, dugumId: string) {
	const icerenler = db
		.select({ izId: izAdimlari.izId })
		.from(izAdimlari)
		.where(eq(izAdimlari.dugumId, dugumId));
	return db
		.select({ id: izler.id, baslik: izler.baslik })
		.from(izler)
		.where(and(eq(izler.sahipId, sahipId), notInArray(izler.id, icerenler)))
		.orderBy(desc(izler.guncelleme))
		.limit(100);
}

/** Sıradaki durak önerileri: son duraktan bağla gidilen, izde henüz olmayan düğümler */
export async function sonrakiDurakOnerileri(izId: string, sahipId: string) {
	const [son] = await db
		.select({ dugumId: izAdimlari.dugumId })
		.from(izAdimlari)
		.innerJoin(izler, eq(izAdimlari.izId, izler.id))
		.where(and(eq(izAdimlari.izId, izId), eq(izler.sahipId, sahipId)))
		.orderBy(desc(izAdimlari.sira))
		.limit(1);
	if (!son) return [];
	const izdekiler = db
		.select({ dugumId: izAdimlari.dugumId })
		.from(izAdimlari)
		.where(eq(izAdimlari.izId, izId));
	return db
		.select({ id: dugumler.id, baslik: dugumler.baslik, tur: dugumler.tur, not: baglar.not })
		.from(baglar)
		.innerJoin(dugumler, eq(baglar.hedefId, dugumler.id))
		.where(
			and(
				eq(baglar.kaynakId, son.dugumId),
				eq(baglar.sahipId, sahipId),
				notInArray(baglar.hedefId, izdekiler)
			)
		)
		.orderBy(asc(dugumler.baslik))
		.limit(12);
}
