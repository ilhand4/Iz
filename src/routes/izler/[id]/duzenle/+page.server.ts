import { error, fail, redirect } from '@sveltejs/kit';
import { adimNotuDogrula, alan, izDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import { dugumSecenekleri } from '#lib/server/dugumler.ts';
import {
	durakCikar,
	durakEkle,
	duraklariSirala,
	durakNotuKaydet,
	durakTasi,
	gizliMi,
	izGetir,
	izGuncelle,
	izCopeAt,
	sonrakiDurakOnerileri,
	type IzDuragi
} from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu iz bulunamadı ya da düzenleme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const iz = await izGetir(params.id, kullanici.id);
	if (!iz || !iz.sahibiMi) error(404, BULUNAMADI);

	// Sahibi tüm duraklarını görür; tip daraltma için yine de süz
	const duraklar = iz.duraklar
		.filter((d): d is IzDuragi => !gizliMi(d))
		.map((d) => ({
			adimId: d.adimId,
			not: d.not,
			dugum: {
				id: d.dugum.id,
				baslik: d.dugum.baslik,
				tur: d.dugum.tur,
				eserTuru: d.dugum.eserTuru
			}
		}));
	const izdekiler = new Set(duraklar.map((d) => d.dugum.id));
	const [tumSecenekler, oneriler] = await Promise.all([
		dugumSecenekleri(kullanici.id),
		sonrakiDurakOnerileri(params.id, kullanici.id)
	]);

	return {
		iz: iz.iz,
		duraklar,
		eklenebilir: tumSecenekler.filter((s) => !izdekiler.has(s.id)),
		oneriler,
		yeni: url.searchParams.has('yeni')
	};
};

/** Giriş zorunlu; iz kimliği geçerli olmalı. Sahiplik veri katmanında (izler.ts) denetlenir. */
async function kullaniciVeIz(izId: string, locals: App.Locals, url: URL) {
	const kullanici = girisGerekli(locals, url);
	if (!uuidMu(izId)) error(404, BULUNAMADI);
	return kullanici;
}

export const actions: Actions = {
	bilgi: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const sonuc = izDogrula(await request.formData());
		if (!sonuc.tamam)
			return fail(400, { bilgi: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		if (!(await izGuncelle(params.id, kullanici.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'İz bilgileri kaydedildi.' } };
	},

	durakEkle: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const dugumId = alan(await request.formData(), 'dugumId');
		if (!uuidMu(dugumId)) return fail(400, { durakHatasi: 'Eklemek istediğin düğümü seç.' });
		const durum = await durakEkle(params.id, kullanici.id, dugumId);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') return fail(400, { durakHatasi: 'Bu düğüm zaten bu izde.' });
		return { bildirim: { mesaj: 'Durak eklendi.' } };
	},

	durakCikar: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const adimId = alan(await request.formData(), 'adimId');
		const cikan = uuidMu(adimId) ? await durakCikar(adimId, kullanici.id) : null;
		if (!cikan) error(404, BULUNAMADI);
		// "Geri al" durağı aynı yere, aynı notla geri koyar
		return {
			bildirim: {
				mesaj: 'Durak çıkarıldı.',
				geriAl: {
					eylem: `/izler/${cikan.izId}/duzenle?/durakGeriYukle`,
					alanlar: { dugumId: cikan.dugumId, not: cikan.not ?? '', sira: String(cikan.sira) }
				}
			}
		};
	},

	durakGeriYukle: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const fd = await request.formData();
		const dugumId = alan(fd, 'dugumId');
		const sira = Number.parseInt(alan(fd, 'sira'), 10);
		if (!uuidMu(dugumId)) error(404, BULUNAMADI);
		const durum = await durakEkle(
			params.id,
			kullanici.id,
			dugumId,
			alan(fd, 'not').slice(0, 1000) || null,
			Number.isInteger(sira) && sira > 0 ? sira : undefined
		);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') return fail(400, { durakHatasi: 'Bu düğüm zaten bu izde.' });
		return {};
	},

	tasi: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const fd = await request.formData();
		const adimId = alan(fd, 'adimId');
		const yon = alan(fd, 'yon') === 'yukari' ? 'yukari' : 'asagi';
		if (!uuidMu(adimId) || !(await durakTasi(adimId, kullanici.id, yon))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Sıra kaydedildi.' } };
	},

	/** Sürükle-bırak sonrası tüm sıra birden gönderilir */
	sirala: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const sirali = (await request.formData()).getAll('adim').map(String);
		if (!sirali.every(uuidMu) || !(await duraklariSirala(params.id, kullanici.id, sirali))) {
			return fail(400, { durakHatasi: 'Sıralama kaydedilemedi; sayfayı yenileyip tekrar dene.' });
		}
		return { bildirim: { mesaj: 'Sıra kaydedildi.' } };
	},

	notKaydet: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		const fd = await request.formData();
		const adimId = alan(fd, 'adimId');
		if (!uuidMu(adimId)) error(404, BULUNAMADI);
		const sonuc = adimNotuDogrula(fd);
		if (!sonuc.tamam) return fail(400, { notHatasi: { adimId, hata: sonuc.hatalar.not } });
		if (!(await durakNotuKaydet(adimId, kullanici.id, sonuc.veri.not))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Not kaydedildi.' } };
	},

	sil: async ({ params, request, locals, url }) => {
		const kullanici = await kullaniciVeIz(params.id, locals, url);
		if (alan(await request.formData(), 'onay') !== 'evet') {
			return fail(400, { silHatasi: 'Silmek için onay kutusunu işaretle.' });
		}
		if (!(await izCopeAt(params.id, kullanici.id))) error(404, BULUNAMADI);
		redirect(303, `/izler?silindi=${params.id}`);
	}
};
