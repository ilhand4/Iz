// MapLibre'yi yalnızca harita gereken sayfada, dinamik içe aktarmayla yükler.
// Worker dosyası Vite'ın ?url içe aktarmasıyla kendi kökenimizden sunulur: CSP'ye blob: gerekmez.
// Karolar OpenFreeMap'ten (OpenStreetMap verisi, anahtarsız); CSP connect-src'de izinli.

export const KARO_KOKENI = 'https://tiles.openfreemap.org';

let yukleniyor: Promise<typeof import('maplibre-gl')> | null = null;

export function maplibreYukle() {
	yukleniyor ??= (async () => {
		const [ml, worker] = await Promise.all([
			import('maplibre-gl'),
			import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
			import('maplibre-gl/dist/maplibre-gl.css')
		]);
		ml.setWorkerUrl(new URL(worker.default, location.href).href);
		return ml;
	})();
	return yukleniyor;
}

/** Sayfanın şu anki teması (çerez ya da sistem) */
export function koyuMu() {
	const tema = document.documentElement.dataset.theme;
	if (tema === 'koyu') return true;
	if (tema === 'acik') return false;
	return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function stilAdresi(koyu: boolean) {
	return `${KARO_KOKENI}/styles/${koyu ? 'dark' : 'positron'}`;
}

/** Tema değişince (menüden ya da sistemden) çağrılır; temizleme fonksiyonu döner */
export function temaDegisinceCagir(fn: (koyu: boolean) => void) {
	let son = koyuMu();
	const kontrol = () => {
		const simdi = koyuMu();
		if (simdi !== son) {
			son = simdi;
			fn(simdi);
		}
	};
	const gozlemci = new MutationObserver(kontrol);
	gozlemci.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme']
	});
	const sorgu = matchMedia('(prefers-color-scheme: dark)');
	sorgu.addEventListener('change', kontrol);
	return () => {
		gozlemci.disconnect();
		sorgu.removeEventListener('change', kontrol);
	};
}

/** Bir CSS değişkeninin gerçek rengini okur (MapLibre katmanları CSS değişkeni anlamaz) */
export function renkOku(kap: HTMLElement, degisken: string) {
	const olcer = document.createElement('span');
	olcer.style.color = `var(${degisken})`;
	olcer.hidden = true;
	kap.append(olcer);
	const renk = getComputedStyle(olcer).color;
	olcer.remove();
	return renk;
}
