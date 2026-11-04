import { error, fail } from '@sveltejs/kit';
import {
	copKutusu,
	copuBosalt,
	geriYukle,
	kaliciSil,
	type CopTuru
} from '#lib/server/copKutusu.ts';
import { alan, uuidMu } from '#lib/server/dogrulama.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { Actions, PageServerLoad } from './$types';

function ogeBilgisi(fd: FormData): { tur: CopTuru; id: string } {
	const tur = alan(fd, 'tur');
	const id = alan(fd, 'id');
	if ((tur !== 'dugum' && tur !== 'iz') || !uuidMu(id)) error(404, 'Öğe bulunamadı.');
	return { tur, id };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	return await copKutusu(kullanici.id);
};

export const actions: Actions = {
	geriYukle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const { tur, id } = ogeBilgisi(await request.formData());
		const { sonuc, baslik } = await geriYukle(kullanici.id, tur, id);
		if (sonuc === 'bulunamadi') error(404, 'Öğe çöp kutusunda bulunamadı.');
		if (sonuc === 'cakisma') {
			return fail(409, {
				bildirim: {
					mesaj: 'Bu eser haritana yeniden eklenmiş; önce oradakini silmelisin.',
					tur: 'hata' as const
				}
			});
		}
		return {
			bildirim: {
				mesaj: `“${baslik}” geri yüklendi.`,
				baglanti: {
					href: tur === 'dugum' ? `/dugumler/${id}` : `/izler/${id}`,
					metin: 'Aç'
				}
			}
		};
	},

	kaliciSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const { tur, id } = ogeBilgisi(await request.formData());
		if (!(await kaliciSil(kullanici.id, tur, id))) error(404, 'Öğe çöp kutusunda bulunamadı.');
		return { bildirim: { mesaj: 'Kalıcı olarak silindi.' } };
	},

	bosalt: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (alan(await request.formData(), 'onay') !== 'evet') {
			return fail(400, { bosaltHatasi: 'Boşaltmak için onay kutusunu işaretle.' });
		}
		await copuBosalt(kullanici.id);
		return { bildirim: { mesaj: 'Çöp kutusu boşaltıldı.' } };
	}
};
