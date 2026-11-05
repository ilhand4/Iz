import { error } from '@sveltejs/kit';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { bagAviCevapla, bagAviSorusu } from '#lib/server/geriGetirenlerDb.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const sayi = (ad: string) => Number(url.searchParams.get(ad) ?? '0') || 0;
	return {
		soru: await bagAviSorusu(kullanici.id),
		aktarma: url.searchParams.has('eklenen')
			? { eklenen: sayi('eklenen'), birlesen: sayi('birlesen'), alinti: sayi('alinti') }
			: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const kaynakId = alan(fd, 'kaynakId');
		const hedefId = alan(fd, 'hedefId');
		const cevap = alan(fd, 'cevap') === 'evet' ? 'evet' : 'hayir';
		if (!uuidMu(kaynakId) || !uuidMu(hedefId)) error(404, 'Düğüm bulunamadı.');
		const not = alan(fd, 'not').slice(0, 1000) || null;
		if (!(await bagAviCevapla(kullanici.id, kaynakId, hedefId, cevap, not))) {
			error(404, 'Düğüm bulunamadı.');
		}
		return {
			bildirim: { mesaj: cevap === 'evet' ? 'Bağ kuruldu.' : 'Tamam, bunu bir daha sormayacağım.' }
		};
	}
};
