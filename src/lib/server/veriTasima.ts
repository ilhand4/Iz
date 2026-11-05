// Veri taşıma: dışa aktarma (JSON + Markdown) ve JSON'dan içe aktarma.
// Biçim dosyası sürümlüdür ("iz-disa-aktarma"; sürüm 2, sürüm 1 dosyaları da okunur). İçe aktarma eklemelidir: hiçbir şey silinmez,
// kimlikler yeniden üretilir, aynı dış eser zaten haritadaysa yenisi açılmaz.
// Doğrulama ve Markdown saf fonksiyonlardır (birim testleri: veriTasima.test.ts).
import { KARAR_SONUCU_ETIKETI, kararSonucuMu, type KararSonucu } from '../kararDefteri';
import {
	bagTuruMu,
	BAG_TURU_ETIKETI,
	DONEM_RENKLERI,
	DUGUM_TURU_ETIKETI,
	dugumTuruMu,
	ESER_TURU_ETIKETI,
	eserDurumuMu,
	eserTuruMu,
	ETKI_ETIKETI,
	etkiMi,
	gizlilikMi,
	type BagTuru,
	type DonemRengi,
	type DugumTuru,
	type EserDurumu,
	type EserTuru,
	type Etki,
	type Gizlilik,
	type TarihHassasiyeti
} from '../sabitler';
import { tarihYaz } from '../tarih';
import { disKimlikGecerliMi, gorselGuvenliMi } from './eserArama';

export const DISA_AKTARMA_BICIMI = 'iz-disa-aktarma';
export const DISA_AKTARMA_SURUMU = 2;
/** İçe aktarmanın okuyabildiği sürümler (eski dosyalar geçerli kalır) */
const DESTEKLENEN_SURUMLER = [1, 2];
export const ICE_AKTARMA_SINIRI = {
	dugum: 5000,
	bag: 20000,
	iz: 500,
	durak: 200,
	alinti: 20000,
	donem: 500
};

export type TasinanKarar = {
	gerekce: string | null;
	beklenti: string | null;
	guven: number | null;
	sorulacak: string | null;
	sonuc: KararSonucu | null;
	sonucNotu: string | null;
	sonucTarihi: string | null;
};

export type TasinanDugum = {
	id: string;
	tur: DugumTuru;
	eserTuru: EserTuru | null;
	baslik: string;
	altBaslik: string | null;
	aciklama: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
	yil: number | null;
	enlem: number | null;
	boylam: number | null;
	yerAdi: string | null;
	gizlilik: Gizlilik;
	durum: EserDurumu | null;
	disKaynak: string | null;
	disKimlik: string | null;
	gorselUrl: string | null;
	x?: number | null;
	y?: number | null;
	// Sürüm 2
	etki?: Etki | null;
	wikidata?: string | null;
	karar?: TasinanKarar | null;
};
export type TasinanBag = {
	kaynakId: string;
	hedefId: string;
	not: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
	// Sürüm 2
	tur?: BagTuru | null;
	alintiId?: string | null;
};
export type TasinanIz = {
	/** Sürüm 2: yalnızca çatallanmayı (ata iz) eşlemek için; içe aktarmada yeniden üretilir */
	id?: string;
	ataIzId?: string | null;
	/** Ata izde ayrılınan durağın sırası (1'den) */
	ayrilmaSirasi?: number | null;
	baslik: string;
	aciklama: string | null;
	gizlilik: Gizlilik;
	duraklar: { dugumId: string; not: string | null }[];
};
export type DisaAktarma = {
	bicim: typeof DISA_AKTARMA_BICIMI;
	surum: number;
	olusturma: string;
	hesap: { kullaniciAdi: string; ad: string; hakkinda: string | null };
	dugumler: TasinanDugum[];
	baglar: TasinanBag[];
	izler: TasinanIz[];
	// Sürüm 2
	alintilar?: TasinanAlinti[];
	donemler?: TasinanDonem[];
};
export type TasinanAlinti = { id: string; dugumId: string; metin: string; yer: string | null };
export type TasinanDonem = {
	ad: string;
	baslangic: string;
	bitis: string | null;
	renk: DonemRengi;
};

// ——— Markdown ———

function tekSatir(metin: string) {
	return metin.replace(/\s+/g, ' ');
}

function satirSonu(metin: string) {
	// Markdown'da tek satır sonu görünmez; paragraf içi satırları korumak için iki boşluk
	return metin.replace(/\r?\n/g, '  \n');
}

/** İnsanın okuyacağı Markdown: her düğüm bir başlık, altında bağları; sonra izler */
export function markdownYaz(veri: DisaAktarma): string {
	const ad = new Map(veri.dugumler.map((d) => [d.id, d.baslik]));
	const giden = new Map<string, TasinanBag[]>();
	for (const b of veri.baglar) giden.set(b.kaynakId, [...(giden.get(b.kaynakId) ?? []), b]);

	const s: string[] = [];
	s.push(`# ${veri.hesap.ad} — İz haritası`, '');
	s.push(
		`@${veri.hesap.kullaniciAdi} · ${veri.dugumler.length} düğüm, ${veri.baglar.length} bağ, ${veri.izler.length} iz · ${veri.olusturma.slice(0, 10)}`,
		''
	);
	if (veri.hesap.hakkinda) s.push(`> ${satirSonu(veri.hesap.hakkinda)}`, '');

	if (veri.donemler?.length) {
		s.push('## Dönemler', '');
		for (const d of veri.donemler) {
			s.push(
				`- **${d.ad}** · ${d.baslangic.slice(0, 4)} – ${d.bitis ? d.bitis.slice(0, 4) : 'sürüyor'}`
			);
		}
		s.push('');
	}
	const alintilar = new Map<string, TasinanAlinti[]>();
	for (const a of veri.alintilar ?? [])
		alintilar.set(a.dugumId, [...(alintilar.get(a.dugumId) ?? []), a]);

	if (veri.izler.length) {
		s.push('## İzler', '');
		for (const iz of veri.izler) {
			s.push(`### ${iz.baslik}`, '');
			if (iz.aciklama) s.push(satirSonu(iz.aciklama), '');
			iz.duraklar.forEach((d, i) => {
				const baslik = ad.get(d.dugumId) ?? '(bilinmeyen düğüm)';
				s.push(`${i + 1}. **${baslik}**${d.not ? ` — ${d.not.replace(/\s+/g, ' ')}` : ''}`);
			});
			s.push('');
		}
	}

	s.push('## Düğümler', '');
	for (const d of veri.dugumler) {
		s.push(`### ${d.baslik}`, '');
		const tur = d.eserTuru ? ESER_TURU_ETIKETI[d.eserTuru] : DUGUM_TURU_ETIKETI[d.tur];
		const bilgiler = [tur, d.altBaslik, d.yil?.toString()].filter(Boolean).join(' · ');
		s.push(`- ${bilgiler}`);
		if (d.tarih && d.tarihHassasiyeti) s.push(`- Tarih: ${tarihYaz(d.tarih, d.tarihHassasiyeti)}`);
		if (d.yerAdi) s.push(`- Yer: ${d.yerAdi}`);
		if (d.etki) s.push(`- Etkisi: ${ETKI_ETIKETI[d.etki]}`);
		if (d.aciklama) s.push('', satirSonu(d.aciklama));
		for (const a of alintilar.get(d.id) ?? []) {
			s.push('', `> ${satirSonu(a.metin)}${a.yer ? ` (${a.yer})` : ''}`);
		}
		if (d.karar) {
			const k = d.karar;
			s.push('', 'Karar defteri:');
			if (k.gerekce) s.push(`- Gerekçe: ${tekSatir(k.gerekce)}`);
			if (k.beklenti) s.push(`- Beklenti: ${tekSatir(k.beklenti)}`);
			if (k.guven !== null) s.push(`- Güven: %${k.guven}`);
			if (k.sonuc) {
				s.push(
					`- Sonuç: ${KARAR_SONUCU_ETIKETI[k.sonuc]}${k.sonucNotu ? ` — ${tekSatir(k.sonucNotu)}` : ''}`
				);
			} else if (k.sorulacak) s.push(`- Sonucu sorulacak: ${k.sorulacak}`);
		}
		const gidenler = giden.get(d.id) ?? [];
		if (gidenler.length) {
			s.push('', 'Beni şuna götürdü:');
			for (const b of gidenler) {
				const tur = b.tur ? ` (${BAG_TURU_ETIKETI[b.tur].toLocaleLowerCase('tr-TR')})` : '';
				s.push(`- ${ad.get(b.hedefId) ?? '?'}${tur}${b.not ? ` — ${tekSatir(b.not)}` : ''}`);
			}
		}
		s.push('');
	}
	return s.join('\n');
}

// ——— İçe aktarma doğrulaması ———

type Ham = Record<string, unknown>;
const nesneMi = (x: unknown): x is Ham => typeof x === 'object' && x !== null && !Array.isArray(x);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

function metin(x: unknown, enFazla: number): string | null {
	if (typeof x !== 'string') return null;
	const t = x.trim();
	return t ? t.slice(0, enFazla) : null;
}

function sayi(x: unknown, alt: number, ust: number): number | null {
	return typeof x === 'number' && Number.isFinite(x) && x >= alt && x <= ust ? x : null;
}

/** Takvimde gerçekten olan bir gün mü? ("2020-02-31" gibi değerler veritabanında hata verir) */
function gecerliGun(tarih: string) {
	const t = new Date(`${tarih}T00:00:00Z`);
	return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === tarih;
}

function tarihCifti(x: Ham): { tarih: string | null; tarihHassasiyeti: TarihHassasiyeti | null } {
	const h = x.tarihHassasiyeti;
	if (
		typeof x.tarih === 'string' &&
		TARIH.test(x.tarih) &&
		gecerliGun(x.tarih) &&
		(h === 'gun' || h === 'ay' || h === 'yil')
	) {
		return { tarih: x.tarih, tarihHassasiyeti: h };
	}
	return { tarih: null, tarihHassasiyeti: null };
}

export type IceAktarmaSonucu =
	| { tamam: true; veri: Omit<DisaAktarma, 'hesap' | 'olusturma'>; atlanan: number }
	| { tamam: false; hata: string };

/**
 * Dosyayı doğrular ve temizler. Bozuk tek tek kayıtlar atlanır (sayısı bildirilir);
 * biçim tanınmıyorsa ya da sınırlar aşılıyorsa tüm dosya reddedilir.
 */
export function iceAktarmaDogrula(girdi: unknown): IceAktarmaSonucu {
	if (!nesneMi(girdi) || girdi.bicim !== DISA_AKTARMA_BICIMI) {
		return { tamam: false, hata: 'Bu dosya bir İz dışa aktarma dosyası değil.' };
	}
	if (typeof girdi.surum !== 'number' || !DESTEKLENEN_SURUMLER.includes(girdi.surum)) {
		return { tamam: false, hata: 'Bu dosyanın sürümü desteklenmiyor.' };
	}
	const { dugumler: d, baglar: b, izler: i } = girdi;
	// Sürüm 1'de bu listeler yok
	const a = girdi.alintilar ?? [];
	const dn = girdi.donemler ?? [];
	if (!Array.isArray(a) || !Array.isArray(dn)) {
		return { tamam: false, hata: 'Dosyadaki alıntı ya da dönem listesi bozuk.' };
	}
	if (!Array.isArray(d) || !Array.isArray(b) || !Array.isArray(i)) {
		return { tamam: false, hata: 'Dosyada düğüm, bağ ya da iz listesi eksik.' };
	}
	if (
		d.length > ICE_AKTARMA_SINIRI.dugum ||
		b.length > ICE_AKTARMA_SINIRI.bag ||
		i.length > ICE_AKTARMA_SINIRI.iz ||
		a.length > ICE_AKTARMA_SINIRI.alinti ||
		dn.length > ICE_AKTARMA_SINIRI.donem
	) {
		return {
			tamam: false,
			hata: `Dosya çok büyük (en fazla ${ICE_AKTARMA_SINIRI.dugum} düğüm, ${ICE_AKTARMA_SINIRI.bag} bağ, ${ICE_AKTARMA_SINIRI.iz} iz).`
		};
	}

	let atlanan = 0;
	const dugumler: TasinanDugum[] = [];
	const kimlikler = new Set<string>();
	for (const x of d) {
		const baslik = nesneMi(x) ? metin(x.baslik, 200) : null;
		if (
			!nesneMi(x) ||
			!baslik ||
			typeof x.id !== 'string' ||
			!UUID.test(x.id) ||
			kimlikler.has(x.id) ||
			!dugumTuruMu(x.tur)
		) {
			atlanan++;
			continue;
		}
		const tur = x.tur;
		const eserTuru = tur === 'eser' ? (eserTuruMu(x.eserTuru) ? x.eserTuru : 'kitap') : null;
		const enlem = sayi(x.enlem, -90, 90);
		const boylam = sayi(x.boylam, -180, 180);
		const konumVar = enlem !== null && boylam !== null;
		const disKaynak = x.disKaynak === 'openlibrary' || x.disKaynak === 'tmdb' ? x.disKaynak : null;
		const disKimlik =
			disKaynak && typeof x.disKimlik === 'string' && disKimlikGecerliMi(disKaynak, x.disKimlik)
				? x.disKimlik
				: null;
		const gorselUrl =
			typeof x.gorselUrl === 'string' && gorselGuvenliMi(x.gorselUrl) ? x.gorselUrl : null;
		const yil = sayi(x.yil, -5000, 3000);
		kimlikler.add(x.id);
		dugumler.push({
			id: x.id,
			tur,
			eserTuru,
			baslik,
			altBaslik: metin(x.altBaslik, 200),
			aciklama: metin(x.aciklama, 5000),
			...tarihCifti(x),
			yil: yil === null ? null : Math.trunc(yil),
			enlem: konumVar ? enlem : null,
			boylam: konumVar ? boylam : null,
			yerAdi: metin(x.yerAdi, 200),
			gizlilik: gizlilikMi(x.gizlilik) ? x.gizlilik : 'ozel',
			durum: tur === 'eser' && eserDurumuMu(x.durum) ? x.durum : null,
			disKaynak: disKimlik ? disKaynak : null,
			disKimlik,
			gorselUrl,
			x: sayi(x.x, -1e7, 1e7),
			y: sayi(x.y, -1e7, 1e7),
			etki: etkiMi(x.etki) ? x.etki : null,
			wikidata:
				typeof x.wikidata === 'string' && /^Q\d{1,12}$/.test(x.wikidata) ? x.wikidata : null,
			karar: tur === 'karar' ? kararTemizle(x.karar) : null
		});
	}

	const alintilar: TasinanAlinti[] = [];
	/** alıntı kimliği → düğüm kimliği (bağın alıntısı kaynak düğümünden olmalı) */
	const alintiKimlikleri = new Map<string, string>();
	for (const x of a) {
		const m = nesneMi(x) ? metin(x.metin, 2000) : null;
		if (
			!nesneMi(x) ||
			!m ||
			typeof x.id !== 'string' ||
			!UUID.test(x.id) ||
			alintiKimlikleri.has(x.id) ||
			typeof x.dugumId !== 'string' ||
			!kimlikler.has(x.dugumId)
		) {
			atlanan++;
			continue;
		}
		alintiKimlikleri.set(x.id, x.dugumId);
		alintilar.push({ id: x.id, dugumId: x.dugumId, metin: m, yer: metin(x.yer, 60) });
	}

	const donemler: TasinanDonem[] = [];
	for (const x of dn) {
		const ad = nesneMi(x) ? metin(x.ad, 80) : null;
		const baslangic = nesneMi(x) ? gunMu(x.baslangic) : null;
		const bitis = nesneMi(x) ? gunMu(x.bitis) : null;
		if (!nesneMi(x) || !ad || !baslangic || (bitis && bitis < baslangic)) {
			atlanan++;
			continue;
		}
		donemler.push({
			ad,
			baslangic,
			bitis,
			renk: (DONEM_RENKLERI as readonly unknown[]).includes(x.renk)
				? (x.renk as DonemRengi)
				: 'kiremit'
		});
	}

	const baglar: TasinanBag[] = [];
	const ciftler = new Set<string>();
	for (const x of b) {
		if (
			!nesneMi(x) ||
			typeof x.kaynakId !== 'string' ||
			typeof x.hedefId !== 'string' ||
			!kimlikler.has(x.kaynakId) ||
			!kimlikler.has(x.hedefId) ||
			x.kaynakId === x.hedefId ||
			ciftler.has(`${x.kaynakId}>${x.hedefId}`)
		) {
			atlanan++;
			continue;
		}
		ciftler.add(`${x.kaynakId}>${x.hedefId}`);
		baglar.push({
			kaynakId: x.kaynakId,
			hedefId: x.hedefId,
			not: metin(x.not, 1000),
			...tarihCifti(x),
			tur: bagTuruMu(x.tur) ? x.tur : null,
			alintiId:
				typeof x.alintiId === 'string' && alintiKimlikleri.get(x.alintiId) === x.kaynakId
					? x.alintiId
					: null
		});
	}

	const izler: TasinanIz[] = [];
	const izKimlikleri = new Set<string>();
	for (const x of i) {
		const baslik = nesneMi(x) ? metin(x.baslik, 120) : null;
		if (!nesneMi(x) || !baslik || !Array.isArray(x.duraklar)) {
			atlanan++;
			continue;
		}
		const gorulen = new Set<string>();
		const duraklar: TasinanIz['duraklar'] = [];
		for (const durak of x.duraklar.slice(0, ICE_AKTARMA_SINIRI.durak)) {
			if (
				!nesneMi(durak) ||
				typeof durak.dugumId !== 'string' ||
				!kimlikler.has(durak.dugumId) ||
				gorulen.has(durak.dugumId)
			)
				continue;
			gorulen.add(durak.dugumId);
			duraklar.push({ dugumId: durak.dugumId, not: metin(durak.not, 2000) });
		}
		const id = typeof x.id === 'string' && UUID.test(x.id) && !izKimlikleri.has(x.id) ? x.id : null;
		if (id) izKimlikleri.add(id);
		const sira = sayi(x.ayrilmaSirasi, 1, ICE_AKTARMA_SINIRI.durak);
		izler.push({
			...(id ? { id } : {}),
			ataIzId: typeof x.ataIzId === 'string' && UUID.test(x.ataIzId) ? x.ataIzId : null,
			ayrilmaSirasi: sira === null ? null : Math.trunc(sira),
			baslik,
			aciklama: metin(x.aciklama, 2000),
			gizlilik: gizlilikMi(x.gizlilik) && x.gizlilik !== 'golge' ? x.gizlilik : 'ozel',
			duraklar
		});
	}

	// Ata iz dosyada yoksa (ya da kendisiyse) çatallanma bilgisi düşer
	for (const iz of izler) {
		if (!iz.ataIzId || !izKimlikleri.has(iz.ataIzId) || iz.ataIzId === iz.id) {
			iz.ataIzId = null;
			iz.ayrilmaSirasi = null;
		}
	}

	return {
		tamam: true,
		veri: {
			bicim: DISA_AKTARMA_BICIMI,
			surum: DISA_AKTARMA_SURUMU,
			dugumler,
			baglar,
			izler,
			alintilar,
			donemler
		},
		atlanan
	};
}

function gunMu(t: unknown): string | null {
	return typeof t === 'string' && TARIH.test(t) && gecerliGun(t) ? t : null;
}

function kararTemizle(x: unknown): TasinanKarar | null {
	if (!nesneMi(x)) return null;
	const guven = sayi(x.guven, 0, 100);
	const sonuc = kararSonucuMu(x.sonuc) ? x.sonuc : null;
	const zaman = typeof x.sonucTarihi === 'string' ? new Date(x.sonucTarihi) : null;
	const k: TasinanKarar = {
		gerekce: metin(x.gerekce, 2000),
		beklenti: metin(x.beklenti, 1000),
		guven: guven === null ? null : Math.round(guven),
		sorulacak: gunMu(x.sorulacak),
		sonuc,
		sonucNotu: sonuc ? metin(x.sonucNotu, 1000) : null,
		sonucTarihi: sonuc && zaman && !Number.isNaN(zaman.getTime()) ? zaman.toISOString() : null
	};
	return Object.values(k).some((v) => v !== null) ? k : null;
}
