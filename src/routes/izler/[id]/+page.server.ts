import { error, fail } from '@sveltejs/kit';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { bagKur } from '#lib/server/dugumler.ts';
import { izGetir } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu iz bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const iz = await izGetir(params.id, locals.kullanici?.id ?? null);
	if (!iz) error(404, BULUNAMADI);
	return { ...iz, ilk: iz.sahibiMi && url.searchParams.has('ilk') };
};

export const actions: Actions = {
	/** İki ardışık durak arasında eksik olan "götürdü" bağını kurar */
	bagKur: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const fd = await request.formData();
		const kaynakId = alan(fd, 'kaynakId');
		const hedefId = alan(fd, 'hedefId');
		if (!uuidMu(kaynakId) || !uuidMu(hedefId)) return fail(400, { hata: 'Bağ kurulamadı.' });
		const durum = await bagKur(kullanici.id, {
			kaynakId,
			hedefId,
			not: null,
			tarih: null,
			tarihHassasiyeti: null
		});
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Duraklar bağlandı.' } };
	}
};
