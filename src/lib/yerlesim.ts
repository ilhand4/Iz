// Ağda kalıcı yerleşim: kayıtlı konumu olmayan (yeni) düğümleri, komşularının yanına koyar.
// Böylece harita her açılışta aynı kalır; yeni düğümler zihindeki haritayı bozmadan eklenir.
// Saf fonksiyon; birim testleri yerlesim.test.ts'de.

export type Konumlu = { id: string; x: number | null; y: number | null };
export type Nokta = { x: number; y: number };

/** Kimlikten 0–2π arası sabit bir açı: aynı düğüm hep aynı yöne yerleşir */
export function sabitAci(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) / 4294967296) * Math.PI * 2;
}

/**
 * Kayıtlı konumu olanları olduğu gibi bırakır; olmayanları kayıtlı komşularının ortasına
 * (kimliğe göre sabit bir yöne biraz kaydırarak) yerleştirir. Hiç kayıtlı komşusu olmayanlar
 * haritanın sağına bir ızgara olarak dizilir.
 * Hiçbir düğümün kayıtlı konumu yoksa null döner: o zaman yerleşim baştan hesaplanmalıdır.
 */
export function eksikKonumlariYerlestir(
	dugumler: Konumlu[],
	baglar: { kaynakId: string; hedefId: string }[],
	{ yaricap = 90, aralik = 130 } = {}
): { konumlar: Map<string, Nokta>; yeniler: string[] } | null {
	const konumlar = new Map<string, Nokta>();
	for (const d of dugumler) {
		if (d.x !== null && d.y !== null) konumlar.set(d.id, { x: d.x, y: d.y });
	}
	if (konumlar.size === 0) return null;

	const komsular = new Map<string, string[]>(dugumler.map((d) => [d.id, []]));
	for (const b of baglar) {
		komsular.get(b.kaynakId)?.push(b.hedefId);
		komsular.get(b.hedefId)?.push(b.kaynakId);
	}

	const yeniler: string[] = [];
	let bekleyen = dugumler.filter((d) => !konumlar.has(d.id)).map((d) => d.id);
	// Zincir hâlinde eklenen yeni düğümler de birbirinin yanına yerleşsin diye tekrar tekrar geç
	let ilerledi = true;
	while (bekleyen.length && ilerledi) {
		ilerledi = false;
		const kalan: string[] = [];
		for (const id of bekleyen) {
			const yerlesik = (komsular.get(id) ?? []).filter((k) => konumlar.has(k));
			if (!yerlesik.length) {
				kalan.push(id);
				continue;
			}
			const merkez = yerlesik.reduce(
				(t, k) => ({ x: t.x + konumlar.get(k)!.x, y: t.y + konumlar.get(k)!.y }),
				{ x: 0, y: 0 }
			);
			const aci = sabitAci(id);
			konumlar.set(id, {
				x: merkez.x / yerlesik.length + Math.cos(aci) * yaricap,
				y: merkez.y / yerlesik.length + Math.sin(aci) * yaricap
			});
			yeniler.push(id);
			ilerledi = true;
		}
		bekleyen = kalan;
	}

	if (bekleyen.length) {
		const xler = [...konumlar.values()].map((n) => n.x);
		const yler = [...konumlar.values()].map((n) => n.y);
		const solUst = { x: Math.max(...xler) + aralik * 1.5, y: Math.min(...yler) };
		const sutun = Math.max(1, Math.ceil(Math.sqrt(bekleyen.length)));
		bekleyen.forEach((id, i) => {
			konumlar.set(id, {
				x: solUst.x + (i % sutun) * aralik,
				y: solUst.y + Math.floor(i / sutun) * aralik
			});
			yeniler.push(id);
		});
	}
	return { konumlar, yeniler };
}
