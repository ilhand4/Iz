import { error, fail } from '@sveltejs/kit';
import { alan, bagDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import {
	bagKur,
	bagSil,
	dugumBaglari,
	dugumGetir,
	geldigiYol,
	hedefSecenekleri
} from '#lib/server/dugumler.ts';
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
	const [baglar, yol, secenekler] = await Promise.all([
		dugumBaglari(params.id, izleyenId),
		geldigiYol(params.id, izleyenId),
		sahibiMi ? hedefSecenekleri(sonuc.dugum.sahipId, params.id) : Promise.resolve([])
	]);

	// Sahip kimliği sayfaya gönderilmez
	const { sahipId: _sahipId, ...dugum } = sonuc.dugum;
	return {
		dugum,
		sahip: sonuc.sahip,
		sahibiMi,
		baglar,
		yol,
		secenekler,
		eklendi: url.searchParams.has('eklendi')
	};
};

export const actions: Actions = {
	bagKur: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const fd = await request.formData();
		const sonuc = bagDogrula(fd, params.id);
		if (!sonuc.tamam) {
			return fail(400, { bag: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}

		const durum = await bagKur(kullanici.id, params.id, sonuc.veri);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') {
			return fail(400, {
				bag: {
					hatalar: { hedefId: 'Bu iki düğüm zaten bu yönde bağlı.' },
					degerler: { hedefId: sonuc.veri.hedefId, not: sonuc.veri.not ?? '' }
				}
			});
		}
		return { bagKuruldu: true };
	},

	bagSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const bagId = alan(await request.formData(), 'bagId');
		if (!uuidMu(bagId) || !(await bagSil(bagId, kullanici.id))) error(404, 'Bağ bulunamadı.');
		return { bagSilindi: true };
	}
};
