import { error, fail } from '@sveltejs/kit';
import { durumEtiketi, eserDurumuMu } from '#lib/sabitler.ts';
import {
	alan,
	alintiDogrula,
	bagBilgisiDogrula,
	bagDogrula,
	kararDefteriDogrula,
	kararSonucuDogrula,
	uuidMu
} from '#lib/server/dogrulama.ts';
import { kararGetir, kararKaydet, sonucKaydet } from '#lib/server/kararDefteriDb.ts';
import { alintiEkle, alintiKaynagi, alintilariListele, alintiSil } from '#lib/server/dusunce.ts';
import {
	actigiKapilar,
	bagAlintisiAyarla,
	bagGuncelle,
	bagKur,
	bagSil,
	dugumBaglari,
	geldigiYol
} from '#lib/server/baglar.ts';
import {
	dugumGetir,
	dugumSecenekleri,
	dugumVeGetireniKaydet,
	durumGuncelle
} from '#lib/server/dugumler.ts';
import { disBagKur, disBagSil, gelenDisBaglar, gidenDisBaglar } from '#lib/server/disBaglar.ts';
import { gorselGuvenliMi } from '#lib/server/eserArama.ts';
import { wikidataUygula, yapimciDugumu, yapimciyiEkle } from '#lib/server/geriGetirenlerDb.ts';
import { wikidataAra } from '#lib/server/wikidata.ts';
import { kanonikDugumu, kanonikGetir, kesifYollari, korKesisim } from '#lib/server/kesif.ts';
import { durakEkle, dugumunIzleri, izSecenekleri } from '#lib/server/izler.ts';
import { girisGerekli } from '#lib/server/yetkilendirme.ts';
import { tarihGirdisi, tarihYaz } from '#lib/tarih.ts';
import type { Actions, PageServerLoad } from './$types';

const BULUNAMADI = 'Bu düğüm bulunamadı ya da görme iznin yok.';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	// Geçersiz kimlik de, başkasının özel düğümü de aynı 404'ü alır: varlığı belli olmasın
	if (!uuidMu(params.id)) error(404, BULUNAMADI);
	const izleyenId = locals.kullanici?.id ?? null;
	const sonuc = await dugumGetir(params.id, izleyenId);
	if (!sonuc) error(404, BULUNAMADI);

	const sahibiMi = sonuc.dugum.sahipId === izleyenId;
	// Keşif bölümleri yalnızca sahibine ve yalnızca eserlerde (başkalarının açık içeriğinden)
	const kesifVar = sahibiMi && sonuc.dugum.tur === 'eser';
	const [
		baglar,
		yol,
		kapilar,
		izler,
		secenekler,
		eklenebilirIzler,
		kesisim,
		kesifler,
		gelenDis,
		gidenDis,
		kendiSeceneklerim,
		alintiListesi,
		yapimciVar,
		karar
	] = await Promise.all([
		dugumBaglari(params.id, izleyenId),
		geldigiYol(params.id, izleyenId),
		actigiKapilar(params.id, izleyenId),
		dugumunIzleri(params.id, izleyenId),
		sahibiMi ? dugumSecenekleri(sonuc.dugum.sahipId, params.id) : Promise.resolve([]),
		sahibiMi ? izSecenekleri(sonuc.dugum.sahipId, params.id) : Promise.resolve([]),
		kesifVar ? korKesisim(params.id) : Promise.resolve([]),
		kesifVar ? kesifYollari(params.id) : Promise.resolve([]),
		gelenDisBaglar(params.id, izleyenId),
		gidenDisBaglar(params.id, izleyenId),
		// Başkasının düğümüne bakan kişi, kendi düğümlerinden birine bağ kurabilir
		izleyenId && !sahibiMi ? dugumSecenekleri(izleyenId) : Promise.resolve([]),
		alintilariListele(params.id, izleyenId),
		// Zenginleştirme önerisi: eserin yapımcısı kişi olarak haritada yoksa
		sahibiMi && sonuc.dugum.tur === 'eser' && sonuc.dugum.altBaslik
			? yapimciDugumu(sonuc.dugum.sahipId, sonuc.dugum.altBaslik.split(' · ')[0])
			: Promise.resolve('yok'),
		// Karar defteri kişiseldir: yalnızca sahibine
		sahibiMi && sonuc.dugum.tur === 'karar'
			? kararGetir(sonuc.dugum.sahipId, params.id)
			: Promise.resolve(null)
	]);

	// Sahip kimliği ve iç alanlar sayfaya gönderilmez
	const { sahipId: _sahipId, silinme: _silinme, ...dugum } = sonuc.dugum;
	return {
		dugum,
		sahip: sonuc.sahip,
		sahibiMi,
		baglar,
		yol,
		kapilar,
		izler,
		secenekler,
		eklenebilirIzler,
		kesisim,
		kesifler,
		gelenDis,
		gidenDis,
		kendiSeceneklerim,
		alintilar: alintiListesi,
		karar: karar
			? {
					gerekce: karar.gerekce,
					beklenti: karar.beklenti,
					guven: karar.guven,
					sorulacak: karar.sorulacak,
					sonuc: karar.sonuc,
					sonucNotu: karar.sonucNotu,
					sonucTarihi: karar.sonucTarihi
				}
			: null,
		bugun: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()),
		yapimciOnerisi:
			yapimciVar === null && sonuc.dugum.altBaslik ? sonuc.dugum.altBaslik.split(' · ')[0] : null,
		wikidataOnerisi:
			sahibiMi &&
			(sonuc.dugum.tur === 'kisi' || sonuc.dugum.tur === 'yer') &&
			!sonuc.dugum.wikidata,
		indekslenebilir: dugum.gizlilik === 'herkes' && sonuc.sahip.aramaMotorlari,
		eklendi: url.searchParams.has('eklendi'),
		getirenSor: url.searchParams.has('getiren')
	};
};

export const actions: Actions = {
	kararKaydet: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const sonuc = kararDefteriDogrula(await request.formData());
		if (!sonuc.tamam)
			return fail(400, { kararHatalari: sonuc.hatalar, kararDegerleri: sonuc.degerler });
		if (!(await kararKaydet(kullanici.id, params.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Karar defterine yazıldı.' } };
	},

	kararSonucu: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const sonuc = kararSonucuDogrula(await request.formData());
		if (!sonuc.tamam) return fail(400, { sonucHatalari: sonuc.hatalar });
		if (!(await sonucKaydet(kullanici.id, params.id, sonuc.veri.sonuc, sonuc.veri.not)))
			error(404, BULUNAMADI);
		return {
			bildirim: {
				mesaj: 'Sonuç kaydedildi.',
				baglanti: { href: '/kararlar', metin: 'Kalibrasyonu gör' }
			}
		};
	},
	bagKur: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const fd = await request.formData();
		const yon = alan(fd, 'yon') === 'gelen' ? 'gelen' : 'giden';
		const sonuc = bagDogrula(fd, params.id);
		if (!sonuc.tamam) {
			return fail(400, { bag: { yon, hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}

		const durum = await bagKur(kullanici.id, sonuc.veri);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') {
			return fail(400, {
				bag: {
					yon,
					hatalar: { digerId: 'Bu iki düğüm zaten bu yönde bağlı.' },
					degerler: {
						digerId: alan(fd, 'digerId'),
						not: alan(fd, 'not'),
						tarih: alan(fd, 'tarih')
					}
				}
			});
		}
		return { bildirim: { mesaj: 'Bağ kuruldu.' } };
	},

	bagGuncelle: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const bagId = alan(fd, 'bagId');
		if (!uuidMu(bagId)) error(404, 'Bağ bulunamadı.');
		const sonuc = bagBilgisiDogrula(fd);
		if (!sonuc.tamam) {
			return fail(400, {
				bagDuzenle: { bagId, hatalar: sonuc.hatalar, degerler: sonuc.degerler }
			});
		}
		if (!(await bagGuncelle(bagId, kullanici.id, sonuc.veri))) error(404, 'Bağ bulunamadı.');
		return { bildirim: { mesaj: 'Bağ güncellendi.' } };
	},

	bagSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const bagId = alan(await request.formData(), 'bagId');
		const silinen = uuidMu(bagId) ? await bagSil(bagId, kullanici.id) : null;
		if (!silinen) error(404, 'Bağ bulunamadı.');
		// "Geri al", bağı aynı bilgilerle kaynağın sayfasından yeniden kurar
		return {
			bildirim: {
				mesaj: 'Bağ kaldırıldı.',
				geriAl: {
					eylem: `/dugumler/${silinen.kaynakId}?/bagKur`,
					alanlar: {
						yon: 'giden',
						digerId: silinen.hedefId,
						not: silinen.not ?? '',
						tarih: tarihGirdisi(silinen.tarih, silinen.tarihHassasiyeti)
					}
				}
			}
		};
	},

	durum: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const deger = alan(await request.formData(), 'durum');
		const durum = eserDurumuMu(deger) ? deger : null;
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const sonuc = await durumGuncelle(params.id, kullanici.id, durum);
		if (!sonuc) error(404, BULUNAMADI);
		return {
			bildirim: {
				mesaj: sonuc.tarihEklendi
					? `Durum: ${durumEtiketi(durum ?? 'bitti', sonuc.eserTuru)}. Tarih ${tarihYaz(sonuc.tarihEklendi, 'ay')} olarak eklendi.`
					: durum
						? `Durum: ${durumEtiketi(durum, sonuc.eserTuru)}.`
						: 'Durum kaldırıldı.'
			}
		};
	},

	/** Eserin yazarını/yönetmenini/sanatçısını kişi düğümü olarak ekler (kişi → eser bağıyla) */
	yapimciEkle: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const kisiId = await yapimciyiEkle(kullanici.id, params.id, 'Eserin yapımcısı');
		if (!kisiId) error(404, BULUNAMADI);
		return {
			bildirim: {
				mesaj: 'Kişi haritana eklendi ve bu esere bağlandı.',
				baglanti: { href: `/dugumler/${kisiId}`, metin: 'Kişiye git' }
			}
		};
	},

	/** Kişi ya da yer için Wikidata'dan bilgi: yalnızca boş alanlar doldurulur */
	wikidata: async ({ params, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const sonuc = await dugumGetir(params.id, kullanici.id);
		if (!sonuc || sonuc.dugum.sahipId !== kullanici.id) error(404, BULUNAMADI);
		const ozet = await wikidataAra(sonuc.dugum.baslik);
		if (!ozet) {
			return fail(404, {
				bildirim: { mesaj: 'Wikidata’da bu adla bir kayıt bulunamadı.', tur: 'hata' as const }
			});
		}
		const doldurulan = await wikidataUygula(kullanici.id, params.id, ozet);
		return {
			bildirim: {
				mesaj: doldurulan?.length
					? `Wikidata’dan eklendi: ${doldurulan.join(', ')}.`
					: 'Wikidata kaydı bağlandı; dolu alanlarına dokunulmadı.'
			}
		};
	},

	alintiEkle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		const sonuc = alintiDogrula(await request.formData());
		if (!sonuc.tamam) {
			return fail(400, { alinti: { hatalar: sonuc.hatalar, degerler: sonuc.degerler } });
		}
		if (!(await alintiEkle(kullanici.id, params.id, sonuc.veri))) error(404, BULUNAMADI);
		return { bildirim: { mesaj: 'Alıntı eklendi.' } };
	},

	alintiSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const id = alan(await request.formData(), 'alintiId');
		if (!uuidMu(id) || !(await alintiSil(id, kullanici.id))) error(404, 'Alıntı bulunamadı.');
		return { bildirim: { mesaj: 'Alıntı silindi.' } };
	},

	/** Bağı bu düğümün bir alıntısına iliştirir (ya da ilişiği kaldırır) */
	bagAlintisi: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const bagId = alan(fd, 'bagId');
		const alintiId = alan(fd, 'alintiId');
		if (!uuidMu(params.id) || !uuidMu(bagId)) error(404, 'Bağ bulunamadı.');
		if (
			alintiId &&
			(!uuidMu(alintiId) || (await alintiKaynagi(alintiId, kullanici.id)) !== params.id)
		) {
			error(404, 'Alıntı bulunamadı.');
		}
		if (!(await bagAlintisiAyarla(bagId, kullanici.id, params.id, alintiId || null))) {
			error(404, 'Bağ bulunamadı.');
		}
		return {
			bildirim: { mesaj: alintiId ? 'Bağ alıntıya iliştirildi.' : 'Alıntı ilişiği kaldırıldı.' }
		};
	},

	/** Başkasının bu düğümünden kendi düğümüne bağ ("senin izin beni buraya götürdü") */
	disBagKur: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const fd = await request.formData();
		const hedefId = alan(fd, 'digerId');
		const not = alan(fd, 'not').slice(0, 1000) || null;
		if (!uuidMu(params.id)) error(404, BULUNAMADI);
		if (!uuidMu(hedefId)) return fail(400, { disHata: 'Kendi haritandan bir düğüm seç.' });
		const durum = await disBagKur(kullanici.id, params.id, hedefId, not);
		if (durum === 'yetkisiz') error(404, BULUNAMADI);
		if (durum === 'zaten-var') return fail(400, { disHata: 'Bu bağı zaten kurmuşsun.' });
		return {
			bildirim: {
				mesaj: 'Bağ kuruldu; düğümün sahibine haber verildi.',
				baglanti: { href: `/dugumler/${hedefId}`, metin: 'Düğümüne git' }
			}
		};
	},

	disBagSil: async ({ request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const bagId = alan(await request.formData(), 'bagId');
		if (!uuidMu(bagId) || !(await disBagSil(kullanici.id, bagId))) error(404, 'Bağ bulunamadı.');
		return { bildirim: { mesaj: 'Bağ kaldırıldı.' } };
	},

	/** Keşif yolundaki eseri merak listesine ekler; bu düğümden ona bağ kurar */
	kesifEkle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const kanonikId = alan(await request.formData(), 'kanonikId');
		if (!uuidMu(params.id) || !uuidMu(kanonikId)) error(404, BULUNAMADI);
		const k = await kanonikGetir(kanonikId);
		if (!k) error(404, 'Eser bulunamadı.');
		const varolan = await kanonikDugumu(kullanici.id, kanonikId);
		const kayit = await dugumVeGetireniKaydet(
			kullanici.id,
			varolan
				? { kip: 'mevcut', id: varolan }
				: {
						kip: 'yeni',
						veri: {
							tur: 'eser',
							eserTuru: k.eserTuru,
							baslik: k.baslik,
							altBaslik: k.altBaslik,
							aciklama: null,
							tarih: null,
							tarihHassasiyeti: null,
							yil: k.yil,
							enlem: null,
							boylam: null,
							yerAdi: null,
							gizlilik: 'ozel',
							durum: 'merak',
							...(k.disKaynak && k.disKimlik
								? {
										disKaynak: k.disKaynak,
										disKimlik: k.disKimlik,
										gorselUrl: gorselGuvenliMi(k.gorselUrl) ? k.gorselUrl : null
									}
								: {})
						}
					},
			{ kip: 'mevcut', id: params.id },
			'Keşif yolundan'
		);
		if (kayit === 'yetkisiz') error(404, BULUNAMADI);
		return {
			bildirim: {
				mesaj: `“${k.baslik}” merak listene eklendi.`,
				baglanti: { href: `/dugumler/${kayit.dugumId}`, metin: 'Aç' }
			}
		};
	},

	izeEkle: async ({ params, request, locals, url }) => {
		const kullanici = girisGerekli(locals, url);
		const izId = alan(await request.formData(), 'izId');
		if (!uuidMu(params.id) || !uuidMu(izId)) {
			return fail(400, { izHatasi: 'Eklemek istediğin izi seç.' });
		}
		const durum = await durakEkle(izId, kullanici.id, params.id);
		if (durum === 'yetkisiz') error(404, 'İz bulunamadı.');
		if (durum === 'zaten-var') return fail(400, { izHatasi: 'Bu düğüm zaten o izde.' });
		return {
			bildirim: {
				mesaj: 'Düğüm izin son durağı olarak eklendi.',
				baglanti: { href: `/izler/${izId}`, metin: 'İze git' }
			}
		};
	}
};
