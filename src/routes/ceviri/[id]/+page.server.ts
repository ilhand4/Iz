import { error, fail, redirect } from '@sveltejs/kit';
import { ALINTI_PARAGRAF_SINIRI, PARAGRAF_BASINA_CEVIRI } from '#lib/ceviri.ts';
import {
	ceviriEkle,
	ceviriSil,
	eserSecenekleri,
	masaGetir,
	masaGuncelle,
	masaSil,
	oyVer,
	paragrafEkle,
	paragrafSil,
	yorumEkle,
	yorumSil
} from '#lib/server/ceviriMasasi.ts';
import {
	alan,
	ceviriDogrula,
	masaDogrula,
	paragrafDogrula,
	uuidMu
} from '#lib/server/dogrulama.ts';
import { beklemeMesaji } from '#lib/server/hizSiniri.ts';
import { ceviriSiniri } from '#lib/server/sinirlar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu masa bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const izleyenId = locals.kullanici?.id ?? null;
	const veri = await masaGetir(params.id, izleyenId);
	if (!veri) error(404, BULUNAMADI);
	return {
		...veri,
		girisli: !!izleyenId,
		eserler: veri.sahibiMi && izleyenId ? await eserSecenekleri(izleyenId) : [],
		alintiSiniri: ALINTI_PARAGRAF_SINIRI
	};
};

async function sinirla(kullaniciId: string) {
	const s = await ceviriSiniri.dene(kullaniciId);
	return s.izin ? null : beklemeMesaji(s.beklemeSaniye);
}

export const actions: Actions = {
	ayarlar: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = masaDogrula(await request.formData());
		if (!sonuc.tamam)
			return fail(400, { ayarlar: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		if (!(await masaGuncelle(params.id, kullanici.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Masa güncellendi.' } };
	},

	sil: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!(await masaSil(params.id, kullanici.id))) error(404, BULUNAMADI);
		redirect(303, '/ceviri');
	},

	paragrafEkle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = paragrafDogrula(await request.formData());
		if (!sonuc.tamam)
			return fail(400, { paragraf: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		if (!(await paragrafEkle(params.id, kullanici.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Paragraf eklendi; şimdi çevirilerini ekle.' } };
	},

	paragrafSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'paragrafId');
		if (!uuidMu(id) || !(await paragrafSil(id, kullanici.id))) error(404, 'Paragraf bulunamadı.');
		return { bildirim: { mesaj: 'Paragraf ve çevirileri silindi.' } };
	},

	ceviriEkle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const paragrafId = alan(fd, 'paragrafId');
		if (!uuidMu(paragrafId)) error(404, 'Paragraf bulunamadı.');
		const sonuc = ceviriDogrula(fd);
		const hata = (hatalar: Record<string, string>, degerler: Record<string, string> = {}) =>
			fail(400, { ceviri: { paragrafId, hatalar, degerler } });
		if (!sonuc.tamam) return hata(sonuc.hatalar, sonuc.degerler);
		const bekle = await sinirla(kullanici.id);
		if (bekle) return hata({ metin: bekle });
		const s = await ceviriEkle(paragrafId, kullanici.id, sonuc.veri);
		const degerler = Object.fromEntries(
			Object.entries(sonuc.veri).map(([k, v]) => [k, v === null ? '' : String(v)])
		);
		if (s === 'yetkisiz') error(404, 'Paragraf bulunamadı.');
		if (s === 'dolu')
			return hata(
				{ metin: `Bir paragrafa en çok ${PARAGRAF_BASINA_CEVIRI} çeviri eklenebilir.` },
				degerler
			);
		if (s === 'alinti-siniri')
			return hata(
				{
					dayanak: `Bu masada en çok ${ALINTI_PARAGRAF_SINIRI} paragraf telifli çeviriden alıntı içerebilir. Telif süresi dolmuş ya da izinli bir çeviri seç.`
				},
				degerler
			);
		return { bildirim: { mesaj: 'Çeviri eklendi.' } };
	},

	ceviriSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'ceviriId');
		if (!uuidMu(id) || !(await ceviriSil(id, kullanici.id))) error(404, 'Çeviri bulunamadı.');
		return { bildirim: { mesaj: 'Çeviri silindi.' } };
	},

	oy: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'ceviriId');
		if (!uuidMu(id)) error(404, 'Çeviri bulunamadı.');
		const s = await oyVer(id, kullanici.id);
		if (!s) error(404, 'Çeviri bulunamadı.');
		return {};
	},

	yorum: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const id = alan(fd, 'ceviriId');
		const metin = alan(fd, 'metin');
		if (!uuidMu(id)) error(404, 'Çeviri bulunamadı.');
		if (!metin || metin.length > 1000)
			return fail(400, {
				yorum: { ceviriId: id, hata: 'Yorum 1 ile 1000 karakter arasında olmalı.' }
			});
		const bekle = await sinirla(kullanici.id);
		if (bekle) return fail(429, { yorum: { ceviriId: id, hata: bekle } });
		if (!(await yorumEkle(id, kullanici.id, metin))) error(404, 'Çeviri bulunamadı.');
		return {};
	},

	yorumSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'yorumId');
		if (!uuidMu(id) || !(await yorumSil(id, kullanici.id))) error(404, 'Yorum bulunamadı.');
		return {};
	}
};
