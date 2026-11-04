import { error, fail, redirect } from '@sveltejs/kit';
import { TMDB_ANAHTARI } from '$app/env/private';
import { hizliCoz } from '#lib/hizliEkle.ts';
import { eslesir, sadelestir } from '#lib/metin.ts';
import { hizliSecimDogrula } from '#lib/server/dogrulama.ts';
import { dugumSecenekleri, dugumVeGetireniKaydet, type AnaGirdisi } from '#lib/server/dugumler.ts';
import { AramaHatasi, kitapAra, tmdbAra, type EserSonucu } from '#lib/server/eserArama.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { buAyinTarihi, tarihGirdisi } from '#lib/tarih.ts';
import type { Actions, PageServerLoad } from './$types';

const EN_FAZLA_ADAY = 4;

/** Haritadaki düğümlerden önce birebir aynı adlıları, sonra benzerleri öne çıkarır */
function eslesenler<T extends { baslik: string; altBaslik: string | null }>(
	liste: T[],
	ad: string
) {
	if (!ad) return [];
	const hedef = sadelestir(ad);
	const birebir = liste.filter((s) => sadelestir(s.baslik) === hedef);
	const benzer = liste.filter(
		(s) => !birebir.includes(s) && eslesir(`${s.baslik} ${s.altBaslik ?? ''}`, ad)
	);
	return [...birebir, ...benzer].slice(0, 3).map((s) => ({ ...s, birebir: birebir.includes(s) }));
}

/** Eser adayları: fiilden tahmin edilen türe göre kitap ve/veya film/dizi araması */
async function eserAdaylari(ad: string, tahmin: string | null) {
	const aramalar: Promise<EserSonucu[]>[] = [];
	if (!tahmin || tahmin === 'kitap') aramalar.push(kitapAra(ad));
	if (TMDB_ANAHTARI && (!tahmin || tahmin === 'film' || tahmin === 'dizi')) {
		aramalar.push(tmdbAra(ad, 'film', TMDB_ANAHTARI), tmdbAra(ad, 'dizi', TMDB_ANAHTARI));
	}
	const sonuclar = await Promise.allSettled(aramalar);
	const adaylar = sonuclar.flatMap((s) =>
		s.status === 'fulfilled' ? s.value.slice(0, EN_FAZLA_ADAY) : []
	);
	const hata = sonuclar.find((s) => s.status === 'rejected');
	return {
		adaylar,
		hata:
			hata && hata.status === 'rejected' && hata.reason instanceof AramaHatasi
				? hata.reason.message
				: null
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const kullanici = girisGerekli(locals, url);
	const metin = (url.searchParams.get('metin') ?? '').trim().slice(0, 300);
	if (!metin) redirect(303, '/dugumler/yeni');

	const cozum = hizliCoz(metin);
	const secenekler = await dugumSecenekleri(kullanici.id);
	const anaEslesen = eslesenler(secenekler, cozum.ana);
	const getirenEslesen = cozum.getiren ? eslesenler(secenekler, cozum.getiren) : [];

	// Ad haritada birebir yoksa ve eser olabilecekse dış kaynaklarda ara
	const eserOlabilir = !cozum.eserTuru || ['kitap', 'film', 'dizi'].includes(cozum.eserTuru);
	const { adaylar, hata } =
		cozum.ana && eserOlabilir && !anaEslesen.some((e) => e.birebir)
			? await eserAdaylari(cozum.ana, cozum.eserTuru)
			: { adaylar: [] as EserSonucu[], hata: null };

	// Varsayılan seçimler: birebir eşleşen düğüm > birebir eşleşen dış eser > yeni
	const birebirAday = adaylar.find((a) => sadelestir(a.baslik) === sadelestir(cozum.ana));
	const anaSecim = anaEslesen[0]?.birebir
		? `mevcut:${anaEslesen[0].id}`
		: birebirAday
			? `dis:${birebirAday.kaynak}:${birebirAday.disKimlik}`
			: 'yeni';
	const getirenSecim = getirenEslesen[0]?.birebir
		? `mevcut:${getirenEslesen[0].id}`
		: cozum.getiren
			? 'yeni'
			: 'yok';
	const durum = cozum.durum ?? 'bitti';

	return {
		metin,
		cozum,
		anaEslesen,
		getirenEslesen,
		adaylar,
		aramaHatasi: hata,
		varsayilan: {
			ana: anaSecim,
			// Hızlı eklenenler çoğunlukla eserdir; onay ekranında değiştirilebilir
			tur: 'eser',
			eserTuru: cozum.eserTuru ?? 'kitap',
			baslik: cozum.ana,
			getiren: getirenSecim,
			getirenTur: cozum.getirenTuru ?? 'kisi',
			getirenBaslik: cozum.getiren ?? '',
			not: cozum.not ?? '',
			durum,
			// Bitti ya da sürüyorsa bu ay; merak edilenin tarihi yok
			tarih: durum === 'merak' ? '' : tarihGirdisi(buAyinTarihi(), 'ay')
		} as Record<string, string>
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const sonuc = hizliSecimDogrula(fd);
		if (!sonuc.tamam) return fail(400, { hatalar: sonuc.hatalar, degerler: sonuc.degerler });
		const { ana, getiren, not, durum, tarih, tarihHassasiyeti } = sonuc.veri;

		const ortak = {
			altBaslik: null,
			aciklama: null,
			tarih,
			tarihHassasiyeti,
			yil: null,
			enlem: null,
			boylam: null,
			yerAdi: null,
			gizlilik: 'ozel' as const
		};

		let anaGirdisi: AnaGirdisi;
		if (ana.kip === 'mevcut') {
			anaGirdisi = { kip: 'mevcut', id: ana.id, durum };
		} else if (ana.kip === 'dis') {
			// Dış eserin bilgisi istemciden alınmaz: arama (önbellekten) yeniden yapılır
			const sorgu = String(fd.get('aramaSorgusu') ?? '').slice(0, 120);
			let bulunan: EserSonucu | undefined;
			try {
				const sonuclar =
					ana.kaynak === 'openlibrary'
						? await kitapAra(sorgu)
						: TMDB_ANAHTARI
							? await tmdbAra(
									sorgu,
									ana.disKimlik.startsWith('tv/') ? 'dizi' : 'film',
									TMDB_ANAHTARI
								)
							: [];
				bulunan = sonuclar.find((s) => s.disKimlik === ana.disKimlik);
			} catch (e) {
				if (!(e instanceof AramaHatasi)) throw e;
			}
			if (!bulunan) {
				return fail(400, {
					hatalar: { ana: 'Seçilen eser bulunamadı. Aramayı yenileyip tekrar dene.' },
					degerler: Object.fromEntries(fd) as Record<string, string>
				});
			}
			anaGirdisi = {
				kip: 'yeni',
				veri: {
					...ortak,
					tur: 'eser',
					eserTuru: bulunan.eserTuru,
					baslik: bulunan.baslik,
					altBaslik: bulunan.altBaslik,
					yil: bulunan.yil,
					durum,
					disKaynak: bulunan.kaynak,
					disKimlik: bulunan.disKimlik,
					gorselUrl: bulunan.gorselUrl
				}
			};
		} else {
			anaGirdisi = {
				kip: 'yeni',
				veri: {
					...ortak,
					tur: ana.tur,
					eserTuru: ana.eserTuru,
					baslik: ana.baslik,
					durum: ana.tur === 'eser' ? durum : null
				}
			};
		}

		const kayit = await dugumVeGetireniKaydet(kullanici.id, anaGirdisi, getiren, not);
		if (kayit === 'yetkisiz') error(404, 'Seçilen düğüm bulunamadı.');
		redirect(303, `/dugumler/${kayit.dugumId}?eklendi=1`);
	}
};
