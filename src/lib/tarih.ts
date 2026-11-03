import type { TarihHassasiyeti } from './sabitler';

export type CozulmusTarih = { tarih: string; hassasiyet: TarihHassasiyeti };

const AYLAR = [
	'Ocak',
	'Şubat',
	'Mart',
	'Nisan',
	'Mayıs',
	'Haziran',
	'Temmuz',
	'Ağustos',
	'Eylül',
	'Ekim',
	'Kasım',
	'Aralık'
];

function gecerliGunMu(yil: number, ay: number, gun: number): boolean {
	const d = new Date(Date.UTC(yil, ay - 1, gun));
	return d.getUTCFullYear() === yil && d.getUTCMonth() === ay - 1 && d.getUTCDate() === gun;
}

const iki = (n: number) => String(n).padStart(2, '0');

/**
 * Kullanıcının yazdığı tarihi çözer. Kabul edilen biçimler:
 * "1998" → yıl, "1998-05" ya da "05.1998" → ay, "1998-05-12" ya da "12.05.1998" → gün.
 * Boş metin için null, geçersiz metin için 'gecersiz' döner.
 */
export function tarihCoz(metin: string | null | undefined): CozulmusTarih | null | 'gecersiz' {
	const m = (metin ?? '').trim();
	if (!m) return null;

	let yil: number, ay = 1, gun = 1;
	let hassasiyet: TarihHassasiyeti;
	let parca: RegExpExecArray | null;

	if ((parca = /^(\d{4})$/.exec(m))) {
		yil = +parca[1];
		hassasiyet = 'yil';
	} else if ((parca = /^(\d{4})-(\d{1,2})$/.exec(m))) {
		[yil, ay] = [+parca[1], +parca[2]];
		hassasiyet = 'ay';
	} else if ((parca = /^(\d{1,2})[./](\d{4})$/.exec(m))) {
		[ay, yil] = [+parca[1], +parca[2]];
		hassasiyet = 'ay';
	} else if ((parca = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(m))) {
		[yil, ay, gun] = [+parca[1], +parca[2], +parca[3]];
		hassasiyet = 'gun';
	} else if ((parca = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(m))) {
		[gun, ay, yil] = [+parca[1], +parca[2], +parca[3]];
		hassasiyet = 'gun';
	} else {
		return 'gecersiz';
	}

	if (yil < 1 || yil > 2999 || !gecerliGunMu(yil, ay, gun)) return 'gecersiz';
	return { tarih: `${String(yil).padStart(4, '0')}-${iki(ay)}-${iki(gun)}`, hassasiyet };
}

/** Veritabanındaki tarihi formdaki metin kutusu için geri yazar */
export function tarihGirdisi(tarih: string | null, hassasiyet: TarihHassasiyeti | null): string {
	if (!tarih || !hassasiyet) return '';
	if (hassasiyet === 'yil') return tarih.slice(0, 4);
	if (hassasiyet === 'ay') return tarih.slice(0, 7);
	return tarih;
}

/** Tarihi hassasiyetine göre Türkçe yazar: "1998", "Mayıs 1998", "12 Mayıs 1998" */
export function tarihYaz(tarih: string | null, hassasiyet: TarihHassasiyeti | null): string {
	if (!tarih || !hassasiyet) return '';
	const [yil, ay, gun] = tarih.split('-').map(Number);
	if (hassasiyet === 'yil') return String(yil);
	if (hassasiyet === 'ay') return `${AYLAR[ay - 1]} ${yil}`;
	return `${gun} ${AYLAR[ay - 1]} ${yil}`;
}
