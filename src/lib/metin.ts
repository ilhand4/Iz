// Metin yardımcıları (sunucu ve tarayıcı ortak)

/**
 * Arama için sadeleştirir: Türkçe kurallarıyla küçük harfe çevirir, aksanları ve
 * noktasız ı'yı atar. Böylece "kurk" → "Kürk", "istanbul" → "İSTANBUL", "isik" → "Işık" bulunur.
 */
export function sadelestir(metin: string): string {
	return metin
		.toLocaleLowerCase('tr')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ı/g, 'i')
		.trim();
}

/** Sorgudaki her sözcük metinde geçiyorsa eşleşir (sıra önemsiz) */
export function eslesir(metin: string, sorgu: string): boolean {
	const hedef = sadelestir(metin);
	return sadelestir(sorgu)
		.split(/\s+/)
		.filter(Boolean)
		.every((sozcuk) => hedef.includes(sozcuk));
}

/** Uzun metni sözcük sınırında kısaltır */
export function kisalt(metin: string, uzunluk: number): string {
	if (metin.length <= uzunluk) return metin;
	const kesik = metin.slice(0, uzunluk - 1);
	const bosluk = kesik.lastIndexOf(' ');
	return (bosluk > uzunluk * 0.6 ? kesik.slice(0, bosluk) : kesik).trimEnd() + '…';
}
