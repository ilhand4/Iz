import { fail, redirect } from '@sveltejs/kit';
import { dugumTuruMu, eserTuruMu } from '#lib/sabitler.ts';
import { alan, dugumDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import { bagKur, dugumGetir, dugumOlustur } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

/** ?kaynak=<id> ile gelindiyse yeni düğüm o düğüme "götürdü" bağıyla eklenir */
async function kaynakDugum(kaynakId: string | null, kullaniciId: string) {
	if (!uuidMu(kaynakId)) return null;
	const sonuc = await dugumGetir(kaynakId, kullaniciId);
	return sonuc && sonuc.dugum.sahipId === kullaniciId
		? { id: sonuc.dugum.id, baslik: sonuc.dugum.baslik }
		: null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const tur = url.searchParams.get('tur');
	const eserTuru = url.searchParams.get('eserTuru');
	return {
		kaynak: await kaynakDugum(url.searchParams.get('kaynak'), kullanici.id),
		baslangic: {
			tur: dugumTuruMu(tur) ? tur : 'eser',
			eserTuru: eserTuruMu(eserTuru) ? eserTuru : 'kitap'
		} as Record<string, string>
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const sonuc = dugumDogrula(fd);
		const bagNotu = alan(fd, 'bagNotu').slice(0, 1000);
		if (!sonuc.tamam) {
			return fail(400, { hatalar: sonuc.hatalar, degerler: { ...sonuc.degerler, bagNotu } });
		}

		const yeni = await dugumOlustur(kullanici.id, sonuc.veri);
		const kaynak = await kaynakDugum(url.searchParams.get('kaynak'), kullanici.id);
		if (kaynak) {
			await bagKur(kullanici.id, {
				kaynakId: kaynak.id,
				hedefId: yeni.id,
				not: bagNotu || null,
				tarih: null,
				tarihHassasiyeti: null
			});
		}
		redirect(303, `/dugumler/${yeni.id}?eklendi=1`);
	}
};
