import { fail, redirect } from '@sveltejs/kit';
import { alan } from '#lib/server/dogrulama.ts';
import { adaylariEkle } from '#lib/server/geriGetirenlerDb.ts';
import { KAYNAKLAR, kaynagiOku, type DisKaynak } from '#lib/server/disKaynaklar.ts';
import { beklemeMesaji } from '#lib/server/hizSiniri.ts';
import { iceAktarmaSiniri } from '#lib/server/sinirlar.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

const EN_BUYUK = 5 * 1024 * 1024;

export const load: PageServerLoad = ({ locals, url }) => {
	girisGerekli(locals, url);
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const kaynak = alan(fd, 'kaynak');
		const hata = (mesaj: string, durum = 400) => fail(durum, { hata: mesaj, kaynak });
		if (!(KAYNAKLAR as readonly string[]).includes(kaynak)) return hata('Bir kaynak seç.');
		const dosya = fd.get('dosya');
		if (!(dosya instanceof File) || dosya.size === 0) return hata('Bir dosya seç.');
		if (dosya.size > EN_BUYUK) return hata('Dosya 5 MB’tan büyük olamaz.', 413);
		const sinir = await iceAktarmaSiniri.dene(kullanici.id);
		if (!sinir.izin) return hata(beklemeMesaji(sinir.beklemeSaniye), 429);

		const adaylar = kaynagiOku(kaynak as DisKaynak, await dosya.text(), dosya.name);
		if (!adaylar.length) {
			return hata('Dosyada içe aktarılacak bir şey bulunamadı. Doğru kaynağı seçtiğinden emin ol.');
		}
		const rapor = await adaylariEkle(kullanici.id, adaylar);
		const p = new URLSearchParams({
			eklenen: String(rapor.eklenen),
			birlesen: String(rapor.birlesen),
			alinti: String(rapor.alinti)
		});
		redirect(303, `/bag-avi?${p}`);
	}
};
