// İz (sıralı, anlatılabilir yol) veri erişimi.
// Okuma: sahibi her izi görür; başkaları yalnızca "herkes" izlerini ve bu izlerde yalnızca
// kendilerine görünür düğümleri (diğer duraklar "gizli durak" olarak döner).
// Yazma: yalnızca sahibi; duraklar yalnızca sahibin kendi düğümlerinden oluşur.
// Çöp kutusundaki izler hiç görünmez; çöp kutusundaki düğümler izlerde durak olarak gösterilmez.
import { and, asc, count, desc, eq, inArray, max, notInArray, sql } from 'drizzle-orm';
import type { DugumTuru, EserTuru, Gizlilik, TarihHassasiyeti } from '../sabitler';
import { db } from './db';
import { baglar, dugumler, izAdimlari, izler, kullanicilar } from './db/schema';
import type { IlkIzVerisi, IzVerisi, SihirbazDugumu } from './dogrulama';
import { etkin, gorunurluk } from './dugumler';
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

type IzOzetSecenekleri = {
	limit?: number;
	/** Listeyi gören kişi; sahibi değilse yalnızca herkese açık izler ve düğümler */
	izleyenId?: string | null;
	/** Yalnızca bu düğümün durak olduğu izler */
	dugumId?: string;
};

/**
 * İz önizlemeleri. Sahibi olmayan biri bakıyorsa yalnızca görebileceği izler listelenir ve
 * önizlemede görmediği düğümlerin başlıkları hiç gönderilmez (durak sayısı yine doğrudur).
 */
export async function izleriListele(
	sahipId: string,
	secenekler: IzOzetSecenekleri | number = {}
): Promise<IzOzeti[]> {
	const {
		limit = 100,
		izleyenId = sahipId,
		dugumId
	} = typeof secenekler === 'number' ? { limit: secenekler } : secenekler;
	const kosullar = [eq(izler.sahipId, sahipId), gorunurluk(izler, izleyenId)];
	if (dugumId) {
		kosullar.push(
			inArray(
				izler.id,
				db.select({ izId: izAdimlari.izId }).from(izAdimlari).where(eq(izAdimlari.dugumId, dugumId))
			)
		);
	}
	const liste = await db
		.select({
			id: izler.id,
			baslik: izler.baslik,
			aciklama: izler.aciklama,
			gizlilik: izler.gizlilik,
			guncelleme: izler.guncelleme
		})
		.from(izler)
		.where(and(...kosullar))
		.orderBy(desc(izler.guncelleme))
		.limit(limit);
	if (!liste.length) return [];

	const adimlar = await db
		.select({
			izId: izAdimlari.izId,
			sahipId: dugumler.sahipId,
			gizlilik: dugumler.gizlilik,
			dugum: { id: dugumler.id, baslik: dugumler.baslik, tur: dugumler.tur }
		})
		.from(izAdimlari)
		.innerJoin(dugumler, eq(izAdimlari.dugumId, dugumler.id))
		.where(
			and(
				inArray(
					izAdimlari.izId,
					liste.map((i) => i.id)
				),
				etkin(dugumler)
			)
		)
		.orderBy(asc(izAdimlari.izId), asc(izAdimlari.sira));

	const gruplar = new Map<string, { sayi: number; gorunur: IzOzeti['duraklar'] }>();
	for (const a of adimlar) {
		const grup = gruplar.get(a.izId) ?? { sayi: 0, gorunur: [] };
		grup.sayi++;
		if (gorebilirMi(a, izleyenId)) grup.gorunur.push(a.dugum);
		gruplar.set(a.izId, grup);
	}
	return liste.map((iz) => {
		const { sayi, gorunur } = gruplar.get(iz.id) ?? { sayi: 0, gorunur: [] };
		return {
			...iz,
			durakSayisi: sayi,
			duraklar: gorunur.slice(0, 6),
			ilkDurak: gorunur[0] ?? null,
			sonDurak: gorunur.length > 1 ? gorunur[gorunur.length - 1] : null
		};
	});
}

export async function izSayisi(sahipId: string): Promise<number> {
	const [{ sayi }] = await db
		.select({ sayi: count() })
		.from(izler)
		.where(and(eq(izler.sahipId, sahipId), etkin(izler)));
	return sayi;
}

/** Kullanıcının (çöp kutusu dışındaki) izlerinde durak olan düğümler */
export async function izdekiDugumler(sahipId: string): Promise<Set<string>> {
	const satirlar = await db
		.selectDistinct({ dugumId: izAdimlari.dugumId })
		.from(izAdimlari)
		.innerJoin(izler, eq(izAdimlari.izId, izler.id))
		.where(and(eq(izler.sahipId, sahipId), etkin(izler)));
	return new Set(satirlar.map((s) => s.dugumId));
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
	sahip: { kullaniciAdi: string; ad: string; aramaMotorlari: boolean };
	sahibiMi: boolean;
	duraklar: (IzDuragi | GizliDurak)[];
	/** Herkese açık izde, başkalarının göremeyeceği durak sayısı (yalnızca sahibine bilgi) */
	gorunmeyenDurakSayisi: number;
};

export function gizliMi(durak: IzDuragi | GizliDurak): durak is GizliDurak {
	return 'gizli' in durak;
}

/** İzi getirir; izleyen göremiyorsa ya da iz çöp kutusundaysa null */
export async function izGetir(id: string, izleyenId: string | null): Promise<IzAyrintisi | null> {
	const [kayit] = await db
		.select({
			iz: izler,
			sahip: {
				kullaniciAdi: kullanicilar.kullaniciAdi,
				ad: kullanicilar.ad,
				aramaMotorlari: kullanicilar.aramaMotorlari
			}
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
		.where(and(eq(izAdimlari.izId, id), etkin(dugumler)))
		.orderBy(asc(izAdimlari.sira));

	// Ardışık duraklar arasındaki bağlar
	const idler = adimlar.map((a) => a.dugum.id);
	const aradakiler =
		idler.length > 1
			? await db
					.select({
						id: baglar.id,
						kaynakId: baglar.kaynakId,
						hedefId: baglar.hedefId,
						not: baglar.not
					})
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

	const { sahipId: _sahipId, silinme: _silinme, ...iz } = kayit.iz;
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
				.where(and(eq(dugumler.id, ilkDugumId), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
			if (dugum) await tx.insert(izAdimlari).values({ izId: iz.id, dugumId: dugum.id, sira: 1 });
		}
		return iz;
	});
}

/**
 * İlk iz sihirbazı: eser, onu getiren ve onun götürdüğü düğümleri, aralarındaki bağları ve
 * bu üç durakla bir izi tek işlemde oluşturur. Hepsi özel olarak başlar.
 */
export async function ilkIzOlustur(sahipId: string, veri: IlkIzVerisi) {
	return db.transaction(async (tx) => {
		async function dugumEkle(
			d:
				| SihirbazDugumu
				| { tur: 'eser'; eserTuru: EserTuru; baslik: string; altBaslik: string | null }
		) {
			const [yeni] = await tx
				.insert(dugumler)
				.values({
					sahipId,
					tur: d.tur,
					eserTuru: d.eserTuru,
					baslik: d.baslik,
					altBaslik: 'altBaslik' in d ? d.altBaslik : null,
					durum: d.tur === 'eser' ? 'bitti' : null,
					gizlilik: 'ozel'
				})
				.returning({ id: dugumler.id });
			return yeni.id;
		}

		const eserId = await dugumEkle({ tur: 'eser', ...veri.eser });
		const duraklar: { dugumId: string; not: string | null }[] = [];
		if (veri.getiren) {
			const getirenId = await dugumEkle(veri.getiren);
			await tx
				.insert(baglar)
				.values({ sahipId, kaynakId: getirenId, hedefId: eserId, not: veri.getiren.not });
			duraklar.push({ dugumId: getirenId, not: null });
		}
		duraklar.push({ dugumId: eserId, not: null });
		if (veri.giden) {
			const gidenId = await dugumEkle(veri.giden);
			await tx
				.insert(baglar)
				.values({ sahipId, kaynakId: eserId, hedefId: gidenId, not: veri.giden.not });
			duraklar.push({ dugumId: gidenId, not: null });
		}

		const [iz] = await tx
			.insert(izler)
			.values({ sahipId, baslik: veri.izBaslik, gizlilik: 'ozel' })
			.returning({ id: izler.id });
		await tx
			.insert(izAdimlari)
			.values(
				duraklar.map((d, i) => ({ izId: iz.id, dugumId: d.dugumId, sira: i + 1, not: d.not }))
			);
		return { izId: iz.id, eserId };
	});
}

export async function izGuncelle(id: string, sahipId: string, veri: IzVerisi) {
	const sonuc = await db
		.update(izler)
		.set({ ...veri, guncelleme: new Date() })
		.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId), etkin(izler)))
		.returning({ id: izler.id });
	return sonuc.length > 0;
}

/** İzi çöp kutusuna atar (30 gün içinde geri yüklenebilir) */
export async function izCopeAt(id: string, sahipId: string) {
	const [sonuc] = await db
		.update(izler)
		.set({ silinme: new Date() })
		.where(and(eq(izler.id, id), eq(izler.sahipId, sahipId), etkin(izler)))
		.returning({ id: izler.id, baslik: izler.baslik });
	return sonuc ?? null;
}

/** İzi kilitleyerek sahipliğini doğrular (aynı ize eşzamanlı durak eklemeleri sıraya girer) */
async function iziKilitle(tx: Islem, izId: string, sahipId: string) {
	const [iz] = await tx
		.select({ id: izler.id })
		.from(izler)
		.where(and(eq(izler.id, izId), eq(izler.sahipId, sahipId), etkin(izler)))
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

/**
 * İze durak ekler. Sıra verilirse durak o konuma yerleştirilir (çıkarılan bir durağı
 * "Geri al" ile eski yerine koymak için); verilmezse sona eklenir.
 */
export async function durakEkle(
	izId: string,
	sahipId: string,
	dugumId: string,
	not: string | null = null,
	sira?: number
): Promise<IzEklemeSonucu> {
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return 'yetkisiz';
		const [dugum] = await tx
			.select({ id: dugumler.id })
			.from(dugumler)
			.where(and(eq(dugumler.id, dugumId), eq(dugumler.sahipId, sahipId), etkin(dugumler)));
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

		if (sira !== undefined) {
			const sirali = (await siraliAdimIdleri(tx, izId)).filter((id) => id !== eklenen[0].id);
			const konum = Math.min(Math.max(sira - 1, 0), sirali.length);
			sirali.splice(konum, 0, eklenen[0].id);
			await siraYaz(tx, izId, sirali);
		}
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
		.where(and(eq(izAdimlari.id, adimId), eq(izler.sahipId, sahipId), etkin(izler)));
	return adim?.izId ?? null;
}

/** Durağı izden çıkarır; "Geri al" için çıkarılan durağın bilgisini (düğüm, sıra, not) döner */
export async function durakCikar(adimId: string, sahipId: string) {
	const izId = await durakIzi(adimId, sahipId);
	if (!izId) return null;
	return db.transaction(async (tx) => {
		if (!(await iziKilitle(tx, izId, sahipId))) return null;
		const sirali = await siraliAdimIdleri(tx, izId);
		const [silinen] = await tx
			.delete(izAdimlari)
			.where(eq(izAdimlari.id, adimId))
			.returning({ dugumId: izAdimlari.dugumId, not: izAdimlari.not });
		await siraYaz(
			tx,
			izId,
			sirali.filter((id) => id !== adimId)
		);
		await guncellendi(tx, izId);
		return { izId, dugumId: silinen.dugumId, not: silinen.not, sira: sirali.indexOf(adimId) + 1 };
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
/** Düğümün durak olduğu, izleyenin görebileceği izler (önizlemeli) */
export async function dugumunIzleri(dugumId: string, izleyenId: string | null) {
	const [d] = await db
		.select({ sahipId: dugumler.sahipId })
		.from(dugumler)
		.where(eq(dugumler.id, dugumId));
	if (!d) return [];
	return izleriListele(d.sahipId, { dugumId, izleyenId, limit: 50 });
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
		.where(and(eq(izler.sahipId, sahipId), etkin(izler), notInArray(izler.id, icerenler)))
		.orderBy(desc(izler.guncelleme))
		.limit(100);
}

/** Sıradaki durak önerileri: son duraktan bağla gidilen, izde henüz olmayan düğümler */
export async function sonrakiDurakOnerileri(izId: string, sahipId: string) {
	const [son] = await db
		.select({ dugumId: izAdimlari.dugumId })
		.from(izAdimlari)
		.innerJoin(izler, eq(izAdimlari.izId, izler.id))
		.innerJoin(dugumler, eq(izAdimlari.dugumId, dugumler.id))
		.where(
			and(eq(izAdimlari.izId, izId), eq(izler.sahipId, sahipId), etkin(izler), etkin(dugumler))
		)
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
				etkin(dugumler),
				notInArray(baglar.hedefId, izdekiler)
			)
		)
		.orderBy(asc(dugumler.baslik))
		.limit(12);
}
