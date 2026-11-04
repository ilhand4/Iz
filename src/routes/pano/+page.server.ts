import { haritaKarakterleri } from '#lib/analiz.ts';
import { suresiDolanlariTemizle } from '#lib/server/copKutusu.ts';
import { haritaVerisi, merakListesi, panoVerisi } from '#lib/server/dugumler.ts';
import { izdekiDugumler, izleriListele, izSayisi } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import type { PageServerLoad } from './$types';

/** Bundan küçük haritada "karakterler" anlamlı değil */
const KARAKTER_ESIGI = { dugum: 4, bag: 3 };
const EN_FAZLA_YETIM = 5;

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	// Süresi dolan çöpler sahibi panoya her geldiğinde temizlenir (zamanlanmış iş gerekmez)
	await suresiDolanlariTemizle(kullanici.id);
	const [pano, izler, toplamIz, harita, izdekiler, merak] = await Promise.all([
		panoVerisi(kullanici.id),
		izleriListele(kullanici.id, 3),
		izSayisi(kullanici.id),
		haritaVerisi(kullanici.id),
		izdekiDugumler(kullanici.id),
		merakListesi(kullanici.id, 4)
	]);

	let karakterler = null;
	if (
		harita.dugumler.length >= KARAKTER_ESIGI.dugum &&
		harita.baglar.length >= KARAKTER_ESIGI.bag
	) {
		const k = haritaKarakterleri(
			harita.dugumler.map((d) => ({ id: d.id, baslik: d.baslik, tur: d.tur })),
			harita.baglar,
			izdekiler
		);
		karakterler = {
			...k,
			yetimSayisi: k.yetimler.length,
			yetimler: k.yetimler.slice(0, EN_FAZLA_YETIM)
		};
	}

	return {
		pano,
		izler,
		toplamIz,
		karakterler,
		merak,
		hosgeldin: url.searchParams.has('hosgeldin')
	};
};
