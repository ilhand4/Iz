// Keşif: kanonik eser çekirdeği üzerinden başkalarının yalnızca herkese açık izlerinden ve
// bağlarından öneriler. Özel notlar, özel düğümler ve özel izler hiç kullanılmaz.
// Puan yok: öneriler insanların gerçekten yürüdüğü yollardan gelir.
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { dugumler, izler, kanonikEserler, kullanicilar } from './db/schema';
import { satirlar } from './dugumler';
import { izleriListele } from './izler';

async function dugumunKanonigi(dugumId: string) {
	const [d] = await db
		.select({ kanonikEserId: dugumler.kanonikEserId, sahipId: dugumler.sahipId })
		.from(dugumler)
		.where(eq(dugumler.id, dugumId));
	return d?.kanonikEserId ? { kanonik: d.kanonikEserId, sahipId: d.sahipId } : null;
}

/**
 * Kör kesişim: aynı eseri haritasına ekleyen başkalarının, o eserin durak olduğu herkese açık
 * izleri. Eserin başkasındaki düğümü de herkese açık olmalı.
 */
export async function korKesisim(dugumId: string, limit = 6) {
	const k = await dugumunKanonigi(dugumId);
	if (!k) return [];
	const bulunan = satirlar<{ iz_id: string }>(
		await db.execute(sql`
			select distinct i.id as iz_id, i.guncelleme
			from izler i
			join iz_adimlari a on a.iz_id = i.id
			join dugumler d on d.id = a.dugum_id
			where d.kanonik_eser_id = ${k.kanonik}
				and d.gizlilik = 'herkes' and d.silinme is null
				and i.gizlilik = 'herkes' and i.silinme is null
				and i.sahip_id <> ${k.sahipId}
			order by i.guncelleme desc
			limit ${limit}
		`)
	);
	if (!bulunan.length) return [];
	const ozetler = await izleriListele(null, {
		izleyenId: null,
		idler: bulunan.map((b) => b.iz_id),
		limit
	});
	const sahipler = await db
		.select({ izId: izler.id, ad: kullanicilar.ad, kullaniciAdi: kullanicilar.kullaniciAdi })
		.from(izler)
		.innerJoin(kullanicilar, eq(izler.sahipId, kullanicilar.id))
		.where(
			inArray(
				izler.id,
				bulunan.map((b) => b.iz_id)
			)
		);
	const sahibi = new Map(sahipler.map((s) => [s.izId, { ad: s.ad, kullaniciAdi: s.kullaniciAdi }]));
	return ozetler.map((o) => ({ ...o, sahip: sahibi.get(o.id) ?? null }));
}

export type KesifOnerisi = {
	kanonikId: string;
	baslik: string;
	altBaslik: string | null;
	eserTuru: string;
	yil: number | null;
	kisi: number;
};

/**
 * Keşif yolları: bu eserden (başkalarının herkese açık düğümlerinden) çıkan herkese açık
 * bağların vardığı eserler; kaç farklı kişinin o yoldan gittiğine göre. Haritanda zaten
 * olan eserler önerilmez.
 */
export async function kesifYollari(dugumId: string, limit = 5): Promise<KesifOnerisi[]> {
	const k = await dugumunKanonigi(dugumId);
	if (!k) return [];
	const sonuc = satirlar<{
		id: string;
		baslik: string;
		alt_baslik: string | null;
		eser_turu: string;
		yil: number | null;
		kisi: number | string;
	}>(
		await db.execute(sql`
			select k2.id, k2.baslik, k2.alt_baslik, k2.eser_turu, k2.yil,
				count(distinct b.sahip_id) as kisi
			from dugumler d1
			join baglar b on b.kaynak_id = d1.id
			join dugumler d2 on d2.id = b.hedef_id
			join kanonik_eserler k2 on k2.id = d2.kanonik_eser_id
			where d1.kanonik_eser_id = ${k.kanonik}
				and d1.sahip_id <> ${k.sahipId}
				and d1.gizlilik = 'herkes' and d1.silinme is null
				and d2.gizlilik = 'herkes' and d2.silinme is null
				and k2.id <> ${k.kanonik}
				and not exists (
					select 1 from dugumler m
					where m.sahip_id = ${k.sahipId} and m.kanonik_eser_id = k2.id and m.silinme is null
				)
			group by k2.id, k2.baslik, k2.alt_baslik, k2.eser_turu, k2.yil
			order by kisi desc, k2.baslik
			limit ${limit}
		`)
	);
	return sonuc.map((s) => ({
		kanonikId: s.id,
		baslik: s.baslik,
		altBaslik: s.alt_baslik,
		eserTuru: s.eser_turu,
		yil: s.yil,
		kisi: Number(s.kisi)
	}));
}

/** Kanonik kaydı, yeni düğüm verisine çevirir (dış kimlik anahtardan geri çıkarılır) */
export async function kanonikGetir(id: string) {
	const [k] = await db.select().from(kanonikEserler).where(eq(kanonikEserler.id, id));
	if (!k) return null;
	const m = /^(openlibrary|tmdb):(.+)$/.exec(k.anahtar);
	return { ...k, disKaynak: m?.[1] ?? null, disKimlik: m?.[2] ?? null };
}

/** Kullanıcının bu kanonik esere bağlı (çöpte olmayan) düğümü */
export async function kanonikDugumu(sahipId: string, kanonikId: string) {
	const [d] = await db
		.select({ id: dugumler.id })
		.from(dugumler)
		.where(
			and(
				eq(dugumler.sahipId, sahipId),
				eq(dugumler.kanonikEserId, kanonikId),
				sql`${dugumler.silinme} is null`
			)
		);
	return d?.id ?? null;
}
