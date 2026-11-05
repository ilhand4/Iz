// İz paylaşım görseli (Open Graph, 1200×630). SVG saf olarak üretilir (birim testli), PNG'ye
// rota içinde resvg ile çevrilir. Tür şekilleri TurSekli.svelte ile aynı görsel dil.
import type { DugumTuru } from '../sabitler';

export const OG_GENISLIK = 1200;
export const OG_YUKSEKLIK = 630;

// Açık temanın renkleri (tasarim.css ile aynı)
const RENK = {
	zemin: '#f7f3ec',
	yuzey: '#fffdf9',
	metin: '#1f1b16',
	soluk: '#665d51',
	cizgi: '#cbbfac',
	vurgu: '#b0432a'
};
const TUR_RENGI: Record<DugumTuru, string> = {
	eser: '#95580a',
	kisi: '#a83a63',
	yer: '#2b7149',
	karar: '#2c5ba5',
	ani: '#6f45a8'
};
const YAZI = "'Inter', 'Segoe UI', 'DejaVu Sans', Arial, sans-serif";
const BASLIK_YAZISI = "'Fraunces', Georgia, 'DejaVu Serif', serif";

export type OgDuragi = { tur: DugumTuru; baslik: string } | { gizli: true };

function kacir(metin: string) {
	return metin
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Sözcük sınırında satırlara böler (yaklaşık karakter genişliğiyle) */
export function satirlaraBol(metin: string, enFazlaKarakter: number, enFazlaSatir: number) {
	const sozcukler = metin.split(/\s+/).filter(Boolean);
	const satirlar: string[] = [];
	let simdiki = '';
	for (const s of sozcukler) {
		const aday = simdiki ? `${simdiki} ${s}` : s;
		if (aday.length <= enFazlaKarakter) simdiki = aday;
		else {
			if (simdiki) satirlar.push(simdiki);
			simdiki = s.length > enFazlaKarakter ? s.slice(0, enFazlaKarakter - 1) + '…' : s;
		}
	}
	if (simdiki) satirlar.push(simdiki);
	if (satirlar.length > enFazlaSatir) {
		const kesik = satirlar.slice(0, enFazlaSatir);
		kesik[enFazlaSatir - 1] = kesik[enFazlaSatir - 1].replace(/.?$/, '…');
		return kesik;
	}
	return satirlar;
}

function sekil(tur: DugumTuru | 'gizli', x: number, y: number, r: number) {
	const renk = tur === 'gizli' ? RENK.cizgi : TUR_RENGI[tur];
	const kenar = `stroke="${RENK.yuzey}" stroke-width="4"`;
	switch (tur) {
		case 'eser':
			return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.35}" fill="${renk}" ${kenar}/>`;
		case 'kisi':
			return `<circle cx="${x}" cy="${y}" r="${r}" fill="${renk}" ${kenar}/>`;
		case 'yer':
			return `<path d="M${x} ${y - r * 1.1}L${x + r * 1.1} ${y + r * 0.85}H${x - r * 1.1}Z" fill="${renk}" stroke-linejoin="round" ${kenar}/>`;
		case 'karar':
			return `<path d="M${x} ${y - r * 1.15}L${x + r * 1.15} ${y}L${x} ${y + r * 1.15}L${x - r * 1.15} ${y}Z" fill="${renk}" stroke-linejoin="round" ${kenar}/>`;
		case 'ani': {
			const n = Array.from({ length: 5 }, (_, i) => {
				const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
				return `${(x + r * 1.08 * Math.cos(a)).toFixed(1)} ${(y + r * 1.08 * Math.sin(a)).toFixed(1)}`;
			});
			return `<path d="M${n.join('L')}Z" fill="${renk}" stroke-linejoin="round" ${kenar}/>`;
		}
		default:
			return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${renk}" stroke-width="3" stroke-dasharray="6 5"/>`;
	}
}

/** İz görselinin SVG'si. Gizli durakların başlığı yoktur (yalnızca kesikli daire). */
export function izOgSvg(veri: { baslik: string; sahip: string; duraklar: OgDuragi[] }): string {
	const baslik = satirlaraBol(veri.baslik, 30, 2);
	const duraklar = veri.duraklar.slice(0, 6);
	const fazla = veri.duraklar.length - duraklar.length;
	const solBosluk = 90;
	const sagBosluk = 90;
	const aralik =
		duraklar.length > 1 ? (OG_GENISLIK - solBosluk - sagBosluk) / (duraklar.length - 1) : 0;
	const yolY = 420;
	const noktalar = duraklar.map((_, i) => ({
		x: duraklar.length === 1 ? OG_GENISLIK / 2 : solBosluk + i * aralik,
		// Hafif dalgalı yol
		y: yolY + (i % 2 === 0 ? -18 : 18)
	}));
	const yol =
		noktalar.length > 1
			? `<path d="M${noktalar.map((n) => `${n.x.toFixed(1)} ${n.y}`).join(' L')}" fill="none" stroke="${RENK.vurgu}" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>`
			: '';
	const sekiller = duraklar
		.map((d, i) => {
			const n = noktalar[i];
			const gizli = 'gizli' in d;
			const etiket = gizli ? 'Gizli durak' : satirlaraBol(d.baslik, 16, 2).join(' ');
			const satirlar = satirlaraBol(etiket, 16, 2);
			return `${sekil(gizli ? 'gizli' : d.tur, n.x, n.y, 26)}
	${satirlar
		.map(
			(s, j) =>
				`<text x="${n.x.toFixed(1)}" y="${n.y + 64 + j * 28}" text-anchor="middle" font-family="${YAZI}" font-size="22" font-weight="600" fill="${gizli ? RENK.soluk : RENK.metin}"${gizli ? ' font-style="italic"' : ''}>${kacir(s)}</text>`
		)
		.join('\n\t')}`;
		})
		.join('\n\t');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_GENISLIK}" height="${OG_YUKSEKLIK}" viewBox="0 0 ${OG_GENISLIK} ${OG_YUKSEKLIK}">
	<rect width="100%" height="100%" fill="${RENK.zemin}"/>
	<rect x="0" y="0" width="${OG_GENISLIK}" height="10" fill="${RENK.vurgu}"/>
	<text x="80" y="92" font-family="${YAZI}" font-size="26" font-weight="700" fill="${RENK.vurgu}" letter-spacing="2">İZ</text>
	${baslik
		.map(
			(s, i) =>
				`<text x="80" y="${180 + i * 72}" font-family="${BASLIK_YAZISI}" font-size="64" font-weight="600" fill="${RENK.metin}">${kacir(s)}</text>`
		)
		.join('\n\t')}
	<text x="80" y="${180 + baslik.length * 72 - 14}" font-family="${YAZI}" font-size="26" fill="${RENK.soluk}">${kacir(veri.sahip)} · ${veri.duraklar.length} durak${fazla > 0 ? ` (ilk ${duraklar.length})` : ''}</text>
	${yol}
	${sekiller}
	<text x="${OG_GENISLIK - 80}" y="${OG_YUKSEKLIK - 40}" text-anchor="end" font-family="${YAZI}" font-size="22" fill="${RENK.soluk}">Neyin seni neye götürdüğü</text>
</svg>`;
}

/** İz Yıllığı kartı: yılın özeti, sahibinin kendisi paylaşsın diye (1200×630) */
export function yillikSvg(veri: {
	yil: number;
	ad: string;
	toplam: number;
	enCokGoturen: { baslik: string; tur: DugumTuru; ulasilan: number } | null;
	zincir: { baslik: string; tur: DugumTuru }[];
	kumeSayisi: number;
}): string {
	const zincir = veri.zincir.slice(0, 5);
	const aralik = zincir.length > 1 ? (OG_GENISLIK - 180) / (zincir.length - 1) : 0;
	const nokta = (i: number) => ({
		x: zincir.length === 1 ? OG_GENISLIK / 2 : 90 + i * aralik,
		y: 470
	});
	const yol =
		zincir.length > 1
			? `<path d="M${zincir.map((_, i) => `${nokta(i).x.toFixed(1)} ${nokta(i).y}`).join(' L')}" fill="none" stroke="${RENK.vurgu}" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>`
			: '';
	const duraklar = zincir
		.map((d, i) => {
			const n = nokta(i);
			return `${sekil(d.tur, n.x, n.y, 22)}
	<text x="${n.x.toFixed(1)}" y="${n.y + 56}" text-anchor="middle" font-family="${YAZI}" font-size="20" font-weight="600" fill="${RENK.metin}">${kacir(satirlaraBol(d.baslik, 16, 1)[0] ?? '')}</text>`;
		})
		.join('\n\t');
	const satir = (y: number, etiket: string, deger: string) =>
		`<text x="80" y="${y}" font-family="${YAZI}" font-size="24" fill="${RENK.soluk}">${kacir(etiket)}</text>
	<text x="420" y="${y}" font-family="${YAZI}" font-size="26" font-weight="700" fill="${RENK.metin}">${kacir(deger)}</text>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_GENISLIK}" height="${OG_YUKSEKLIK}" viewBox="0 0 ${OG_GENISLIK} ${OG_YUKSEKLIK}">
	<rect width="100%" height="100%" fill="${RENK.zemin}"/>
	<rect x="0" y="0" width="${OG_GENISLIK}" height="10" fill="${RENK.vurgu}"/>
	<text x="80" y="92" font-family="${YAZI}" font-size="26" font-weight="700" fill="${RENK.vurgu}" letter-spacing="2">İZ YILLIĞI</text>
	<text x="80" y="190" font-family="${BASLIK_YAZISI}" font-size="96" font-weight="600" fill="${RENK.metin}">${veri.yil}</text>
	<text x="330" y="190" font-family="${YAZI}" font-size="28" fill="${RENK.soluk}">${kacir(veri.ad)}</text>
	${satir(260, 'Yılın düğümleri', String(veri.toplam))}
	${veri.enCokGoturen ? satir(304, 'En çok yere götüren', `${satirlaraBol(veri.enCokGoturen.baslik, 34, 1)[0]} (${veri.enCokGoturen.ulasilan})`) : ''}
	${satir(348, 'Yeni kümeler', String(veri.kumeSayisi))}
	${zincir.length > 1 ? `<text x="80" y="410" font-family="${YAZI}" font-size="22" fill="${RENK.soluk}">Yılın en uzun zinciri</text>` : ''}
	${yol}
	${duraklar}
</svg>`;
}
