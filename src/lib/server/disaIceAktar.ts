// Dışa aktarma sorgusu ve içe aktarma yazımı (biçim ve doğrulama: veriTasima.ts).
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from './db';
import {
	agKonumlari,
	alintilar,
	baglar,
	donemler,
	dugumler,
	izAdimlari,
	izler,
	kararlar,
	kullanicilar
} from './db/schema';
import { etkin } from './dugumler';
import { kararSonucuMu } from '../kararDefteri';
import { bagTuruMu, etkiMi, type DonemRengi } from '../sabitler';
import {
	DISA_AKTARMA_BICIMI,
	DISA_AKTARMA_SURUMU,
	type DisaAktarma,
	type IceAktarmaSonucu
} from './veriTasima';

/** Kullanıcının çöp kutusu dışındaki tüm verisi */
export async function disaAktar(sahipId: string): Promise<DisaAktarma> {
	const [[hesap], dugumListesi, bagListesi, izListesi, alintiListesi, donemListesi] =
		await Promise.all([
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
					y: agKonumlari.y,
					etki: dugumler.etki,
					wikidata: dugumler.wikidata,
					// İç içe nesne yerine düz alanlar: sol birleşimde Drizzle iç içe nesneyi boşaltabiliyor
					kararVar: kararlar.dugumId,
					kGerekce: kararlar.gerekce,
					kBeklenti: kararlar.beklenti,
					kGuven: kararlar.guven,
					kSorulacak: kararlar.sorulacak,
					kSonuc: kararlar.sonuc,
					kSonucNotu: kararlar.sonucNotu,
					kSonucTarihi: kararlar.sonucTarihi
				})
				.from(dugumler)
				.leftJoin(agKonumlari, eq(agKonumlari.dugumId, dugumler.id))
				.leftJoin(kararlar, eq(kararlar.dugumId, dugumler.id))
				.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
				.orderBy(asc(dugumler.olusturma)),
			db
				.select({
					kaynakId: baglar.kaynakId,
					hedefId: baglar.hedefId,
					not: baglar.not,
					tarih: baglar.tarih,
					tarihHassasiyeti: baglar.tarihHassasiyeti,
					tur: baglar.tur,
					alintiId: baglar.alintiId
				})
				.from(baglar)
				.where(eq(baglar.sahipId, sahipId))
				.orderBy(asc(baglar.olusturma)),
			db
				.select({
					id: izler.id,
					baslik: izler.baslik,
					aciklama: izler.aciklama,
					gizlilik: izler.gizlilik,
					ataIzId: izler.ataIzId,
					ayrilmaSirasi: izler.ayrilmaSirasi
				})
				.from(izler)
				.where(and(eq(izler.sahipId, sahipId), etkin(izler)))
				.orderBy(asc(izler.olusturma)),
			db
				.select({
					id: alintilar.id,
					dugumId: alintilar.dugumId,
					metin: alintilar.metin,
					yer: alintilar.yer
				})
				.from(alintilar)
				.where(eq(alintilar.sahipId, sahipId))
				.orderBy(asc(alintilar.olusturma)),
			db
				.select({
					ad: donemler.ad,
					baslangic: donemler.baslangic,
					bitis: donemler.bitis,
					renk: donemler.renk
				})
				.from(donemler)
				.where(eq(donemler.sahipId, sahipId))
				.orderBy(asc(donemler.baslangic))
		]);

	// Çöpteki düğümler aktarılmadığı için onlara değen bağ, durak ve alıntılar da dışarıda kalır
	const kimlikler = new Set(dugumListesi.map((d) => d.id));
	const izKimlikleri = new Set(izListesi.map((i) => i.id));
	const gorunenAlintilar = alintiListesi.filter((a) => kimlikler.has(a.dugumId));
	const alintiKimlikleri = new Set(gorunenAlintilar.map((a) => a.id));
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
		dugumler: dugumListesi.map(
			({
				kararVar,
				kGerekce,
				kBeklenti,
				kGuven,
				kSorulacak,
				kSonuc,
				kSonucNotu,
				kSonucTarihi,
				etki,
				...d
			}) => ({
				...d,
				etki: etkiMi(etki) ? etki : null,
				karar: kararVar
					? {
							gerekce: kGerekce,
							beklenti: kBeklenti,
							guven: kGuven,
							sorulacak: kSorulacak,
							sonuc: kararSonucuMu(kSonuc) ? kSonuc : null,
							sonucNotu: kSonucNotu,
							sonucTarihi: kSonucTarihi ? new Date(kSonucTarihi).toISOString() : null
						}
					: null
			})
		),
		baglar: bagListesi
			.filter((b) => kimlikler.has(b.kaynakId) && kimlikler.has(b.hedefId))
			.map(({ tur, alintiId, ...b }) => ({
				...b,
				tur: bagTuruMu(tur) ? tur : null,
				alintiId: alintiId && alintiKimlikleri.has(alintiId) ? alintiId : null
			})),
		izler: izListesi.map(({ id, ataIzId, ayrilmaSirasi, ...iz }) => ({
			id,
			...iz,
			ataIzId: ataIzId && izKimlikleri.has(ataIzId) ? ataIzId : null,
			ayrilmaSirasi: ataIzId && izKimlikleri.has(ataIzId) ? ayrilmaSirasi : null,
			duraklar: adimlar
				.filter((a) => a.izId === id && kimlikler.has(a.dugumId))
				.map((a) => ({ dugumId: a.dugumId, not: a.not }))
		})),
		alintilar: gorunenAlintilar,
		donemler: donemListesi.map((d) => ({ ...d, renk: d.renk as DonemRengi }))
	};
}

export type IceAktarmaRaporu = {
	dugum: number;
	birlesen: number;
	bag: number;
	iz: number;
	alinti: number;
	donem: number;
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
				.values(parca.map(({ id: _id, x: _x, y: _y, karar: _k, ...d }) => ({ ...d, sahipId })))
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

		// Karar defteri ve alıntılar yalnızca yeni açılan düğümlere (birleşen düğümün kendi defteri korunur)
		const kararSatirlari = yeniler
			.filter((d) => d.karar)
			.map((d) => ({
				dugumId: eslesme.get(d.id)!,
				...d.karar!,
				sonucTarihi: d.karar!.sonucTarihi ? new Date(d.karar!.sonucTarihi) : null
			}));
		for (let i = 0; i < kararSatirlari.length; i += 500) {
			await tx
				.insert(kararlar)
				.values(kararSatirlari.slice(i, i + 500))
				.onConflictDoNothing();
		}

		const yeniKimlikler = new Set(yeniler.map((d) => d.id));
		const alintiEslesme = new Map<string, string>();
		const alintiListesi = (veri.alintilar ?? []).filter((a) => yeniKimlikler.has(a.dugumId));
		for (let i = 0; i < alintiListesi.length; i += 1000) {
			const parca = alintiListesi.slice(i, i + 1000);
			const eklenen = await tx
				.insert(alintilar)
				.values(
					parca.map((a) => ({
						sahipId,
						dugumId: eslesme.get(a.dugumId)!,
						metin: a.metin,
						yer: a.yer
					}))
				)
				.returning({ id: alintilar.id });
			parca.forEach((a, j) => alintiEslesme.set(a.id, eklenen[j].id));
		}

		let bag = 0;
		const bagSatirlari = veri.baglar
			.map((b) => ({
				sahipId,
				kaynakId: eslesme.get(b.kaynakId)!,
				hedefId: eslesme.get(b.hedefId)!,
				not: b.not,
				tarih: b.tarih,
				tarihHassasiyeti: b.tarihHassasiyeti,
				tur: b.tur ?? null,
				alintiId: (b.alintiId && alintiEslesme.get(b.alintiId)) || null
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

		const izEslesme = new Map<string, string>();
		for (const iz of veri.izler) {
			const [yeni] = await tx
				.insert(izler)
				.values({ sahipId, baslik: iz.baslik, aciklama: iz.aciklama, gizlilik: iz.gizlilik })
				.returning({ id: izler.id });
			if (iz.id) izEslesme.set(iz.id, yeni.id);
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

		// Çatallanma: ata iz dosyada sonra gelebilir, bu yüzden hepsi eklendikten sonra
		for (const iz of veri.izler) {
			const ata = iz.ataIzId ? izEslesme.get(iz.ataIzId) : undefined;
			if (!iz.id || !ata) continue;
			await tx
				.update(izler)
				.set({ ataIzId: ata, ayrilmaSirasi: iz.ayrilmaSirasi ?? null })
				.where(eq(izler.id, izEslesme.get(iz.id)!));
		}

		const donemListesi = veri.donemler ?? [];
		if (donemListesi.length) {
			await tx.insert(donemler).values(donemListesi.map((d) => ({ ...d, sahipId })));
		}

		return {
			dugum: yeniler.length,
			birlesen,
			bag,
			iz: veri.izler.length,
			alinti: alintiListesi.length,
			donem: donemListesi.length,
			atlanan
		};
	});
}
