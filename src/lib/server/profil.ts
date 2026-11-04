// Herkese açık profil: başkalarının gördüğü hâliyle (sahibi baksa bile) yalnızca "herkes" içerik.
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { agKonumlari, baglar, dugumler, kullanicilar } from './db/schema';
import { gorunurluk, type HaritaBagi, type HaritaDugumu } from './dugumler';
import { izleriListele } from './izler';

const kaynakD = alias(dugumler, 'kaynak');
const hedefD = alias(dugumler, 'hedef');

export async function profilGetir(kullaniciAdi: string) {
	const [k] = await db
		.select({
			id: kullanicilar.id,
			kullaniciAdi: kullanicilar.kullaniciAdi,
			ad: kullanicilar.ad,
			hakkinda: kullanicilar.hakkinda,
			aramaMotorlari: kullanicilar.aramaMotorlari,
			olusturma: kullanicilar.olusturma
		})
		.from(kullanicilar)
		.where(eq(kullanicilar.kullaniciAdi, kullaniciAdi));
	return k ?? null;
}

/** Profilin açık haritası: herkese açık düğümler (sahibinin ağ yerleşimiyle) ve aralarındaki bağlar */
export async function profilVerisi(sahipId: string) {
	const [dugumListesi, bagListesi, izListesi] = await Promise.all([
		db
			.select({
				id: dugumler.id,
				tur: dugumler.tur,
				eserTuru: dugumler.eserTuru,
				baslik: dugumler.baslik,
				altBaslik: dugumler.altBaslik,
				gorselUrl: dugumler.gorselUrl,
				gizlilik: dugumler.gizlilik,
				tarih: dugumler.tarih,
				tarihHassasiyeti: dugumler.tarihHassasiyeti,
				durum: dugumler.durum,
				yerAdi: dugumler.yerAdi,
				x: agKonumlari.x,
				y: agKonumlari.y
			})
			.from(dugumler)
			.leftJoin(agKonumlari, eq(agKonumlari.dugumId, dugumler.id))
			.where(and(eq(dugumler.sahipId, sahipId), gorunurluk(dugumler, null)))
			.orderBy(asc(dugumler.tarih), asc(dugumler.baslik))
			.limit(2000),
		db
			.select({
				id: baglar.id,
				kaynakId: baglar.kaynakId,
				hedefId: baglar.hedefId,
				not: baglar.not
			})
			.from(baglar)
			.innerJoin(kaynakD, eq(baglar.kaynakId, kaynakD.id))
			.innerJoin(hedefD, eq(baglar.hedefId, hedefD.id))
			.where(and(eq(baglar.sahipId, sahipId), gorunurluk(kaynakD, null), gorunurluk(hedefD, null)))
			.limit(10000),
		izleriListele(sahipId, { izleyenId: null, limit: 50 })
	]);
	return {
		dugumler: dugumListesi as HaritaDugumu[],
		baglar: bagListesi as HaritaBagi[],
		izler: izListesi
	};
}
