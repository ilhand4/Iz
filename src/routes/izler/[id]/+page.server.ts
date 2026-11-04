import { error, fail, redirect } from '@sveltejs/kit';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { bagKur } from '#lib/server/baglar.ts';
import { atasi, catalla, catallar } from '#lib/server/dusunce.ts';
import { izGetir } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu iz bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const izleyenId = locals.kullanici?.id ?? null;
	const iz = await izGetir(params.id, izleyenId);
	if (!iz) error(404, BULUNAMADI);
	const [catalListesi, ata] = await Promise.all([
		catallar(params.id, izleyenId),
		atasi(iz.iz.ataIzId, izleyenId)
	]);
	return {
		...iz,
		catallar: catalListesi,
		ata,
		ilk: iz.sahibiMi && url.searchParams.has('ilk'),
		indekslenebilir: iz.iz.gizlilik === 'herkes' && iz.sahip.aramaMotorlari
	};
};

export const actions: Actions = {
	/** Bu duraktan sonra başka bir yol: ilk duraklar kopyalanır, yeni iz düzenlemeye açılır */
	catalla: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sira = Number.parseInt(alan(await request.formData(), 'sira'), 10);
		if (!uuidMu(params.id) || !Number.isInteger(sira) || sira < 1) error(404, BULUNAMADI);
		const yeniId = await catalla(kullanici.id, params.id, sira);
		if (!yeniId) error(404, BULUNAMADI);
		redirect(303, `/izler/${yeniId}/duzenle?catal=1`);
	},

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
