// Dışa aktarma sorgusu ve içe aktarma yazımı (biçim ve doğrulama: veriTasima.ts).
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from './db';
import { agKonumlari, baglar, dugumler, izAdimlari, izler, kullanicilar } from './db/schema';
import { etkin } from './dugumler';
import {
	DISA_AKTARMA_BICIMI,
	DISA_AKTARMA_SURUMU,
	type DisaAktarma,
	type IceAktarmaSonucu
} from './veriTasima';

/** Kullanıcının çöp kutusu dışındaki tüm verisi */
export async function disaAktar(sahipId: string): Promise<DisaAktarma> {
	const [[hesap], dugumListesi, bagListesi, izListesi] = await Promise.all([
		db
			.select({
				kullaniciAdi: kullanicilar.kullaniciAdi,
				ad: kullanicilar.ad,
				hakkinda: kullanicilar.hakkinda
			})
			.from(kullanicilar)
			.where(eq(kullanicilar.id, sahipId)),
		db
			.select({
				id: dugumler.id,
				tur: dugumler.tur,
				eserTuru: dugumler.eserTuru,
				baslik: dugumler.baslik,
				altBaslik: dugumler.altBaslik,
				aciklama: dugumler.aciklama,
				tarih: dugumler.tarih,
				tarihHassasiyeti: dugumler.tarihHassasiyeti,
				yil: dugumler.yil,
				enlem: dugumler.enlem,
				boylam: dugumler.boylam,
				yerAdi: dugumler.yerAdi,
				gizlilik: dugumler.gizlilik,
				durum: dugumler.durum,
				disKaynak: dugumler.disKaynak,
				disKimlik: dugumler.disKimlik,
				gorselUrl: dugumler.gorselUrl,
				x: agKonumlari.x,
				y: agKonumlari.y
			})
			.from(dugumler)
			.leftJoin(agKonumlari, eq(agKonumlari.dugumId, dugumler.id))
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
			.orderBy(asc(dugumler.olusturma)),
		db
			.select({
				kaynakId: baglar.kaynakId,
				hedefId: baglar.hedefId,
				not: baglar.not,
				tarih: baglar.tarih,
				tarihHassasiyeti: baglar.tarihHassasiyeti
			})
			.from(baglar)
			.where(eq(baglar.sahipId, sahipId))
			.orderBy(asc(baglar.olusturma)),
		db
			.select({
				id: izler.id,
				baslik: izler.baslik,
				aciklama: izler.aciklama,
				gizlilik: izler.gizlilik
			})
			.from(izler)
			.where(and(eq(izler.sahipId, sahipId), etkin(izler)))
			.orderBy(asc(izler.olusturma))
	]);

	// Çöpteki düğümler aktarılmadığı için onlara değen bağ ve duraklar da dışarıda kalır
	const kimlikler = new Set(dugumListesi.map((d) => d.id));
	const adimlar = izListesi.length
		? await db
				.select({ izId: izAdimlari.izId, dugumId: izAdimlari.dugumId, not: izAdimlari.not })
				.from(izAdimlari)
				.where(
					inArray(
						izAdimlari.izId,
						izListesi.map((i) => i.id)
					)
				)
				.orderBy(asc(izAdimlari.izId), asc(izAdimlari.sira))
		: [];

	return {
		bicim: DISA_AKTARMA_BICIMI,
		surum: DISA_AKTARMA_SURUMU,
		olusturma: new Date().toISOString(),
		hesap: hesap ?? { kullaniciAdi: '', ad: '', hakkinda: null },
		dugumler: dugumListesi,
		baglar: bagListesi.filter((b) => kimlikler.has(b.kaynakId) && kimlikler.has(b.hedefId)),
		izler: izListesi.map(({ id, ...iz }) => ({
			...iz,
			duraklar: adimlar
				.filter((a) => a.izId === id && kimlikler.has(a.dugumId))
				.map((a) => ({ dugumId: a.dugumId, not: a.not }))
		}))
	};
}

export type IceAktarmaRaporu = {
	dugum: number;
	birlesen: number;
	bag: number;
	iz: number;
	atlanan: number;
};

/**
 * Doğrulanmış veriyi tek işlemde ekler. Eski kimlikler yeni kimliklere eşlenir; aynı dış eser
 * kullanıcının haritasında zaten varsa o düğüm kullanılır ("birleşen").
 */
export async function iceAktar(
	sahipId: string,
	dogrulanmis: Extract<IceAktarmaSonucu, { tamam: true }>
): Promise<IceAktarmaRaporu> {
	const { veri, atlanan } = dogrulanmis;
	return db.transaction(async (tx) => {
		const eslesme = new Map<string, string>();
		let birlesen = 0;

		const varolanlar = await tx
			.select({ id: dugumler.id, disKaynak: dugumler.disKaynak, disKimlik: dugumler.disKimlik })
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler), isNotNull(dugumler.disKimlik)));
		const disler = new Map(varolanlar.map((v) => [`${v.disKaynak}:${v.disKimlik}`, v.id]));

		const yeniler: (typeof veri.dugumler)[number][] = [];
		// Aynı dosyada aynı dış eser iki kez varsa ikincisi birincisine eşlenir
		const dosyaIci = new Map<string, string>();
		const ertelenen: { eskiId: string; anahtar: string }[] = [];
		for (const d of veri.dugumler) {
			const anahtar = d.disKimlik ? `${d.disKaynak}:${d.disKimlik}` : null;
			const varolan = anahtar ? disler.get(anahtar) : undefined;
			if (varolan) {
				eslesme.set(d.id, varolan);
				birlesen++;
			} else if (anahtar && dosyaIci.has(anahtar)) {
				ertelenen.push({ eskiId: d.id, anahtar });
				birlesen++;
			} else {
				yeniler.push(d);
				if (anahtar) dosyaIci.set(anahtar, d.id);
			}
		}

		// Toplu ekleme: parametre sınırına takılmamak için parçalar hâlinde
		for (let i = 0; i < yeniler.length; i += 500) {
			const parca = yeniler.slice(i, i + 500);
			const eklenen = await tx
				.insert(dugumler)
				.values(parca.map(({ id: _id, x: _x, y: _y, ...d }) => ({ ...d, sahipId })))
				.returning({ id: dugumler.id });
			parca.forEach((d, j) => eslesme.set(d.id, eklenen[j].id));
		}
		for (const { eskiId, anahtar } of ertelenen) {
			eslesme.set(eskiId, eslesme.get(dosyaIci.get(anahtar)!)!);
		}

		const konumlar = yeniler
			.filter((d) => d.x != null && d.y != null)
			.map((d) => ({ dugumId: eslesme.get(d.id)!, x: d.x!, y: d.y! }));
		for (let i = 0; i < konumlar.length; i += 1000) {
			await tx
				.insert(agKonumlari)
				.values(konumlar.slice(i, i + 1000))
				.onConflictDoNothing();
		}

		let bag = 0;
		const bagSatirlari = veri.baglar
			.map((b) => ({
				sahipId,
				kaynakId: eslesme.get(b.kaynakId)!,
				hedefId: eslesme.get(b.hedefId)!,
				not: b.not,
				tarih: b.tarih,
				tarihHassasiyeti: b.tarihHassasiyeti
			}))
			.filter((b) => b.kaynakId && b.hedefId && b.kaynakId !== b.hedefId);
		for (let i = 0; i < bagSatirlari.length; i += 1000) {
			const eklenen = await tx
				.insert(baglar)
				.values(bagSatirlari.slice(i, i + 1000))
				.onConflictDoNothing({ target: [baglar.kaynakId, baglar.hedefId] })
				.returning({ id: baglar.id });
			bag += eklenen.length;
		}

		for (const iz of veri.izler) {
			const [yeni] = await tx
				.insert(izler)
				.values({ sahipId, baslik: iz.baslik, aciklama: iz.aciklama, gizlilik: iz.gizlilik })
				.returning({ id: izler.id });
			const gorulen = new Set<string>();
			const duraklar = iz.duraklar
				.map((d) => ({ dugumId: eslesme.get(d.dugumId)!, not: d.not }))
				.filter((d) => d.dugumId && !gorulen.has(d.dugumId) && gorulen.add(d.dugumId));
			if (duraklar.length) {
				await tx
					.insert(izAdimlari)
					.values(duraklar.map((d, j) => ({ izId: yeni.id, sira: j + 1, ...d })));
			}
		}

		return { dugum: yeniler.length, birlesen, bag, iz: veri.izler.length, atlanan };
	});
}
