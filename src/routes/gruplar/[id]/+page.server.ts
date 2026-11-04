import { error, fail, redirect } from '@sveltejs/kit';
import { alan, grupDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import {
	davetKapat,
	davetYenile,
	grupGetir,
	grupGuncelle,
	grupSil,
	gruptanAyril,
	ortakIzler,
	uyeCikar,
	yoneticiYap
} from '#lib/server/gruplar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu grup bulunamadı ya da üyesi değilsin.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const grup = await grupGetir(params.id, kullanici.id);
	if (!grup) error(404, BULUNAMADI);
	return {
		...grup,
		izler: await ortakIzler(params.id, kullanici.id),
		yeni: url.searchParams.has('yeni')
	};
};

function kimlik(params: { id: string }) {
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	return params.id;
}

export const actions: Actions = {
	duzenle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = grupDogrula(await request.formData());
		if (!sonuc.tamam)
			return fail(400, { duzenle: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		if (!(await grupGuncelle(kimlik(params), kullanici.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Grup bilgileri kaydedildi.' } };
	},

	davetYenile: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const jeton = await davetYenile(kimlik(params), kullanici.id);
		if (!jeton) error(404, BULUNAMADI);
		// Bağlantı yalnızca bu yanıtta gösterilir; veritabanında yalnızca özeti durur
		return { davetBaglantisi: `${url.origin}/davet/${jeton}` };
	},

	davetKapat: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!(await davetKapat(kimlik(params), kullanici.id))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Davet bağlantısı kapatıldı; artık kimse onunla katılamaz.' } };
	},

	uyeCikar: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const uyeId = alan(await request.formData(), 'uyeId');
		if (!uuidMu(uyeId) || !(await uyeCikar(kimlik(params), kullanici.id, uyeId))) {
			error(404, 'Üye bulunamadı.');
		}
		return { bildirim: { mesaj: 'Üye gruptan çıkarıldı.' } };
	},

	yoneticiYap: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const uyeId = alan(await request.formData(), 'uyeId');
		if (!uuidMu(uyeId) || !(await yoneticiYap(kimlik(params), kullanici.id, uyeId))) {
			error(404, 'Üye bulunamadı.');
		}
		return { bildirim: { mesaj: 'Üye artık yönetici.' } };
	},

	ayril: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!(await gruptanAyril(kimlik(params), kullanici.id))) error(404, BULUNAMADI);
		redirect(303, '/gruplar');
	},

	sil: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (alan(await request.formData(), 'onay') !== 'evet') {
			return fail(400, { silHatasi: 'Silmek için onay kutusunu işaretle.' });
		}
		if (!(await grupSil(kimlik(params), kullanici.id))) error(404, BULUNAMADI);
		redirect(303, '/gruplar');
	}
};
