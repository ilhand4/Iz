import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { TMDB_ANAHTARI } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { dugumler } from '#lib/server/db/schema.ts';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { bagKur, disKaynaktanBul, dugumGetir, dugumOlustur } from '#lib/server/dugumler.ts';
import {
	AramaHatasi,
	ARAMA_TURLERI,
	disKimlikGecerliMi,
	gorselGuvenliMi,
	kitapAra,
	tmdbAra,
	type AramaTuru,
	type EserSonucu
} from '#lib/server/eserArama.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { eserTuruMu } from '#lib/sabitler.ts';
import type { Actions, PageServerLoad } from './$types';

function aramaTuru(deger: string | null): AramaTuru {
	return (ARAMA_TURLERI as readonly string[]).includes(deger ?? '') ? (deger as AramaTuru) : 'kitap';
}

async function kaynakDugum(kaynakId: string | null, kullaniciId: string) {
	if (!uuidMu(kaynakId)) return null;
	const sonuc = await dugumGetir(kaynakId, kullaniciId);
	return sonuc && sonuc.dugum.sahipId === kullaniciId
		? { id: sonuc.dugum.id, baslik: sonuc.dugum.baslik }
		: null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const tur = aramaTuru(url.searchParams.get('tur'));
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
	const tmdbEtkin = !!TMDB_ANAHTARI;
	const kaynak = await kaynakDugum(url.searchParams.get('kaynak'), kullanici.id);

	let sonuclar: EserSonucu[] = [];
	let hata: string | null = null;
	if (q.length >= 2) {
		try {
			if (tur === 'kitap') sonuclar = await kitapAra(q);
			else if (TMDB_ANAHTARI) sonuclar = await tmdbAra(q, tur, TMDB_ANAHTARI);
		} catch (e) {
			if (e instanceof AramaHatasi) hata = e.message;
			else throw e;
		}
	}

	// Kullanıcının zaten eklediği eserler: "Ekle" yerine "Düğüme git" gösterilir
	const mevcut: Record<string, string> = {};
	if (sonuclar.length) {
		const satirlar = await db
			.select({ id: dugumler.id, disKimlik: dugumler.disKimlik })
			.from(dugumler)
			.where(
				and(
					eq(dugumler.sahipId, kullanici.id),
					eq(dugumler.disKaynak, sonuclar[0].kaynak),
					inArray(
						dugumler.disKimlik,
						sonuclar.map((s) => s.disKimlik)
					)
				)
			);
		for (const s of satirlar) if (s.disKimlik) mevcut[s.disKimlik] = s.id;
	}

	return { tur, q, sonuclar, hata, tmdbEtkin, mevcut, kaynak };
};

export const actions: Actions = {
	ekle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();

		// Arama sonucundan gelen alanlar istemciden geldiği için yeniden doğrulanır
		const kaynak = alan(fd, 'kaynak');
		const disKimlik = alan(fd, 'disKimlik');
		const eserTuru = alan(fd, 'eserTuru');
		const baslik = alan(fd, 'baslik').slice(0, 200);
		const altBaslik = alan(fd, 'altBaslik').slice(0, 200) || null;
		const yilMetni = alan(fd, 'yil');
		const gorselUrl = alan(fd, 'gorselUrl');

		const kaynakUygun =
			(kaynak === 'openlibrary' && eserTuru === 'kitap') ||
			(kaynak === 'tmdb' && (eserTuru === 'film' || eserTuru === 'dizi'));
		if (!kaynakUygun || !disKimlikGecerliMi(kaynak, disKimlik) || !eserTuruMu(eserTuru) || !baslik) {
			return fail(400, { hata: 'Eser bilgisi geçersiz. Aramayı yenileyip tekrar deneyin.' });
		}
		if (gorselUrl && !gorselGuvenliMi(gorselUrl)) error(400, 'Geçersiz görsel adresi.');
		const yil = /^\d{4}$/.test(yilMetni) ? Number(yilMetni) : null;

		const kaynakDugumu = await kaynakDugum(url.searchParams.get('kaynak'), kullanici.id);
		const varolan = await disKaynaktanBul(kullanici.id, kaynak, disKimlik);
		const dugumId =
			varolan?.id ??
			(
				await dugumOlustur(kullanici.id, {
					tur: 'eser',
					eserTuru,
					baslik,
					altBaslik,
					aciklama: null,
					tarih: null,
					tarihHassasiyeti: null,
					yil,
					enlem: null,
					boylam: null,
					yerAdi: null,
					gizlilik: 'ozel',
					disKaynak: kaynak,
					disKimlik,
					gorselUrl: gorselUrl || null
				})
			).id;

		if (kaynakDugumu && kaynakDugumu.id !== dugumId) {
			await bagKur(kullanici.id, {
				kaynakId: kaynakDugumu.id,
				hedefId: dugumId,
				not: null,
				tarih: null,
				tarihHassasiyeti: null
			});
		}
		redirect(303, `/dugumler/${dugumId}${varolan ? '' : '?eklendi=1'}`);
	}
};
