import { error, fail } from '@sveltejs/kit';
import { alan, bagBilgisiDogrula, bagDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import {
	bagGuncelle,
	bagKur,
	bagSil,
	dugumBaglari,
	dugumGetir,
	dugumSecenekleri,
	geldigiYol
} from '#lib/server/dugumler.ts';
import { durakEkle, dugumunIzleri, izSecenekleri } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu düğüm bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	// Geçersiz kimlik de, başkasının özel düğümü de aynı 404'ü alır: varlığı belli olmasın
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const izleyenId = locals.kullanici?.id ?? null;
	const sonuc = await dugumGetir(params.id, izleyenId);
	if (!sonuc) error(404, BULUNAMADI);

	const sahibiMi = sonuc.dugum.sahipId === izleyenId;
	const [baglar, yol, izler, secenekler, eklenebilirIzler] = await Promise.all([
		dugumBaglari(params.id, izleyenId),
		geldigiYol(params.id, izleyenId),
		dugumunIzleri(params.id, izleyenId),
		sahibiMi ? dugumSecenekleri(sonuc.dugum.sahipId, params.id) : Promise.resolve([]),
		sahibiMi ? izSecenekleri(sonuc.dugum.sahipId, params.id) : Promise.resolve([])
	]);

	// Sahip kimliği sayfaya gönderilmez
	const { sahipId: _sahipId, ...dugum } = sonuc.dugum;
	return {
		dugum,
		sahip: sonuc.sahip,
		sahibiMi,
		baglar,
		yol,
		izler,
		secenekler,
		eklenebilirIzler,
		eklendi: url.searchParams.has('eklendi')
	};
};

export const actions: Actions = {
	bagKur: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const fd = await request.formData();
		const yon = alan(fd, 'yon') === 'gelen' ? 'gelen' : 'giden';
		const sonuc = bagDogrula(fd, params.id);
		if (!sonuc.tamam) {
			return fail(400, { bag: { yon, hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}

		const durum = await bagKur(kullanici.id, sonuc.veri);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') {
			return fail(400, {
				bag: {
					yon,
					hatalar: { digerId: 'Bu iki düğüm zaten bu yönde bağlı.' },
					degerler: { digerId: alan(fd, 'digerId'), not: alan(fd, 'not'), tarih: alan(fd, 'tarih') }
				}
			});
		}
		return { bagKuruldu: true };
	},

	bagGuncelle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const bagId = alan(fd, 'bagId');
		if (!uuidMu(bagId)) error(404, 'Bağ bulunamadı.');
		const sonuc = bagBilgisiDogrula(fd);
		if (!sonuc.tamam) {
			return fail(400, { bagDuzenle: { bagId, hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		if (!(await bagGuncelle(bagId, kullanici.id, sonuc.veri))) error(404, 'Bağ bulunamadı.');
		return { bagGuncellendi: true };
	},

	bagSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const bagId = alan(await request.formData(), 'bagId');
		if (!uuidMu(bagId) || !(await bagSil(bagId, kullanici.id))) error(404, 'Bağ bulunamadı.');
		return { bagSilindi: true };
	},

	izeEkle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const izId = alan(await request.formData(), 'izId');
		if (!uuidMu(params.id) || !uuidMu(izId)) {
			return fail(400, { izHatasi: 'Eklemek istediğin izi seç.' });
		}
		const durum = await durakEkle(izId, kullanici.id, params.id);
		if (durum === 'yetkisiz') error(404, 'İz bulunamadı.');
		if (durum === 'zaten-var') return fail(400, { izHatasi: 'Bu düğüm zaten o izde.' });
		return { izeEklendi: izId };
	}
};
