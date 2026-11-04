import { error, fail } from '@sveltejs/kit';
import { alan, donemDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import { donemGuncelle, donemleriListele, donemOlustur, donemSil } from '#lib/server/dusunce.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return { donemler: await donemleriListele(kullanici.id) };
};

export const actions: Actions = {
	ekle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = donemDogrula(await request.formData());
		if (!sonuc.tamam) {
			return fail(400, { ekle: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		await donemOlustur(kullanici.id, sonuc.veri);
		return { bildirim: { mesaj: `“${sonuc.veri.ad}” dönemi eklendi.` } };
	},

	guncelle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const id = alan(fd, 'id');
		if (!uuidMu(id)) error(404, 'Dönem bulunamadı.');
		const sonuc = donemDogrula(fd);
		if (!sonuc.tamam) {
			return fail(400, { guncelle: { id, hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		if (!(await donemGuncelle(id, kullanici.id, sonuc.veri))) error(404, 'Dönem bulunamadı.');
		return { bildirim: { mesaj: 'Dönem kaydedildi.' } };
	},

	sil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'id');
		if (!uuidMu(id) || !(await donemSil(id, kullanici.id))) error(404, 'Dönem bulunamadı.');
		return { bildirim: { mesaj: 'Dönem silindi; düğümlerine dokunulmadı.' } };
	}
};
