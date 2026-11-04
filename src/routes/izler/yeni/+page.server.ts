import { fail, redirect } from '@sveltejs/kit';
import { izDogrula, uuidMu } from '#lib/server/dogrulama.ts';
import { dugumGetir } from '#lib/server/dugumler.ts';
import { gruplarim } from '#lib/server/gruplar.ts';
import { izOlustur } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

/** ?dugum=<id> ile gelindiyse iz bu düğümle başlar */
async function ilkDugum(dugumId: string | null, kullaniciId: string) {
	if (!uuidMu(dugumId)) return null;
	const sonuc = await dugumGetir(dugumId, kullaniciId);
	return sonuc && sonuc.dugum.sahipId === kullaniciId
		? { id: sonuc.dugum.id, baslik: sonuc.dugum.baslik, tur: sonuc.dugum.tur }
		: null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [ilk, gruplar] = await Promise.all([
		ilkDugum(url.searchParams.get('dugum'), kullanici.id),
		gruplarim(kullanici.id)
	]);
	return { ilkDugum: ilk, gruplar: gruplar.map((g) => ({ id: g.id, ad: g.ad })) };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const sonuc = izDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		const ilk = await ilkDugum(url.searchParams.get('dugum'), kullanici.id);
		const iz = await izOlustur(kullanici.id, sonuc.veri, ilk?.id);
		redirect(303, `/izler/${iz.id}/duzenle?yeni=1`);
	}
};
