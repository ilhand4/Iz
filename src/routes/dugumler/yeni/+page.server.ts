import { error, fail, redirect } from '@sveltejs/kit';
import { dugumTuruMu, eserTuruMu } from '#lib/sabitler.ts';
import { dugumDogrula, getirenDogrula, uuidMu, type Hatalar } from '#lib/server/dogrulama.ts';
import { dugumSecenekleri, dugumVeGetireniKaydet } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const tur = url.searchParams.get('tur');
	const eserTuru = url.searchParams.get('eserTuru');
	const secenekler = await dugumSecenekleri(kullanici.id);

	// ?kaynak=<id>: bir düğümün sayfasından "Yeni düğüm ekle" ile gelindi; o düğüm getiren olur
	const kaynakId = url.searchParams.get('kaynak');
	const kaynak = uuidMu(kaynakId) ? (secenekler.find((s) => s.id === kaynakId) ?? null) : null;

	return {
		secenekler,
		kaynak,
		baslangic: {
			tur: dugumTuruMu(tur) ? tur : 'eser',
			eserTuru: eserTuruMu(eserTuru) ? eserTuru : 'kitap',
			durum: 'bitti',
			...(kaynak ? { getirenKip: 'mevcut', getirenId: kaynak.id } : {})
		} as Record<string, string>
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const sonuc = dugumDogrula(fd);
		const getirenHatalari: Hatalar = {};
		const { getiren, not, degerler: getirenDegerleri } = getirenDogrula(fd, getirenHatalari);

		if (!sonuc.tamam || Object.keys(getirenHatalari).length) {
			return fail(400, {
				hatalar: { ...(sonuc.tamam ? {} : sonuc.hatalar), ...getirenHatalari },
				degerler: { ...(sonuc.tamam ? {} : sonuc.degerler), ...getirenDegerleri }
			});
		}

		const kayit = await dugumVeGetireniKaydet(
			kullanici.id,
			{ kip: 'yeni', veri: sonuc.veri },
			getiren,
			not
		);
		if (kayit === 'yetkisiz') error(404, 'Seçilen düğüm bulunamadı.');
		redirect(303, `/dugumler/${kayit.dugumId}?eklendi=1`);
	}
};
