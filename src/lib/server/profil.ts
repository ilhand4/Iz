// Herkese açık profil: başkalarının gördüğü hâliyle (sahibi baksa bile) yalnızca "herkes" içerik.
import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { agKonumlari, baglar, dugumler, kullanicilar } from './db/schema';
import { dolayliBaglar } from '../dolayli';
import { etkin, type HaritaBagi, type HaritaDugumu } from './dugumler';
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

export type ProfilAgDugumu = HaritaDugumu & { golge?: boolean };
export type ProfilAgBagi = HaritaBagi & { dolayli?: boolean };

/**
 * Profilin açık haritası. Herkese açık düğümler içerikleriyle; "gölge" düğümler yalnızca tür
 * şekliyle ve her istekte yeniden üretilen anonim kimlikle; gizli düğümlerden geçen yollar tek
 * bir "dolaylı" bağ olarak (aradaki düğümlerin sayısı, türü ve notları sızmadan).
 */
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
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
			.orderBy(asc(dugumler.tarih), asc(dugumler.baslik))
			.limit(5000),
		// Sahibin tüm bağları yalnızca sunucuda, dolaylı yolları bulmak için okunur
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
			.where(and(eq(baglar.sahipId, sahipId), etkin(kaynakD), etkin(hedefD)))
			.limit(20000),
		izleriListele(sahipId, { izleyenId: null, limit: 50 })
	]);

	const acik = dugumListesi.filter((d) => d.gizlilik === 'herkes') as HaritaDugumu[];
	const golgeler = dugumListesi.filter((d) => d.gizlilik === 'golge');
	const anonim = new Map(golgeler.map((d) => [d.id, `g-${randomUUID()}`]));
	const gorunur = new Set([...acik.map((d) => d.id), ...golgeler.map((d) => d.id)]);
	const disaKimlik = (id: string) => anonim.get(id) ?? id;

	const agDugumleri: ProfilAgDugumu[] = [
		...acik,
		...golgeler.map((d) => ({
			id: anonim.get(d.id)!,
			tur: d.tur,
			eserTuru: null,
			baslik: '',
			altBaslik: null,
			gorselUrl: null,
			gizlilik: 'golge' as const,
			tarih: null,
			tarihHassasiyeti: null,
			durum: null,
			yerAdi: null,
			x: d.x,
			y: d.y,
			golge: true
		}))
	];
	const dogrudan: ProfilAgBagi[] = bagListesi
		.filter((b) => gorunur.has(b.kaynakId) && gorunur.has(b.hedefId))
		.map((b) => {
			const ikisiAcik = !anonim.has(b.kaynakId) && !anonim.has(b.hedefId);
			return {
				id: ikisiAcik ? b.id : `b-${randomUUID()}`,
				kaynakId: disaKimlik(b.kaynakId),
				hedefId: disaKimlik(b.hedefId),
				not: ikisiAcik ? b.not : null
			};
		});
	const dolaylilar: ProfilAgBagi[] = dolayliBaglar(gorunur, bagListesi).map((b) => ({
		id: `d-${randomUUID()}`,
		kaynakId: disaKimlik(b.kaynakId),
		hedefId: disaKimlik(b.hedefId),
		not: null,
		dolayli: true
	}));

	return {
		/** Kartlarda yalnızca herkese açık düğümler */
		dugumler: acik,
		ag: { dugumler: agDugumleri, baglar: [...dogrudan, ...dolaylilar] },
		izler: izListesi
	};
}
