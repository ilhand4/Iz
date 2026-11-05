import { error, fail } from '@sveltejs/kit';
import { haftaninSorusu, SORU_BANKASI } from '#lib/sorular.ts';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { dugumSecenekleri } from '#lib/server/dugumler.ts';
import { soruOlustur, soruSil, sorulariListele, yanittanAni } from '#lib/server/sorular.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const [liste, secenekler] = await Promise.all([
		sorulariListele(kullanici.id),
		dugumSecenekleri(kullanici.id)
	]);
	return {
		liste,
		kisiler: secenekler.filter((s) => s.tur === 'kisi'),
		banka: SORU_BANKASI,
		haftanin: haftaninSorusu(),
		onerilen: url.searchParams.get('soru')?.slice(0, 500) ?? null
	};
};

export const actions: Actions = {
	olustur: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const aliciAdi = alan(fd, 'aliciAdi');
		const secili = alan(fd, 'hazir');
		const metin = secili && secili !== 'ozel' ? secili : alan(fd, 'metin');
		const kisiId = alan(fd, 'kisiId');
		const hatalar: Record<string, string> = {};
		if (!aliciAdi) hatalar.aliciAdi = 'Kime soruyorsun?';
		else if (aliciAdi.length > 80) hatalar.aliciAdi = 'En fazla 80 karakter.';
		if (!metin) hatalar.metin = 'Bir soru seç ya da yaz.';
		else if (metin.length > 500) hatalar.metin = 'Soru en fazla 500 karakter olabilir.';
		if (Object.keys(hatalar).length)
			return fail(400, { olustur: { hatalar, degerler: { aliciAdi, metin } } });
		const { jeton } = await soruOlustur(kullanici.id, {
			aliciAdi,
			metin,
			kisiId: uuidMu(kisiId) ? kisiId : null
		});
		// Bağlantı yalnızca bu yanıtta bir kez gösterilir; veritabanında yalnızca özeti var
		return {
			yeniBaglanti: { adres: `${url.origin}/yanit/${jeton}`, aliciAdi, metin },
			bildirim: { mesaj: 'Soru hazır. Bağlantıyı şimdi kopyala; bir daha gösterilmez.' }
		};
	},

	ani: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'soruId');
		if (!uuidMu(id)) error(404, 'Soru bulunamadı.');
		const aniId = await yanittanAni(kullanici.id, id);
		if (!aniId) error(404, 'Soru bulunamadı.');
		return {
			bildirim: {
				mesaj: 'Yanıt özel bir anı olarak eklendi.',
				baglanti: { href: `/dugumler/${aniId}`, metin: 'Anıyı aç' }
			}
		};
	},

	sil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'soruId');
		if (!uuidMu(id) || !(await soruSil(kullanici.id, id))) error(404, 'Soru bulunamadı.');
		return { bildirim: { mesaj: 'Soru silindi; bağlantısı artık çalışmaz.' } };
	}
};
