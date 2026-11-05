// Hesapsız yanıt: bağlantıyı alan yakın, giriş yapmadan yazarak ya da sesli yanıtlar.
import { error, fail } from '@sveltejs/kit';
import { EN_BUYUK_SES_MB } from '#lib/ses.ts';
import { EN_UZUN_YANIT } from '#lib/sorular.ts';
import { alan } from '#lib/server/dogrulama.ts';
import { beklemeMesaji } from '#lib/server/hizSiniri.ts';
import { yanitSiniri } from '#lib/server/sinirlar.ts';
import { jetonlaSoru, yanitKaydet } from '#lib/server/sorular.ts';
import type { Actions, PageServerLoad } from './$types';

const GECERSIZ = 'Bu bağlantı geçersiz ya da süresi dolmuş.';

export const load: PageServerLoad = async ({ params }) => {
	const s = await jetonlaSoru(params.jeton);
	if (!s) error(404, GECERSIZ);
	return {
		aliciAdi: s.aliciAdi,
		metin: s.metin,
		soran: s.soran,
		yanitlandi: !!s.yanitlanma
	};
};

export const actions: Actions = {
	default: async ({ params, request, getClientAddress }) => {
		const sinir = await yanitSiniri.dene(getClientAddress());
		if (!sinir.izin) return fail(429, { hata: beklemeMesaji(sinir.beklemeSaniye) });
		const fd = await request.formData();
		const metin = alan(fd, 'yanit');
		const dosya = fd.get('ses');
		const ses = dosya instanceof File && dosya.size > 0 ? dosya : null;
		if (alan(fd, 'onay') !== 'evet')
			return fail(400, { hata: 'Göndermeden önce onay kutusunu işaretle.', metin });
		if (!metin && !ses) return fail(400, { hata: 'Yaz ya da sesli yanıt kaydet.', metin });
		if (metin.length > EN_UZUN_YANIT) return fail(400, { hata: 'Yanıt çok uzun.', metin });
		if (ses && ses.size > EN_BUYUK_SES_MB * 1024 * 1024)
			return fail(413, { hata: `Ses ${EN_BUYUK_SES_MB} MB’tan büyük olamaz.`, metin });
		const sonuc = await yanitKaydet(params.jeton, {
			metin: metin || null,
			ses: ses ? new Uint8Array(await ses.arrayBuffer()) : null
		});
		if (sonuc === 'yok') error(404, GECERSIZ);
		if (sonuc === 'yanitlanmis') return fail(409, { hata: 'Bu soru zaten yanıtlanmış.' });
		if (sonuc === 'gecersiz-ses')
			return fail(400, {
				hata: metin
					? 'Yazılı yanıtın kaydedildi ama ses dosyası tanınmadı.'
					: 'Ses dosyası tanınmadı. Yeniden kaydet ya da yazarak yanıtla.',
				metin
			});
		return { tamam: true };
	}
};
