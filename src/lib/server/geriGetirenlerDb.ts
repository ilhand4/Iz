// İçe aktarma yazımı ve haritayı geri getiren özelliklerin veritabanı tarafı.
// Hesaplar saf modüllerde (../geriGetirenler.ts, ./disKaynaklar.ts); burada okuma/yazma.
import { and, eq, sql } from 'drizzle-orm';
import {
	bagAviAdayi,
	gununSecimi,
	soruGunuMu,
	yillikKur,
	type YalinDugum
} from '../geriGetirenler';
import { sadelestir } from '../metin';
import { bagKur } from './baglar';
import { db } from './db';
import { alintilar, bagAviRedleri, baglar, dugumler } from './db/schema';
import type { AdayEser } from './disKaynaklar';
import { etkin, muhursuz, satirlar } from './dugumler';
import type { WikidataOzeti } from './wikidata';

/** Kullanıcının çöpte olmayan tüm düğümleri (yalın) ve bağları */
async function yalinHarita(sahipId: string) {
	const [d, b] = await Promise.all([
		db
			.select({
				id: dugumler.id,
				baslik: dugumler.baslik,
				altBaslik: dugumler.altBaslik,
				tur: dugumler.tur,
				tarih: dugumler.tarih,
				tarihHassasiyeti: dugumler.tarihHassasiyeti
			})
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)))
			.limit(10000),
		db
			.select({ kaynakId: baglar.kaynakId, hedefId: baglar.hedefId })
			.from(baglar)
			.where(eq(baglar.sahipId, sahipId))
			.limit(50000)
	]);
	return { dugumler: d as YalinDugum[], baglar: b };
}

// ——— İçe aktarma ———

export type AktarmaRaporu = { eklenen: number; birlesen: number; alinti: number };

/**
 * Aday eserleri haritaya ekler (hepsi özel). Aynı tür + başlık + yapımcıdaki var olan düğüm
 * yeniden eklenmez; alıntıları ona eklenir. Tek işlemde.
 */
export async function adaylariEkle(sahipId: string, adaylar: AdayEser[]): Promise<AktarmaRaporu> {
	return db.transaction(async (tx) => {
		const mevcut = await tx
			.select({
				id: dugumler.id,
				baslik: dugumler.baslik,
				altBaslik: dugumler.altBaslik,
				eserTuru: dugumler.eserTuru
			})
			.from(dugumler)
			.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler), eq(dugumler.tur, 'eser')));
		const anahtar = (t: string | null, b: string, a: string | null) =>
			`${t}|${sadelestir(b)}|${sadelestir(a ?? '')}`;
		const bulunan = new Map(mevcut.map((m) => [anahtar(m.eserTuru, m.baslik, m.altBaslik), m.id]));
		let eklenen = 0;
		let birlesen = 0;
		let alinti = 0;
		for (const a of adaylar) {
			const k = anahtar(a.eserTuru, a.baslik, a.altBaslik);
			let id = bulunan.get(k);
			if (id) birlesen++;
			else {
				const [yeni] = await tx
					.insert(dugumler)
					.values({
						sahipId,
						tur: 'eser',
						eserTuru: a.eserTuru,
						baslik: a.baslik,
						altBaslik: a.altBaslik,
						yil: a.yil,
						tarih: a.tarih,
						tarihHassasiyeti: a.tarihHassasiyeti,
						durum: a.durum,
						gizlilik: 'ozel'
					})
					.returning({ id: dugumler.id });
				id = yeni.id;
				bulunan.set(k, id);
				eklenen++;
			}
			if (a.alintilar.length) {
				const var_ = await tx
					.select({ metin: alintilar.metin })
					.from(alintilar)
					.where(eq(alintilar.dugumId, id));
				const yeniler = a.alintilar.filter((x) => !var_.some((v) => v.metin === x.metin));
				if (yeniler.length) {
					await tx
						.insert(alintilar)
						.values(yeniler.map((x) => ({ sahipId, dugumId: id!, metin: x.metin, yer: x.yer })));
					alinti += yeniler.length;
				}
			}
		}
		return { eklenen, birlesen, alinti };
	});
}

// ——— Bağ avı ———

export async function bagAviSorusu(sahipId: string) {
	const [{ dugumler: d, baglar: b }, redler] = await Promise.all([
		yalinHarita(sahipId),
		db
			.select({ kaynakId: bagAviRedleri.kaynakId, hedefId: bagAviRedleri.hedefId })
			.from(bagAviRedleri)
			.where(eq(bagAviRedleri.sahipId, sahipId))
	]);
	return bagAviAdayi(d, b, redler);
}

/** "Evet": bağ kurulur. "Hayır": çift bir daha sorulmaz. İki uç da kullanıcının olmalı */
export async function bagAviCevapla(
	sahipId: string,
	kaynakId: string,
	hedefId: string,
	cevap: 'evet' | 'hayir',
	not: string | null
) {
	if (cevap === 'evet') {
		const durum = await bagKur(sahipId, {
			kaynakId,
			hedefId,
			not,
			tarih: null,
			tarihHassasiyeti: null
		});
		return durum !== 'yetkisiz';
	}
	const sahip = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				sql`${dugumler.id} in (${kaynakId}::uuid, ${hedefId}::uuid)`
			)
		);
	if (sahip.length !== 2) return false;
	await db.insert(bagAviRedleri).values({ sahipId, kaynakId, hedefId }).onConflictDoNothing();
	return true;
}

// ——— Günün sorusu ve bugün geçmişte ———

function istanbulGunu(t: Date) {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(t);
}

/** Pazartesi/çarşamba/cuma: gelen bağı olmayan bir düğüm için "Bunu nereden duymuştun?" */
export async function gununSorusu(sahipId: string, simdi = new Date()) {
	if (!soruGunuMu(simdi)) return null;
	const adaylar = satirlar<{ id: string; baslik: string; tur: string }>(
		await db.execute(sql`
			select d.id, d.baslik, d.tur from dugumler d
			where d.sahip_id = ${sahipId} and d.silinme is null
				and not exists (select 1 from baglar b where b.hedef_id = d.id)
			order by d.id
			limit 500
		`)
	);
	return gununSecimi(adaylar, istanbulGunu(simdi));
}

/** Günü bilinen düğümlerin yıldönümleri: bugünün ayı ve günü, önceki yıllarda */
export async function bugunGecmiste(sahipId: string, simdi = new Date()) {
	const gun = istanbulGunu(simdi);
	const ayGun = gun.slice(5);
	const yil = Number(gun.slice(0, 4));
	const liste = await db
		.select({ id: dugumler.id, baslik: dugumler.baslik, tur: dugumler.tur, tarih: dugumler.tarih })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				eq(dugumler.tarihHassasiyeti, 'gun'),
				sql`to_char(${dugumler.tarih}, 'MM-DD') = ${ayGun}`,
				sql`extract(year from ${dugumler.tarih}) < ${yil}`
			)
		)
		.limit(10);
	return liste.map((d) => ({ ...d, yilOnce: yil - Number(d.tarih!.slice(0, 4)) }));
}

// ——— İz Yıllığı ———

export async function yillikVerisi(sahipId: string, yil: number) {
	const { dugumler: d, baglar: b } = await yalinHarita(sahipId);
	const yillar = [...new Set(d.map((x) => x.tarih?.slice(0, 4)).filter(Boolean))]
		.map(Number)
		.sort((a, b2) => b2 - a);
	return { yillik: yillikKur(yil, d, b), yillar };
}

// ——— Zenginleştirme ———

/** Eserin yapımcısı (alt başlık) kişi olarak haritada var mı? */
export async function yapimciDugumu(sahipId: string, ad: string) {
	const adaylar = await db
		.select({ id: dugumler.id, baslik: dugumler.baslik })
		.from(dugumler)
		.where(and(eq(dugumler.sahipId, sahipId), eq(dugumler.tur, 'kisi'), etkin(dugumler)));
	return adaylar.find((a) => sadelestir(a.baslik) === sadelestir(ad))?.id ?? null;
}

/** Yapımcıyı (yoksa yeni) kişi düğümü olarak ekler ve kişi → eser bağını kurar */
export async function yapimciyiEkle(sahipId: string, eserId: string, not: string) {
	const [eser] = await db
		.select({ altBaslik: dugumler.altBaslik })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.id, eserId),
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.tur, 'eser'),
				etkin(dugumler)
			)
		);
	const ad = eser?.altBaslik?.split(' · ')[0]?.trim();
	if (!ad) return null;
	let kisiId = await yapimciDugumu(sahipId, ad);
	if (!kisiId) {
		const [yeni] = await db
			.insert(dugumler)
			.values({ sahipId, tur: 'kisi', baslik: ad.slice(0, 200), gizlilik: 'ozel' })
			.returning({ id: dugumler.id });
		kisiId = yeni.id;
	}
	await bagKur(sahipId, {
		kaynakId: kisiId,
		hedefId: eserId,
		not,
		tarih: null,
		tarihHassasiyeti: null
	});
	return kisiId;
}

/** Wikidata özetini düğüme uygular: yalnızca boş alanlar doldurulur */
export async function wikidataUygula(sahipId: string, dugumId: string, o: WikidataOzeti) {
	const [d] = await db
		.select({
			tur: dugumler.tur,
			aciklama: dugumler.aciklama,
			altBaslik: dugumler.altBaslik,
			enlem: dugumler.enlem
		})
		.from(dugumler)
		.where(
			and(
				eq(dugumler.id, dugumId),
				eq(dugumler.sahipId, sahipId),
				etkin(dugumler),
				muhursuz(dugumler)
			)
		);
	if (!d) return null;
	const yillar =
		d.tur === 'kisi' && (o.dogumYili || o.olumYili)
			? `${o.dogumYili ?? '?'}–${o.olumYili ?? ''}`.replace(/–$/, '–')
			: null;
	const degisiklik: Partial<typeof dugumler.$inferInsert> = { wikidata: o.id };
	const doldurulan: string[] = [];
	if (!d.altBaslik && o.aciklama) {
		degisiklik.altBaslik = o.aciklama.slice(0, 200);
		doldurulan.push('kısa bilgi');
	}
	if (!d.aciklama && (o.aciklama || yillar)) {
		degisiklik.aciklama = [o.aciklama, yillar].filter(Boolean).join(' · ');
		doldurulan.push('açıklama');
	}
	if (d.tur === 'yer' && d.enlem === null && o.enlem !== null && o.boylam !== null) {
		degisiklik.enlem = o.enlem;
		degisiklik.boylam = o.boylam;
		doldurulan.push('konum');
	}
	await db.update(dugumler).set(degisiklik).where(eq(dugumler.id, dugumId));
	return doldurulan;
}
