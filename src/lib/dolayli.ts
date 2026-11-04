// Dolaylı bağlar: açık haritada iki görünür düğüm arasında yalnızca gizli düğümlerden geçen bir
// yol varsa, gizli düğümleri hiç göstermeden tek bir "dolaylı" bağ çizilir. Aradaki düğümlerin
// sayısı, türü ve notları sızmaz. Saf fonksiyon; birim testleri dolayli.test.ts'de.

export type YalinBag = { kaynakId: string; hedefId: string };

/**
 * `gorunurler` dışındaki düğümler gizlidir. Her görünür düğümden, yalnızca gizli düğümlerden
 * geçerek (en çok `enFazlaDerinlik` adım) varılan görünür düğümler için bir dolaylı bağ döner.
 * Doğrudan bağı olan çiftler için dolaylı bağ üretilmez.
 */
export function dolayliBaglar(
	gorunurler: Set<string>,
	baglar: YalinBag[],
	enFazlaDerinlik = 6
): YalinBag[] {
	const cikis = new Map<string, string[]>();
	const dogrudan = new Set<string>();
	for (const b of baglar) {
		if (b.kaynakId === b.hedefId) continue;
		cikis.set(b.kaynakId, [...(cikis.get(b.kaynakId) ?? []), b.hedefId]);
		if (gorunurler.has(b.kaynakId) && gorunurler.has(b.hedefId)) {
			dogrudan.add(`${b.kaynakId}>${b.hedefId}`);
		}
	}

	const sonuc: YalinBag[] = [];
	for (const baslangic of gorunurler) {
		// Yalnızca gizli düğümlerin içinden ilerle
		const gorulen = new Set<string>();
		let sinir = (cikis.get(baslangic) ?? []).filter((h) => !gorunurler.has(h));
		const varilan = new Set<string>();
		for (let derinlik = 1; sinir.length && derinlik < enFazlaDerinlik; derinlik++) {
			const sonraki: string[] = [];
			for (const gizli of sinir) {
				if (gorulen.has(gizli)) continue;
				gorulen.add(gizli);
				for (const h of cikis.get(gizli) ?? []) {
					if (gorunurler.has(h)) {
						if (h !== baslangic) varilan.add(h);
					} else if (!gorulen.has(h)) sonraki.push(h);
				}
			}
			sinir = sonraki;
		}
		for (const h of varilan) {
			if (!dogrudan.has(`${baslangic}>${h}`)) sonuc.push({ kaynakId: baslangic, hedefId: h });
		}
	}
	return sonuc;
}
