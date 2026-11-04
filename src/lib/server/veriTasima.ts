// Veri taşıma: dışa aktarma (JSON + Markdown) ve JSON'dan içe aktarma.
// Biçim dosyası sürümlüdür ("iz-disa-aktarma", sürüm 1). İçe aktarma eklemelidir: hiçbir şey silinmez,
// kimlikler yeniden üretilir, aynı dış eser zaten haritadaysa yenisi açılmaz.
// Doğrulama ve Markdown saf fonksiyonlardır (birim testleri: veriTasima.test.ts).
import {
	DUGUM_TURU_ETIKETI,
	dugumTuruMu,
	ESER_TURU_ETIKETI,
	eserDurumuMu,
	eserTuruMu,
	gizlilikMi,
	type DugumTuru,
	type EserDurumu,
	type EserTuru,
	type Gizlilik,
	type TarihHassasiyeti
} from '../sabitler';
import { tarihYaz } from '../tarih';
import { disKimlikGecerliMi, gorselGuvenliMi } from './eserArama';

export const DISA_AKTARMA_BICIMI = 'iz-disa-aktarma';
export const DISA_AKTARMA_SURUMU = 1;
export const ICE_AKTARMA_SINIRI = { dugum: 5000, bag: 20000, iz: 500, durak: 200 };

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
};
export type TasinanBag = {
	kaynakId: string;
	hedefId: string;
	not: string | null;
	tarih: string | null;
	tarihHassasiyeti: TarihHassasiyeti | null;
};
export type TasinanIz = {
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
};

// ——— Markdown ———

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
		if (d.aciklama) s.push('', satirSonu(d.aciklama));
		const gidenler = giden.get(d.id) ?? [];
		if (gidenler.length) {
			s.push('', 'Beni şuna götürdü:');
			for (const b of gidenler) {
				s.push(`- ${ad.get(b.hedefId) ?? '?'}${b.not ? ` — ${b.not.replace(/\s+/g, ' ')}` : ''}`);
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
	if (girdi.surum !== DISA_AKTARMA_SURUMU) {
		return { tamam: false, hata: 'Bu dosyanın sürümü desteklenmiyor.' };
	}
	const { dugumler: d, baglar: b, izler: i } = girdi;
	if (!Array.isArray(d) || !Array.isArray(b) || !Array.isArray(i)) {
		return { tamam: false, hata: 'Dosyada düğüm, bağ ya da iz listesi eksik.' };
	}
	if (
		d.length > ICE_AKTARMA_SINIRI.dugum ||
		b.length > ICE_AKTARMA_SINIRI.bag ||
		i.length > ICE_AKTARMA_SINIRI.iz
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
			y: sayi(x.y, -1e7, 1e7)
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
			...tarihCifti(x)
		});
	}

	const izler: TasinanIz[] = [];
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
		izler.push({
			baslik,
			aciklama: metin(x.aciklama, 2000),
			gizlilik: gizlilikMi(x.gizlilik) ? x.gizlilik : 'ozel',
			duraklar
		});
	}

	return {
		tamam: true,
		veri: { bicim: DISA_AKTARMA_BICIMI, surum: DISA_AKTARMA_SURUMU, dugumler, baglar, izler },
		atlanan
	};
}
