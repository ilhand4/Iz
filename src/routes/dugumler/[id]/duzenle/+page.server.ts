import { error, fail, redirect } from '@sveltejs/kit';
import { alan, dugumDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import { dugumGetir, dugumGuncelle, dugumSil } from '#lib/server/dugumler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { tarihGirdisi } from '#lib/tarih.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu düğüm bulunamadı ya da düzenleme iznin yok.';

/** Yalnızca sahibi düzenleyebilir; başkasının herkese açık düğümü de 404 döner */
async function sahibinDugumu(id: string, kullaniciId: string) {
	if (!uuidMu(id)) error(404, BULUNAMADI);
	const sonuc = await dugumGetir(id, kullaniciId);
	if (!sonuc || sonuc.dugum.sahipId !== kullaniciId) error(404, BULUNAMADI);
	return sonuc.dugum;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const d = await sahibinDugumu(params.id, kullanici.id);
	const metin = (v: string | number | null) => (v === null ? '' : String(v));
	return {
		id: d.id,
		baslik: d.baslik,
		degerler: {
			tur: d.tur,
			eserTuru: d.eserTuru ?? '',
			baslik: d.baslik,
			altBaslik: metin(d.altBaslik),
			aciklama: metin(d.aciklama),
			tarih: tarihGirdisi(d.tarih, d.tarihHassasiyeti),
			yil: metin(d.yil),
			enlem: metin(d.enlem),
			boylam: metin(d.boylam),
			yerAdi: metin(d.yerAdi),
			gizlilik: d.gizlilik
		}
	};
};

export const actions: Actions = {
	kaydet: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		await sahibinDugumu(params.id, kullanici.id);
		const sonuc = dugumDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		if (!(await dugumGuncelle(params.id, kullanici.id, sonuc.veri))) error(404, BULUNAMADI);
		redirect(303, `/dugumler/${params.id}`);
	},

	sil: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (alan(await request.formData(), 'onay') !== 'evet') {
			return fail(400, { hatalar: { genel: 'Silmek için onay kutusunu işaretle.' } });
		}
		if (!uuidMu(params.id) || !(await dugumSil(params.id, kullanici.id))) error(404, BULUNAMADI);
		redirect(303, '/dugumler');
	}
};
