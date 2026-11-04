import { cevreDugumleri, enBaglisi } from '#lib/server/baglar.ts';
import { uuidMu } from '#lib/server/dogrulama.ts';
import { dugumSayisi, haritaVerisi } from '#lib/server/dugumler.ts';
import { donemleriListele } from '#lib/server/dusunce.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { bagTuruMu, dugumTuruMu } from '#lib/sabitler.ts';
import type { PageServerLoad } from './$types';

/** Bu kadar düğümün üstünde ağ, odak çevresiyle (2 adım) aşamalı yüklenir */
const AG_ESIGI = 500;

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const odak = url.searchParams.get('odak');
	const odakId = uuidMu(odak) ? odak : null;
	// Paylaşılabilir görünüm: ?gizli=kisi,yer&bag=celisir&odak=…
	const gizliTurler = (url.searchParams.get('gizli') ?? '').split(',').filter(dugumTuruMu);
	const bagParam = url.searchParams.get('bag');
	const bagSuzgeci = bagTuruMu(bagParam) ? bagParam : null;

	const [toplam, donemler] = await Promise.all([
		dugumSayisi(kullanici.id),
		donemleriListele(kullanici.id)
	]);
	if (toplam > AG_ESIGI) {
		const merkez = odakId ?? (await enBaglisi(kullanici.id));
		const idler = merkez ? await cevreDugumleri(kullanici.id, merkez, 2) : [];
		return {
			...(await haritaVerisi(kullanici.id, idler)),
			odakId: merkez,
			baslangic: { gizliTurler, bagSuzgeci },
			donemler,
			kismi: { toplam }
		};
	}
	return {
		...(await haritaVerisi(kullanici.id)),
		odakId,
		baslangic: { gizliTurler, bagSuzgeci },
		donemler,
		kismi: null
	};
};
