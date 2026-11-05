// Anlatılandan düğüm önerileri: anının açıklaması ve seslerinin metni yerel kurallarla taranır
// (varliklar.ts). Kullanıcının onayladıkları tek işlemde yazılır: yeni kişi/yer düğümleri (özel),
// onlardan anıya bağlar ve (tarihi yoksa) anının yılı.
import { and, eq, isNotNull } from 'drizzle-orm';
import { varlikCikar } from '../varliklar';
import { db } from './db';
import { baglar, dugumler, sesler } from './db/schema';
import { dugumSecenekleri, etkin, muhursuz } from './dugumler';

export const ONERI_NOTU = 'Anlatırken geçti';

export async function anlatiOnerileri(sahipId: string, dugumId: string) {
	const [d] = await db
		.select({ baslik: dugumler.baslik, aciklama: dugumler.aciklama, tarih: dugumler.tarih })
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
	const metinler = await db
		.select({ metin: sesler.metin })
		.from(sesler)
		.where(and(eq(sesler.dugumId, dugumId), isNotNull(sesler.metin)));
	const metin = [d.aciklama ?? '', ...metinler.map((m) => m.metin ?? '')].join('\n\n').trim();
	const mevcut = await dugumSecenekleri(sahipId, dugumId);
	const zatenBagli = new Set(
		(
			await db.select({ kaynakId: baglar.kaynakId }).from(baglar).where(eq(baglar.hedefId, dugumId))
		).map((b) => b.kaynakId)
	);
	const sonuc = varlikCikar(metin, mevcut);
	return {
		baslik: d.baslik,
		tarihVar: !!d.tarih,
		bosMu: !metin,
		eslesenler: sonuc.eslesenler.map((e) => ({ ...e, bagli: zatenBagli.has(e.id) })),
		yeniler: sonuc.yeniler,
		yillar: sonuc.yillar
	};
}

export type OneriSecimi = {
	baglanacak: string[];
	yeniler: { ad: string; tur: 'kisi' | 'yer' }[];
	yil: number | null;
};

export async function onerileriUygula(sahipId: string, dugumId: string, secim: OneriSecimi) {
	return db.transaction(async (tx) => {
		const [d] = await tx
			.select({ tarih: dugumler.tarih })
			.from(dugumler)
			.where(
				and(
					eq(dugumler.id, dugumId),
					eq(dugumler.sahipId, sahipId),
					etkin(dugumler),
					muhursuz(dugumler)
				)
			)
			.for('update');
		if (!d) return null;
		const kaynaklar: string[] = [];
		if (secim.baglanacak.length) {
			const sahipli = await tx
				.select({ id: dugumler.id })
				.from(dugumler)
				.where(and(eq(dugumler.sahipId, sahipId), etkin(dugumler)));
			const izinli = new Set(sahipli.map((s) => s.id));
			kaynaklar.push(...secim.baglanacak.filter((id) => izinli.has(id) && id !== dugumId));
		}
		if (secim.yeniler.length) {
			const eklenen = await tx
				.insert(dugumler)
				.values(secim.yeniler.map((y) => ({ sahipId, tur: y.tur, baslik: y.ad })))
				.returning({ id: dugumler.id });
			kaynaklar.push(...eklenen.map((e) => e.id));
		}
		let bag = 0;
		if (kaynaklar.length) {
			const kurulan = await tx
				.insert(baglar)
				.values(kaynaklar.map((k) => ({ sahipId, kaynakId: k, hedefId: dugumId, not: ONERI_NOTU })))
				.onConflictDoNothing()
				.returning({ id: baglar.id });
			bag = kurulan.length;
		}
		let yil = false;
		if (secim.yil && !d.tarih) {
			await tx
				.update(dugumler)
				.set({ tarih: `${secim.yil}-01-01`, tarihHassasiyeti: 'yil' })
				.where(eq(dugumler.id, dugumId));
			yil = true;
		}
		return { yeni: secim.yeniler.length, bag, yil };
	});
}
